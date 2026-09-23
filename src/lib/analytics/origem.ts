/* ============================================================================
   De onde a visita veio

   Quem chega de anúncio traz a campanha na URL (`utm_source`, `utm_medium`,
   `utm_campaign`) ou pelo menos o carimbo do clique (`gclid` do Google,
   `fbclid` da Meta). Na página seguinte isso já sumiu da barra de endereço, e
   o clique no WhatsApp, que é o que interessa, perde a origem.

   Então a origem é guardada no primeiro toque da sessão e acompanha o evento
   `whatsapp_click`. Três campos, todos rótulos de campanha escolhidos por
   quem montou o anúncio: nada da pessoa que clicou. Mesmo assim o valor passa
   por limpeza, porque URL é texto que qualquer um escreve.

   Fica no `sessionStorage`: some ao fechar a aba, não viaja em requisição e
   não sai daqui sem consentimento, porque quem envia é `medir`.
   ============================================================================ */

export type OrigemDaVisita = {
  fonte?: string;
  meio?: string;
  campanha?: string;
};

const CHAVE = "jb:origem";
const LIMITE = 60;

/**
 * Reduz um rótulo de campanha a letras minúsculas, dígitos e `- _ .`.
 * Acento sai, espaço vira hífen, o resto some. Vazio devolve `undefined`.
 */
export function limparRotulo(valor: string | null | undefined): string | undefined {
  if (!valor) return undefined;
  const limpo = valor
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, LIMITE);
  return limpo || undefined;
}

/**
 * Lê a origem de uma query string.
 *
 * UTM ganha sempre: é o que quem montou o anúncio escolheu escrever. Sem UTM,
 * o carimbo de clique ainda diz a plataforma: `gclid` (e os irmãos `gbraid` e
 * `wbraid`, do iPhone) é clique pago do Google; `fbclid` diz Meta, mas
 * aparece também em link comum compartilhado, então o meio fica em branco.
 * Nada disso na URL devolve `null`: visita direta não sobrescreve nada.
 */
export function origemDaUrl(busca: string): OrigemDaVisita | null {
  const parametros = new URLSearchParams(busca);

  const utm: OrigemDaVisita = {
    fonte: limparRotulo(parametros.get("utm_source")),
    meio: limparRotulo(parametros.get("utm_medium")),
    campanha: limparRotulo(parametros.get("utm_campaign")),
  };
  if (utm.fonte || utm.meio || utm.campanha) return semVazios(utm);

  if (["gclid", "gbraid", "wbraid"].some((chave) => parametros.has(chave))) {
    return { fonte: "google", meio: "cpc" };
  }
  if (parametros.has("fbclid")) return { fonte: "meta" };

  return null;
}

/**
 * Parâmetros de URL que podem acompanhar o `page_location` do PageView.
 *
 * O GA4 atribui a sessão lendo a campanha do `page_location`: sem as UTMs e o
 * `gclid`, toda visita paga aparece como "direta" e a conta do Google Ads não
 * casa com a do Analytics. A URL inteira, porém, é texto que qualquer um
 * escreve — um `?email=` ou `?telefone=` de um link malfeito iria junto. Por
 * isso a lista é de permissão: só estas chaves passam, e cada valor é limpo.
 *
 * O click-id do Google é opaco e volta para quem o emitiu; os rótulos de UTM
 * passam pela mesma limpeza da origem guardada. `fbclid` fica fora: o GA4 não
 * o usa, e a Meta lê o próprio carimbo sem depender deste campo.
 */
const CAMPANHA_NA_URL = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const CLIQUE_DO_GOOGLE = ["gclid", "gbraid", "wbraid"] as const;
const CLIQUE_VALIDO = /^[A-Za-z0-9_-]{1,256}$/;

export function parametrosDeCampanha(busca: string): URLSearchParams {
  const entrada = new URLSearchParams(busca);
  const saida = new URLSearchParams();

  for (const chave of CAMPANHA_NA_URL) {
    const valor = limparRotulo(entrada.get(chave));
    if (valor) saida.set(chave, valor);
  }
  for (const chave of CLIQUE_DO_GOOGLE) {
    const valor = entrada.get(chave)?.trim();
    if (valor && CLIQUE_VALIDO.test(valor)) saida.set(chave, valor);
  }

  return saida;
}

/**
 * O `page_location` do PageView: origem + caminho, sem parâmetro arbitrário.
 *
 * A campanha só entra na primeira visualização medida da página — é ela que
 * abre a sessão no GA4. Vem da URL quando a pessoa aceitou a medição ainda na
 * página do anúncio; se aceitou depois de navegar, a URL já não tem nada, e os
 * rótulos guardados em `registrarOrigem` reconstroem a fonte, o meio e a
 * campanha (nunca o click-id, que não é guardado).
 */
export function localizacaoParaMedicao(
  origemDoSite: string,
  caminho: string,
  busca: string,
  guardada: OrigemDaVisita | null,
  incluirCampanha: boolean,
): string {
  const base = `${origemDoSite}${caminho || "/"}`;
  if (!incluirCampanha) return base;

  let parametros = parametrosDeCampanha(busca);
  /* `toString()` e não `.size`: Safari 16 ainda circula e não tem `.size`. */
  if (parametros.toString() === "" && guardada) {
    parametros = parametrosDeCampanha(
      new URLSearchParams(
        Object.entries({
          utm_source: guardada.fonte,
          utm_medium: guardada.meio,
          utm_campaign: guardada.campanha,
        }).filter((par): par is [string, string] => Boolean(par[1])),
      ).toString(),
    );
  }

  const consulta = parametros.toString();
  return consulta ? `${base}?${consulta}` : base;
}

function semVazios(origem: OrigemDaVisita): OrigemDaVisita {
  return Object.fromEntries(
    Object.entries(origem).filter(([, valor]) => valor !== undefined),
  ) as OrigemDaVisita;
}

/**
 * Guarda a origem desta visita, se a URL trouxer uma.
 *
 * Primeiro toque: a origem gravada não é trocada durante a sessão. Quem veio
 * do anúncio e depois clicou num link interno com outra UTM continua contado
 * para o anúncio que trouxe.
 */
export function registrarOrigem(): void {
  try {
    if (window.sessionStorage.getItem(CHAVE)) return;
    const origem = origemDaUrl(window.location.search);
    if (origem) window.sessionStorage.setItem(CHAVE, JSON.stringify(origem));
  } catch {
    /* Armazenamento bloqueado: a visita segue sem origem, e só isso. */
  }
}

/** A origem guardada, já limpa de novo na leitura. Nada guardado devolve `{}`. */
export function origemDaVisita(): OrigemDaVisita {
  try {
    const bruto = JSON.parse(window.sessionStorage.getItem(CHAVE) ?? "null") as unknown;
    if (!bruto || typeof bruto !== "object") return {};
    const registro = bruto as Record<string, unknown>;
    const texto = (valor: unknown) => (typeof valor === "string" ? limparRotulo(valor) : undefined);
    return semVazios({
      fonte: texto(registro.fonte),
      meio: texto(registro.meio),
      campanha: texto(registro.campanha),
    });
  } catch {
    return {};
  }
}
