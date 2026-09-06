/* ============================================================================
   Taxonomia de eventos da JB

   Um campo `codigo_analytics` no painel não é instrumentação. Ele existia,
   validado como identificador do GA4, e nenhuma linha do site o lia — a JB
   podia preencher e continuar sem medir nada.

   Este módulo é o contrato: quais eventos existem, o que cada um carrega e o
   que nenhum deles pode carregar. Ele é puro — sem rede, sem navegador — para
   que a regra de privacidade seja testável sem subir nada.

   Três decisões que valem para o arquivo inteiro:

   1. **Nome fixo, semântica fixa.** Uma reorganização visual do SOS não pode
      mudar o significado de `assistance_step_3`. Os identificadores lógicos
      das etapas de assistência estão presos ao domínio, não à ordem da tela.

   2. **Resultado só depois do fato.** `purchase` não sai do clique em
      "confirmar" nem da volta da página de pagamento — sai da confirmação do
      servidor. Clique é intenção; evento de negócio é fato.

   3. **Payload mínimo, e a lista é de permissão.** Nada de nome, e-mail,
      telefone, CPF, CNPJ, serial, endereço, relato livre, token ou URL
      assinada. `limparPayload` derruba o que não estiver explicitamente
      liberado — uma lista de proibição envelheceria a cada campo novo.
   ============================================================================ */

/** Versão da taxonomia. Sobe quando o significado de um evento muda. */
export const VERSAO_TAXONOMIA = 1;

export const EVENTOS = [
  // navegação e catálogo
  "home_view",
  "catalog_view",
  "search",
  "product_view",
  "quote_click",

  // compra
  "add_to_cart",
  "checkout_start",
  "purchase",

  // assistência
  "assistance_start",
  "assistance_step_1",
  "assistance_step_2",
  "assistance_step_3",
  "assistance_step_4",
  "assistance_step_5",
  "assistance_media_added",
  "assistance_submit",

  // contato direto
  "whatsapp_click",
  "phone_click",

  // preventiva
  "downtime_calculated",
  "maintenance_plan_view",
  "maintenance_lead",

  // plataforma
  "clinic_signup",
  "equipment_registered",

  // orçamento e pós-venda
  "quote_opened",
  "quote_approved",
  "quote_rejected",
  "document_downloaded",
  "maintenance_scheduled",
  "review_requested",
] as const;

export type NomeDeEvento = (typeof EVENTOS)[number];

/**
 * Onde o evento nasce.
 *
 * A distinção não é decorativa: `servidor` é o único lado que pode afirmar um
 * fato de negócio. Um `purchase` de origem `cliente` seria a volta do
 * navegador da tela de pagamento, que não prova pagamento nenhum.
 */
export type OrigemDeEvento = "cliente" | "servidor";

/**
 * Campos que um evento pode carregar. Lista de PERMISSÃO.
 *
 * Cada um foi escolhido por caber numa métrica agregada sem identificar
 * ninguém. `valor_centavos` entra porque receita agregada é o ponto de um
 * funil de compra; `termo` entra normalizado e cortado, porque busca é a
 * métrica mais útil do catálogo — e a mais fácil de virar vazamento, já que
 * gente digita telefone e CPF em campo de busca.
 */
export const CAMPOS_PERMITIDOS = [
  "id_ocorrencia",
  "versao",
  "origem",
  "rota",
  "categoria",
  "condicao",
  "sku",
  "marca",
  "metodo",
  "quantidade",
  "valor_centavos",
  "moeda",
  "etapa",
  "plano",
  "resultado",
  "termo",
  "resultados",
  "dispositivo",
  "release",
] as const;

export type CampoPermitido = (typeof CAMPOS_PERMITIDOS)[number];

export type ValorDePayload = string | number | boolean;
export type Payload = Partial<Record<CampoPermitido, ValorDePayload>>;

/**
 * Padrões que denunciam dado pessoal, aplicados a qualquer texto que reste.
 *
 * Não substituem a lista de permissão — são a segunda camada, para o caso de
 * um campo permitido receber conteúdo que não devia. `termo` é o alvo óbvio:
 * ninguém "envia" um CPF de propósito, mas gente digita CPF na busca.
 */
const PARECE_PESSOAL: { nome: string; teste: RegExp }[] = [
  { nome: "e-mail", teste: /[^\s@]+@[^\s@]+\.[^\s@]{2,}/ },
  { nome: "documento", teste: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/ },
  { nome: "cnpj", teste: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/ },
  { nome: "telefone", teste: /\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/ },
  { nome: "sequência longa de dígitos", teste: /\b\d{11,}\b/ },
];

/** Um texto que chegou ao payload parece dado pessoal? */
export function pareceDadoPessoal(valor: string): string | null {
  for (const padrao of PARECE_PESSOAL) {
    if (padrao.teste.test(valor)) return padrao.nome;
  }
  return null;
}

export const LIMITE_DE_TEXTO = 80;

/**
 * Deixa passar só o que pode ser medido.
 *
 * Campo fora da lista some. Texto que parece dado pessoal some — inteiro, e
 * não mascarado: um CPF com os últimos dígitos trocados por asterisco continua
 * sendo um CPF quase inteiro dentro de um provedor de analytics.
 *
 * Devolve o payload limpo e o que foi descartado, para que o modo de
 * desenvolvimento consiga mostrar em voz alta o que teria vazado.
 */
export function limparPayload(bruto: Record<string, unknown>): {
  payload: Payload;
  descartados: { campo: string; motivo: string }[];
} {
  const permitidos = new Set<string>(CAMPOS_PERMITIDOS);
  const payload: Payload = {};
  const descartados: { campo: string; motivo: string }[] = [];

  for (const [campo, valor] of Object.entries(bruto)) {
    if (valor === undefined || valor === null || valor === "") continue;

    if (!permitidos.has(campo)) {
      descartados.push({ campo, motivo: "não está na lista de campos permitidos" });
      continue;
    }

    if (typeof valor === "number") {
      if (!Number.isFinite(valor)) {
        descartados.push({ campo, motivo: "número não finito" });
        continue;
      }
      payload[campo as CampoPermitido] = valor;
      continue;
    }

    if (typeof valor === "boolean") {
      payload[campo as CampoPermitido] = valor;
      continue;
    }

    if (typeof valor !== "string") {
      descartados.push({ campo, motivo: "tipo não suportado" });
      continue;
    }

    const texto = valor.trim();
    const suspeita = pareceDadoPessoal(texto);
    if (suspeita) {
      descartados.push({ campo, motivo: `parece ${suspeita}` });
      continue;
    }

    payload[campo as CampoPermitido] = texto.slice(0, LIMITE_DE_TEXTO);
  }

  return { payload, descartados };
}

/**
 * Rota sem identificador dentro.
 *
 * `/pedido/JB-2026-0042` vira `/pedido/[numero]`. Sem isso, o número do pedido
 * de cada cliente entraria no relatório de páginas mais vistas — e um número
 * de pedido abre a página dele em quem tiver o cookie certo.
 */
export function normalizarRota(caminho: string): string {
  const limpo = (caminho || "/").split("?")[0].split("#")[0];

  const segmentos = limpo.split("/").map((segmento) => {
    if (!segmento) return segmento;

    // número de documento: JB-…, AT-…, OS-…, ORC-…, CT-…, SUP-…
    if (/^(JB|AT|OS|ORC|CT|SUP)-[A-Z0-9-]+$/i.test(segmento)) return "[numero]";

    // só dígitos
    if (/^\d+$/.test(segmento)) return "[n]";

    // uuid com hífen
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segmento)
    ) {
      return "[id]";
    }

    /* Identificador opaco (cuid, hash): longo, sem hífen e misturando letra e
       dígito. O hífen é o que separa isto de um slug — "autoclave-21-litros"
       também é longo e também mistura, mas é conteúdo público e precisa
       continuar legível no relatório de páginas. */
    if (
      segmento.length >= 12 &&
      !segmento.includes("-") &&
      /\d/.test(segmento) &&
      /[a-z]/i.test(segmento)
    ) {
      return "[id]";
    }

    return segmento;
  });

  return segmentos.join("/").replace(/\/+$/, "") || "/";
}

/**
 * Identificação de uma ocorrência, para deduplicar.
 *
 * O mesmo pedido confirmado pelo webhook e pela reconsulta manual precisa
 * produzir UM `purchase`. A chave é o evento mais a referência do negócio —
 * nunca um contador de sessão, que mudaria a cada aba aberta.
 */
export function idDaOcorrencia(evento: NomeDeEvento, referencia: string): string {
  return `${evento}:${referencia}`;
}
