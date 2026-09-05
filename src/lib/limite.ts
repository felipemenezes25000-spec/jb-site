/**
 * Limite de taxa por chave, com janela deslizante.
 *
 * A janela é deslizante de verdade (guarda os instantes das últimas tentativas
 * aceitas), não um balde por minuto cheio: com balde fixo, quem dispara 20
 * pedidos às 10h00m59s e mais 20 às 10h01m00s passa por dois limites diferentes
 * e manda 40 em dois segundos. Aqui não passa.
 *
 * ONDE ISTO VALE E ONDE NÃO VALE
 * ------------------------------
 * O armazenamento padrão é um `Map` na memória do processo. Em servidor único
 * (`next start`, VPS, contêiner) isso é um limite real. Em serverless — que é o
 * caso da Vercel — cada instância conta a sua própria fatia: com 4 instâncias
 * quentes, um limite de 5 vira, na prática, até 20. Serve para segurar abuso
 * comum de formulário e robô preguiçoso; NÃO segura ataque distribuído.
 *
 * Por isso a regra do projeto: **onde já existe registro em banco, o banco
 * ganha**. Login de cliente e de equipe contam tentativas na tabela
 * `LoginAttempt` (ver `bloqueadoPorTentativas` em `@/lib/auth-cliente` e o freio
 * de `@/app/acoes/staff`), e é assim que deve continuar — aquilo é
 * compartilhado entre instâncias e sobrevive a um redeploy.
 *
 * TROCAR POR ARMAZENAMENTO EXTERNO
 * --------------------------------
 * `checarLimite` é síncrono e sempre usa a memória, porque é o que a maioria
 * dos chamadores precisa e evita `await` em caminho quente. Quando entrar um
 * Redis, um Upstash ou uma tabela nova, basta implementar
 * `ArmazenamentoDeLimite` e usar `checarLimiteEm(armazenamento, ...)`, que é a
 * mesma decisão com contrato assíncrono. Nenhum chamador precisa mudar de forma:
 * os dois devolvem `ResultadoLimite`.
 */

export type OpcoesDeLimite = {
  /** Quantas passagens são aceitas dentro da janela. */
  limite: number;
  /** Tamanho da janela, em milissegundos. */
  janelaMs: number;
};

export type ResultadoLimite = {
  /** `true` quando a tentativa foi aceita e já ficou registrada. */
  ok: boolean;
  /** Quantas passagens ainda cabem nesta janela. Nunca negativo. */
  restante: number;
  /** Quanto falta, em ms, para a próxima passagem ser aceita. Zero quando `ok`. */
  esperaMs: number;
};

/* ------------------------------------------------------------- armazenamento */

/**
 * Contrato de armazenamento.
 *
 * `registrar` recebe a tentativa e decide: quando aceita, grava o instante e
 * devolve `ok: true`; quando recusa, NÃO grava nada. Recusa que grava faz o
 * bloqueio se auto-renovar — quem está martelando o formulário nunca sairia do
 * castigo, e `esperaMs` viraria mentira.
 */
export type ArmazenamentoDeLimite = {
  registrar(chave: string, opcoes: OpcoesDeLimite, agora: number): Promise<ResultadoLimite>;
  /** Zera a contagem de uma chave. Use depois de um acerto (login que deu certo). */
  esquecer(chave: string): Promise<void>;
};

/* -------------------------------------------------------------------- memória */

/** Intervalo da faxina que joga fora chaves que ninguém mais usa. */
const FAXINA_MS = 5 * 60 * 1000;

type Registro = { marcas: number[]; ultimoUso: number };

/**
 * O mapa vive em `globalThis` pelo mesmo motivo do cliente do Prisma: em
 * desenvolvimento o Next recarrega o módulo a cada alteração, e um `Map` novo a
 * cada recarga zeraria a contagem — o limite pareceria não funcionar.
 */
const globalParaLimite = globalThis as unknown as {
  jbLimite?: Map<string, Registro>;
  jbLimiteFaxina?: ReturnType<typeof setInterval>;
};

const mapa: Map<string, Registro> = globalParaLimite.jbLimite ?? new Map();
globalParaLimite.jbLimite = mapa;

/**
 * Faxina periódica.
 *
 * Sem ela, uma chave por IP faria o mapa crescer para sempre. `unref` garante
 * que este temporizador jamais segure o processo vivo — importante em script de
 * seed e em build, que precisam terminar sozinhos.
 */
if (!globalParaLimite.jbLimiteFaxina) {
  const relogio = setInterval(() => {
    const agora = Date.now();
    for (const [chave, registro] of mapa) {
      // 1h sem uso e sem marca válida: pode sair
      if (agora - registro.ultimoUso > 60 * 60 * 1000) mapa.delete(chave);
    }
  }, FAXINA_MS);

  if (typeof relogio === "object" && relogio !== null && "unref" in relogio) {
    (relogio as { unref: () => void }).unref();
  }

  globalParaLimite.jbLimiteFaxina = relogio;
}

function decidir(chave: string, opcoes: OpcoesDeLimite, agora: number): ResultadoLimite {
  const limite = Math.max(1, Math.floor(opcoes.limite));
  const janelaMs = Math.max(1, Math.floor(opcoes.janelaMs));
  const inicio = agora - janelaMs;

  const registro = mapa.get(chave);
  const marcas = (registro?.marcas ?? []).filter((instante) => instante > inicio);

  if (marcas.length >= limite) {
    // a marca mais antiga é a que vai sair da janela primeiro
    const maisAntiga = marcas[0] ?? agora;
    mapa.set(chave, { marcas, ultimoUso: agora });
    return {
      ok: false,
      restante: 0,
      esperaMs: Math.max(1, maisAntiga + janelaMs - agora),
    };
  }

  marcas.push(agora);
  mapa.set(chave, { marcas, ultimoUso: agora });

  return { ok: true, restante: limite - marcas.length, esperaMs: 0 };
}

/**
 * Limite de taxa em memória.
 *
 * Cada chamada aceita conta como uma passagem. Chame uma vez por tentativa,
 * antes de fazer o trabalho:
 *
 * ```ts
 * const { ok, esperaMs } = checarLimite(`contato:${ip}`, { limite: 5, janelaMs: 600_000 });
 * if (!ok) return { erro: `Muitas tentativas. Tente de novo em ${Math.ceil(esperaMs / 1000)}s.` };
 * ```
 */
export function checarLimite(chave: string, opcoes: OpcoesDeLimite): ResultadoLimite {
  return decidir(chave, opcoes, Date.now());
}

/** Zera a contagem da chave. Chame depois de um acerto, para não punir quem acertou. */
export function esquecerLimite(chave: string): void {
  mapa.delete(chave);
}

/** Só para teste e para o script de manutenção: apaga tudo. */
export function limparLimites(): void {
  mapa.clear();
}

/** A implementação de memória exposta pelo contrato assíncrono. */
export const armazenamentoEmMemoria: ArmazenamentoDeLimite = {
  async registrar(chave, opcoes, agora) {
    return decidir(chave, opcoes, agora);
  },
  async esquecer(chave) {
    mapa.delete(chave);
  },
};

/**
 * Mesma decisão, contrato assíncrono — é por aqui que entra um armazenamento
 * compartilhado no dia em que houver um.
 */
export async function checarLimiteEm(
  armazenamento: ArmazenamentoDeLimite,
  chave: string,
  opcoes: OpcoesDeLimite,
): Promise<ResultadoLimite> {
  return armazenamento.registrar(chave, opcoes, Date.now());
}

/* --------------------------------------------------------------------- chaves */

/**
 * Monta a chave a partir das partes, sempre no formato `rota:tipo:valor`.
 *
 * Padronizar importa: chave montada à mão em cada lugar acaba colidindo
 * (`ip` de um formulário zerando o limite de outro) ou vazando dado sensível
 * para dentro de um log.
 */
function montar(partes: Array<string | undefined>) {
  return partes
    .filter((parte): parte is string => Boolean(parte && parte.trim()))
    .map((parte) => parte.trim().toLowerCase())
    .join(":");
}

/** `chaveDeIp("203.0.113.7", "/contato")` → `"/contato:ip:203.0.113.7"`. */
export function chaveDeIp(ip: string, rota?: string) {
  // sem IP conhecido, todo mundo cairia na mesma chave e um visitante
  // derrubaria o formulário para os outros — melhor uma chave só de rota
  return montar([rota, "ip", ip || "desconhecido"]);
}

/** Chave por e-mail, para freio de login e de recuperação de senha. */
export function chaveDeEmail(email: string, rota?: string) {
  return montar([rota, "email", email]);
}

/** Chave por sessão (id de cliente ou de usuário da equipe). */
export function chaveDeSessao(id: string, rota?: string) {
  return montar([rota, "sessao", id]);
}

/** Segundos inteiros para arredondar `esperaMs` na mensagem ao usuário. */
export function segundosDeEspera(esperaMs: number) {
  return Math.max(1, Math.ceil(esperaMs / 1000));
}
