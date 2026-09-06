/* ============================================================================
   Busca por intenção — as regras

   "autoclave 21 litros" e "minha autoclave não aquece" são a mesma palavra e
   duas necessidades diferentes. Esta é a parte da busca que decide qual é
   qual — e ela é feita de regras, sinônimos e normalização, não de modelo de
   linguagem. O escopo diz isso com todas as letras: IA não é pré-requisito.

   A regra que governa o arquivo: **intenção ORDENA, não filtra.** Quem digita
   "compressor fazendo barulho" recebe o conteúdo técnico primeiro e os
   compressores logo abaixo — nunca só um dos dois. Interpretar toda busca como
   problema técnico bloquearia a busca objetiva de produto, que é o erro que o
   escopo nomeia.
   ============================================================================ */

export type Intencao = "produto" | "problema" | "servico" | "meu_equipamento";

export type GrupoDeResultado = "produtos" | "conteudo" | "servicos" | "meus_equipamentos";

/** Ordem dos grupos na tela, por intenção. Todos aparecem sempre. */
export const ORDEM_POR_INTENCAO: Record<Intencao, GrupoDeResultado[]> = {
  produto: ["produtos", "conteudo", "servicos", "meus_equipamentos"],
  problema: ["conteudo", "servicos", "meus_equipamentos", "produtos"],
  servico: ["servicos", "conteudo", "produtos", "meus_equipamentos"],
  meu_equipamento: ["meus_equipamentos", "servicos", "conteudo", "produtos"],
};

export const ROTULO_DO_GRUPO: Record<GrupoDeResultado, string> = {
  produtos: "No catálogo",
  conteudo: "Na Central Técnica",
  servicos: "Serviços e planos",
  meus_equipamentos: "Nos seus equipamentos",
};

/**
 * Por que este grupo é útil para esta busca.
 *
 * O escopo pede que o resultado explique a própria pertinência. A frase muda
 * com a intenção porque a razão muda: a Central Técnica é o primeiro lugar
 * para um sintoma e o terceiro para uma compra.
 */
export function porQueEsteGrupo(grupo: GrupoDeResultado, intencao: Intencao): string {
  if (grupo === "conteudo") {
    return intencao === "problema"
      ? "Textos que descrevem o que observar antes de chamar a assistência."
      : "Textos sobre estes equipamentos, escritos por quem os conserta.";
  }
  if (grupo === "servicos") {
    return intencao === "problema"
      ? "Se o sintoma continuar, é por aqui que a JB atende."
      : "Serviços e planos relacionados ao que você procurou.";
  }
  if (grupo === "meus_equipamentos") {
    return "Equipamentos do prontuário da sua clínica. Só você vê esta lista.";
  }
  return intencao === "problema"
    ? "Equipamentos relacionados, caso a decisão passe por substituir."
    : "Equipamentos do catálogo que combinam com a busca.";
}

/* --------------------------------------------------------- normalização */

/** Sem acento, sem caixa, sem espaço sobrando. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sinônimos que a clínica usa e o catálogo não.
 *
 * Lista curta e conferível de propósito. Sinônimo errado é pior que sinônimo
 * ausente: ele traz resultado que não tem nada a ver e faz a busca parecer
 * quebrada.
 */
const SINONIMOS: Record<string, string[]> = {
  autoclave: ["esterilizador", "esterilizadora"],
  compressor: ["compressor de ar", "motor de ar"],
  vacuo: ["succao", "sugador", "bomba de vacuo", "aspirador"],
  caneta: ["alta rotacao", "turbina", "peca de mao"],
  cadeira: ["equipo", "unidade odontologica", "consultorio"],
  fotopolimerizador: ["fotopolimerizadora", "luz de fotopolimerizacao"],
  raio: ["raio x", "rx", "radiografia"],
};

/** Expande a consulta com os sinônimos conhecidos. */
export function termosDaBusca(consulta: string): string[] {
  const base = normalizar(consulta);
  if (!base) return [];

  const termos = new Set<string>([base]);

  for (const [canonico, variantes] of Object.entries(SINONIMOS)) {
    if (base.includes(canonico)) {
      for (const variante of variantes) termos.add(base.replace(canonico, variante));
    }
    for (const variante of variantes) {
      if (base.includes(variante)) termos.add(base.replace(variante, canonico));
    }
  }

  return [...termos];
}

/* ------------------------------------------------------------- intenção */

const SINAIS_DE_PROBLEMA = [
  "nao aquece",
  "nao esquenta",
  "nao liga",
  "nao pressuriza",
  "nao funciona",
  "nao mantem",
  "nao sobe",
  "vazando",
  "vazamento",
  "barulho",
  "ruido",
  "estranho",
  "defeito",
  "problema",
  "quebrou",
  "parou",
  "erro",
  "travou",
  "fraco",
  "perdeu forca",
  "esquentando",
  "cheiro",
];

const SINAIS_DE_SERVICO = [
  "manutencao",
  "preventiva",
  "revisao",
  "plano",
  "contrato",
  "instalacao",
  "orcamento",
  "visita",
  "assistencia",
  "conserto",
  "reparo",
];

/** "minha", "meu", "da minha clínica" — a marca de posse. */
const SINAIS_DE_POSSE = ["minha ", "meu ", "minhas ", "meus ", "da clinica", "do consultorio"];

/**
 * Que tipo de necessidade esta consulta expressa.
 *
 * A ordem das verificações é a da especificidade: posse vence sintoma, que
 * vence serviço, que vence produto. "minha autoclave não aquece" é sobre o
 * aparelho da pessoa antes de ser sobre o sintoma — e é a partir do aparelho
 * dela que a JB responde melhor.
 *
 * `temSessao` importa: sem sessão, "minha autoclave" não pode virar intenção
 * de equipamento próprio, porque não há equipamento próprio a mostrar. A
 * consulta então é tratada como sintoma, que é o próximo palpite razoável.
 */
export function detectarIntencao(consulta: string, temSessao: boolean): Intencao {
  const texto = ` ${normalizar(consulta)} `;

  const temPosse = SINAIS_DE_POSSE.some((sinal) => texto.includes(` ${sinal.trim()} `) || texto.includes(sinal));
  const temProblema = SINAIS_DE_PROBLEMA.some((sinal) => texto.includes(sinal));
  const temServico = SINAIS_DE_SERVICO.some((sinal) => texto.includes(sinal));

  if (temPosse && temSessao) return "meu_equipamento";
  if (temProblema) return "problema";
  if (temServico) return "servico";
  return "produto";
}

/* --------------------------------------------------------------- limites */

/** Abaixo disto a busca não roda: uma letra traz o catálogo inteiro. */
export const MINIMO_DE_CARACTERES = 3;

/** Teto de caracteres aceito. Consulta maior que isto é digitação acidental. */
export const MAXIMO_DE_CARACTERES = 80;

export type ConsultaValidada =
  | { ok: true; consulta: string }
  | { ok: false; motivo: "curta" | "vazia" };

export function validarConsulta(bruta: string | null | undefined): ConsultaValidada {
  const consulta = (bruta ?? "").trim().slice(0, MAXIMO_DE_CARACTERES);

  if (consulta.length === 0) return { ok: false, motivo: "vazia" };
  if (normalizar(consulta).length < MINIMO_DE_CARACTERES) return { ok: false, motivo: "curta" };

  return { ok: true, consulta };
}

/* ------------------------------------------------------------ analytics */

/**
 * A consulta pode virar evento de analytics?
 *
 * Não quando parece conter dado pessoal. O escopo proíbe armazenar consulta
 * livre com dado pessoal — e busca é onde as pessoas colam telefone, e-mail e
 * às vezes o CPF, sem perceber que estão num campo de busca.
 *
 * Na dúvida, a consulta inteira é descartada. Mascarar deixaria o resto do
 * texto, e o resto costuma ser o que identifica.
 */
export function consultaPodeSerMedida(consulta: string): boolean {
  const texto = consulta.trim();

  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(texto)) return false;
  if (/\d{3}\D?\d{3}\D?\d{3}\D?\d{2}/.test(texto)) return false; // CPF
  if (/\d{2}\D?\d{3}\D?\d{3}\D?\d{4}/.test(texto)) return false; // CNPJ
  if (/\(?\d{2}\)?\s?9?\d{4}\D?\d{4}/.test(texto)) return false; // telefone
  if (/\d{6,}/.test(texto)) return false;

  return true;
}
