/* ============================================================================
   Feed de produtos para o Merchant Center

   Um feed é uma afirmação pública sobre preço, disponibilidade e identidade de
   cada produto — feita a um sistema que não pergunta duas vezes. Se o preço
   diverge da página, o anúncio é suspenso; se o identificador está errado, o
   produto aparece casado com o de outra empresa.

   Por isso este módulo é puro e testado, e a parte difícil dele não é montar
   XML: é a regra de quem NÃO entra. Rascunho, arquivado, sem preço, sem foto e
   só-sob-orçamento ficam de fora — e cada exclusão tem motivo nomeado, para o
   painel poder explicar por que aquele produto não está sendo anunciado.

   Formato conferido em support.google.com/merchants/answer/7052112 (RSS 2.0
   com o namespace http://base.google.com/ns/1.0).
   ============================================================================ */

export const NAMESPACE_GOOGLE = "http://base.google.com/ns/1.0";

/* --------------------------------------------------------- elegibilidade */

export type MotivoDeExclusao =
  | "nao_publicado"
  | "demonstracao"
  | "sem_preco"
  | "sem_compra_direta"
  | "sem_imagem";

export const EXPLICACAO_DA_EXCLUSAO: Record<MotivoDeExclusao, string> = {
  nao_publicado: "Só produto publicado vai para o feed. Rascunho e arquivado ficam de fora.",
  demonstracao:
    "Produto de demonstração. Ele existe para a JB conferir telas com catálogo cheio, " +
    "não para ser anunciado — anúncio de produto que a loja não vende é anúncio falso.",
  sem_preco: "Sem preço não há oferta, e oferta sem preço é rejeitada na origem.",
  sem_compra_direta:
    "O produto é só sob orçamento. Anunciá-lo com preço prometeria uma compra que a " +
    "loja não permite fechar.",
  sem_imagem: "A imagem principal é obrigatória no destino.",
};

/** O que a regra de elegibilidade precisa saber. Nada além disso. */
export type CandidatoAoFeed = {
  publicado: boolean;
  /** O endereço do produto. É por ele que a demonstração é reconhecida. */
  slug: string;
  precoCents: number;
  compraDireta: boolean;
  temImagem: boolean;
};

/**
 * Prefixo dos dados de demonstração.
 *
 * A convenção é do próprio projeto: `prisma/seed-demo.ts` cria produto e marca
 * com slug `demo-`, e `seed-demo-limpar.ts` apaga por esse mesmo prefixo. O
 * feed usa o mesmo critério porque um item de demonstração anunciado é uma
 * oferta que a loja não consegue honrar.
 */
export const PREFIXO_DEMO = "demo-";

/**
 * Por que este produto não entra no feed — ou `null` quando entra.
 *
 * A ordem dos testes é a ordem em que a JB resolveria os problemas: publicar
 * vem antes de precificar, que vem antes de fotografar.
 */
export function motivoDeExclusao(produto: CandidatoAoFeed): MotivoDeExclusao | null {
  if (!produto.publicado) return "nao_publicado";
  if (produto.slug.startsWith(PREFIXO_DEMO)) return "demonstracao";
  if (!Number.isFinite(produto.precoCents) || produto.precoCents <= 0) return "sem_preco";
  if (!produto.compraDireta) return "sem_compra_direta";
  if (!produto.temImagem) return "sem_imagem";
  return null;
}

/* ------------------------------------------------------------- condição */

export type CondicaoDoCatalogo = "novo" | "seminovo" | "usado" | "recondicionado";

/**
 * A condição da JB traduzida para os três valores que o destino admite.
 *
 * "Seminovo JB Certificado" NÃO cabe aqui: é nome de um programa da JB, e o
 * atributo só aceita `new`, `refurbished` e `used`. Inventar um quarto valor
 * derruba o item inteiro na validação — e, pior, se passasse, estaria
 * afirmando ao mercado uma categoria que não existe. O programa viaja em
 * `custom_label_0`, que é campo livre e serve exatamente para isto.
 */
export const CONDICAO_GOOGLE: Record<CondicaoDoCatalogo, "new" | "refurbished" | "used"> = {
  novo: "new",
  seminovo: "used",
  usado: "used",
  recondicionado: "refurbished",
};

/* ---------------------------------------------------------------- item */

export type ItemDoFeed = {
  /** Estável ao longo do tempo: o SKU, não o id do banco. */
  id: string;
  titulo: string;
  descricao: string;
  link: string;
  imagem: string;
  imagensExtras?: readonly string[];
  precoCents: number;
  disponivel: boolean;
  condicao: CondicaoDoCatalogo;
  marca?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  categoria?: string | null;
  /** Marca o item como do programa Seminovo JB Certificado. */
  selo?: boolean;
};

/** Escapa o que vai virar texto de nó XML. */
function escapar(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Tira o que não pode viajar num XML.
 *
 * Caractere de controle não é raro em descrição colada de PDF de fabricante, e
 * um único deles torna o arquivo inteiro ilegível — o feed não é rejeitado
 * item a item, é rejeitado de uma vez.
 */
function limparTexto(valor: string, limite: number) {
  // eslint-disable-next-line no-control-regex
  const semControle = valor.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ");
  const compacto = semControle.replace(/\s+/g, " ").trim();
  return compacto.length > limite ? `${compacto.slice(0, limite - 1).trimEnd()}…` : compacto;
}

function no(nome: string, valor: string | number | undefined | null) {
  if (valor === undefined || valor === null || valor === "") return "";
  return `    <${nome}>${escapar(String(valor))}</${nome}>\n`;
}

/**
 * Um item do feed.
 *
 * `identifier_exists` sai como `no` só quando a JB não tem identificador
 * nenhum cadastrado — nem GTIN, nem marca com MPN. É uma declaração sobre o
 * cadastro da JB, não sobre o produto existir no mundo: preencher o GTIN no
 * painel remove o atributo.
 */
export function itemXml(item: ItemDoFeed): string {
  const gtin = (item.gtin ?? "").trim();
  const mpn = (item.mpn ?? "").trim();
  const marca = (item.marca ?? "").trim();
  const temIdentificador = Boolean(gtin) || Boolean(mpn && marca);

  const partes = [
    no("g:id", item.id),
    no("g:title", limparTexto(item.titulo, 150)),
    no("g:description", limparTexto(item.descricao, 5000)),
    no("g:link", item.link),
    no("g:image_link", item.imagem),
    ...(item.imagensExtras ?? []).slice(0, 10).map((url) => no("g:additional_image_link", url)),
    no("g:availability", item.disponivel ? "in_stock" : "out_of_stock"),
    no("g:price", `${(item.precoCents / 100).toFixed(2)} BRL`),
    no("g:condition", CONDICAO_GOOGLE[item.condicao]),
    no("g:brand", marca ? limparTexto(marca, 70) : null),
    no("g:gtin", gtin || null),
    no("g:mpn", mpn ? limparTexto(mpn, 70) : null),
    temIdentificador ? "" : no("g:identifier_exists", "no"),
    no("g:product_type", item.categoria ? limparTexto(item.categoria, 750) : null),
    item.selo ? no("g:custom_label_0", "seminovo_jb_certificado") : "",
  ];

  return `  <item>\n${partes.join("")}  </item>\n`;
}

export type Loja = {
  nome: string;
  link: string;
  descricao: string;
};

/** O arquivo inteiro. */
export function feedXml(loja: Loja, itens: readonly ItemDoFeed[]): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<rss version="2.0" xmlns:g="${NAMESPACE_GOOGLE}">\n` +
    "  <channel>\n" +
    `    <title>${escapar(loja.nome)}</title>\n` +
    `    <link>${escapar(loja.link)}</link>\n` +
    `    <description>${escapar(limparTexto(loja.descricao, 500))}</description>\n` +
    itens.map(itemXml).join("") +
    "  </channel>\n" +
    "</rss>\n"
  );
}
