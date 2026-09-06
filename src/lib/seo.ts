import { createElement } from "react";
import type { Metadata } from "next";

import type { SettingsMap } from "@/lib/settings";
import { resolverOrigem } from "@/lib/site-url";

/**
 * SEO: metadados de página e dados estruturados.
 *
 * Tudo aqui é função pura — nada de banco, nada de `server-only`. Os
 * construtores de JSON-LD recebem dados já carregados e devolvem objetos
 * tipados; quem renderiza usa o componente `JsonLd`.
 *
 * Regra que vale para todos eles: campo sem dado real fica de fora. Um
 * `aggregateRating` inventado é motivo de penalização no Google e mentira com
 * o cliente — nenhum construtor daqui produz nota, avaliação ou prazo que a JB
 * não tenha informado.
 */

/**
 * A origem pública do site.
 *
 * Resolvida em `@/lib/site-url`, que é o único lugar que lê a variável de
 * ambiente. Em produção mal configurada isto lança durante o build, em vez de
 * publicar um site cujos canônicos apontam para `localhost:3000`.
 */
export const SITE_URL = resolverOrigem();

/** Caminho interno vira URL completa; URL que já é absoluta passa direto. */
export function urlAbsoluta(caminho = "/") {
  const valor = (caminho ?? "").trim();
  if (!valor) return SITE_URL;
  if (/^https?:\/\//i.test(valor)) return valor;
  return `${SITE_URL}${valor.startsWith("/") ? "" : "/"}${valor}`;
}

/** Tira marcação e espaço sobrando, e corta no limite dos buscadores. */
export function textoLimpo(entrada: string | null | undefined, limite = 160) {
  const texto = (entrada ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (texto.length <= limite) return texto;
  const cortado = texto.slice(0, limite);
  const espaco = cortado.lastIndexOf(" ");
  return `${(espaco > limite * 0.6 ? cortado.slice(0, espaco) : cortado).trimEnd()}…`;
}

/* --------------------------------------------------------------- metadados */

export type EntradaMetadata = {
  titulo: string;
  descricao?: string | null;
  /** Caminho interno da página, para o canônico. Ex.: "/loja/cadeira-x". */
  caminho?: string;
  imagem?: string | null;
  noIndex?: boolean;
  tipo?: "website" | "article";
};

/**
 * Metadados de uma página. O `metadataBase`, o título padrão e o template
 * ficam no layout raiz — aqui entra só o que é da página.
 */
export function metadataDePagina(entrada: EntradaMetadata): Metadata {
  const titulo = entrada.titulo.trim();
  const descricao = entrada.descricao ? textoLimpo(entrada.descricao) : undefined;
  const imagem = entrada.imagem ? urlAbsoluta(entrada.imagem) : undefined;

  return {
    title: titulo,
    description: descricao,
    alternates: entrada.caminho ? { canonical: entrada.caminho } : undefined,
    openGraph: {
      type: entrada.tipo ?? "website",
      locale: "pt_BR",
      url: entrada.caminho ? urlAbsoluta(entrada.caminho) : undefined,
      title: titulo,
      description: descricao,
      images: imagem ? [{ url: imagem, alt: titulo }] : undefined,
    },
    twitter: {
      card: imagem ? "summary_large_image" : "summary",
      title: titulo,
      description: descricao,
      images: imagem ? [imagem] : undefined,
    },
    robots: entrada.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : undefined,
  };
}

/* ----------------------------------------------------------------- JSON-LD */

export type ValorJsonLd =
  | string
  | number
  | boolean
  | null
  | ValorJsonLd[]
  | { [chave: string]: ValorJsonLd | undefined };

export type DadosJsonLd = {
  "@context"?: string;
  "@type": string | string[];
  [chave: string]: ValorJsonLd | undefined;
};

const CONTEXTO = "https://schema.org";

function limpo(valor: string | null | undefined) {
  const texto = (valor ?? "").trim();
  return texto || undefined;
}

/** "(11) 3715-6362" → "+551137156362". Vazio quando não há telefone. */
export function telefoneInternacional(valor: string | null | undefined) {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return undefined;
  return `+${digitos.startsWith("55") ? digitos : `55${digitos}`}`;
}

function redes(s: SettingsMap) {
  const lista = [s.facebook, s.instagram, s.linkedin, s.youtube]
    .map((url) => (url ?? "").trim())
    .filter((url) => /^https?:\/\//i.test(url));
  return lista.length ? lista : undefined;
}

function enderecoPostal(s: SettingsMap): DadosJsonLd | undefined {
  const rua = limpo(s.endereco_logradouro);
  const bairro = limpo(s.endereco_bairro);
  const cidade = limpo(s.endereco_cidade);
  if (!rua && !cidade) return undefined;

  return {
    "@type": "PostalAddress",
    // PostalAddress não tem campo de bairro; ele entra no logradouro
    streetAddress: [rua, bairro].filter(Boolean).join(" — ") || undefined,
    addressLocality: cidade,
    addressRegion: limpo(s.endereco_uf),
    postalCode: limpo(s.endereco_cep),
    addressCountry: "BR",
  };
}

/**
 * "Segunda a sexta, das 8h às 18h30" → "Mo-Fr 08:00-18:30".
 * O campo é texto livre no painel: quando não dá para ler com segurança, sai
 * do JSON-LD em vez de virar um horário inventado.
 */
export function horarioSchema(texto: string | null | undefined) {
  const valor = (texto ?? "").toLowerCase();
  const dias = /segunda\s*(?:a|à|-)\s*sexta/.test(valor)
    ? "Mo-Fr"
    : /segunda\s*(?:a|à|-)\s*s[áa]bado/.test(valor)
      ? "Mo-Sa"
      : undefined;
  if (!dias) return undefined;

  const faixa = valor.match(/(\d{1,2})\s*h\s*(\d{2})?\s*(?:às|as|a|-)\s*(\d{1,2})\s*h\s*(\d{2})?/);
  if (!faixa) return undefined;

  const pad = (h: string, m?: string) => `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
  return `${dias} ${pad(faixa[1], faixa[2])}-${pad(faixa[3], faixa[4])}`;
}

export function organizacaoJsonLd(s: SettingsMap): DadosJsonLd {
  return {
    "@context": CONTEXTO,
    "@type": "Organization",
    "@id": `${SITE_URL}/#organizacao`,
    name: s.empresa_nome,
    url: SITE_URL,
    logo: urlAbsoluta("/icon.png"),
    description: limpo(s.empresa_resumo),
    email: limpo(s.email),
    telephone: telefoneInternacional(s.telefone),
    foundingDate: /^\d{4}$/.test(s.empresa_desde.trim()) ? s.empresa_desde.trim() : undefined,
    address: enderecoPostal(s),
    sameAs: redes(s),
  };
}

export function localNegocioJsonLd(s: SettingsMap): DadosJsonLd {
  return {
    "@context": CONTEXTO,
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#local`,
    name: s.empresa_nome,
    url: SITE_URL,
    image: urlAbsoluta("/icon.png"),
    description: limpo(s.empresa_resumo),
    email: limpo(s.email),
    telephone: telefoneInternacional(s.telefone),
    address: enderecoPostal(s),
    openingHours: horarioSchema(s.horario),
    areaServed: limpo(s.endereco_cidade)
      ? { "@type": "City", name: s.endereco_cidade }
      : undefined,
    sameAs: redes(s),
  };
}

export type CondicaoSeo = "novo" | "seminovo" | "usado" | "recondicionado";

const CONDICAO_SCHEMA: Record<CondicaoSeo, string> = {
  novo: "https://schema.org/NewCondition",
  seminovo: "https://schema.org/UsedCondition",
  usado: "https://schema.org/UsedCondition",
  recondicionado: "https://schema.org/RefurbishedCondition",
};

export type ProdutoSeo = {
  nome: string;
  /** Caminho da página do produto. Ex.: "/loja/cadeira-x". */
  caminho: string;
  sku?: string | null;
  modelo?: string | null;
  descricao?: string | null;
  imagens?: readonly string[];
  marca?: string | null;
  fabricante?: string | null;
  condicao?: CondicaoSeo;
  precoCents?: number | null;
  /** `false` quando o produto é só sob orçamento — então não sai oferta. */
  aVenda?: boolean;
  disponivel?: boolean;
  garantiaMeses?: number | null;
  vendedor?: string | null;
};

export function produtoJsonLd(produto: ProdutoSeo): DadosJsonLd {
  const url = urlAbsoluta(produto.caminho);
  const imagens = (produto.imagens ?? [])
    .filter((src) => Boolean(src?.trim()))
    .map((src) => urlAbsoluta(src));

  const preco = produto.precoCents ?? 0;
  const temOferta = produto.aVenda !== false && preco > 0;
  const marca = limpo(produto.marca);
  const fabricante = limpo(produto.fabricante);
  const vendedor = limpo(produto.vendedor);
  const condicao = produto.condicao ? CONDICAO_SCHEMA[produto.condicao] : undefined;

  return {
    "@context": CONTEXTO,
    "@type": "Product",
    name: produto.nome,
    url,
    sku: limpo(produto.sku),
    model: limpo(produto.modelo),
    description: produto.descricao ? textoLimpo(produto.descricao, 300) : undefined,
    image: imagens.length ? imagens : undefined,
    brand: marca ? { "@type": "Brand", name: marca } : undefined,
    manufacturer: fabricante ? { "@type": "Organization", name: fabricante } : undefined,
    itemCondition: condicao,
    offers: temOferta
      ? {
          "@type": "Offer",
          url,
          priceCurrency: "BRL",
          price: (preco / 100).toFixed(2),
          availability:
            produto.disponivel === false
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          itemCondition: condicao,
          seller: vendedor ? { "@type": "Organization", name: vendedor } : undefined,
          ...(produto.garantiaMeses && produto.garantiaMeses > 0
            ? {
                warranty: {
                  "@type": "WarrantyPromise",
                  durationOfWarranty: {
                    "@type": "QuantitativeValue",
                    value: produto.garantiaMeses,
                    unitCode: "MON",
                  },
                },
              }
            : {}),
        }
      : undefined,
  };
}

export type ServicoSeo = {
  nome: string;
  caminho: string;
  descricao?: string | null;
  precoCents?: number | null;
  prestador: string;
  /** Cidade ou região atendida. */
  area?: string | null;
  tipo?: string | null;
};

export function servicoJsonLd(servico: ServicoSeo): DadosJsonLd {
  const url = urlAbsoluta(servico.caminho);
  const preco = servico.precoCents ?? 0;
  const area = limpo(servico.area);

  return {
    "@context": CONTEXTO,
    "@type": "Service",
    name: servico.nome,
    url,
    description: servico.descricao ? textoLimpo(servico.descricao, 300) : undefined,
    serviceType: limpo(servico.tipo) ?? servico.nome,
    provider: { "@type": "Organization", name: servico.prestador, url: SITE_URL },
    areaServed: area ? { "@type": "City", name: area } : undefined,
    // sem preço fechado o serviço é sob orçamento — não se inventa valor
    offers:
      preco > 0
        ? {
            "@type": "Offer",
            url,
            priceCurrency: "BRL",
            price: (preco / 100).toFixed(2),
          }
        : undefined,
  };
}

export type PerguntaSeo = { pergunta: string; resposta: string };

export function faqJsonLd(perguntas: readonly PerguntaSeo[]): DadosJsonLd {
  return {
    "@context": CONTEXTO,
    "@type": "FAQPage",
    mainEntity: perguntas
      .filter((p) => p.pergunta?.trim() && p.resposta?.trim())
      .map((p) => ({
        "@type": "Question",
        name: p.pergunta.trim(),
        acceptedAnswer: {
          "@type": "Answer",
          text: textoLimpo(p.resposta, 1200),
        },
      })),
  };
}

export type MigalhaSeo = { rotulo: string; href?: string };

export function trilhaJsonLd(migalhas: readonly MigalhaSeo[]): DadosJsonLd {
  return {
    "@context": CONTEXTO,
    "@type": "BreadcrumbList",
    itemListElement: migalhas.map((migalha, indice) => ({
      "@type": "ListItem",
      position: indice + 1,
      name: migalha.rotulo,
      item: migalha.href ? urlAbsoluta(migalha.href) : undefined,
    })),
  };
}

/* -------------------------------------------------------------- renderização */

/**
 * Serializa e escapa. O `<` vira a sequência escapada equivalente, para que
 * nada vindo do banco consiga fechar a tag `script`; `>`, `&` e os
 * separadores de linha do Unicode saem escapados junto. Continua sendo JSON
 * válido para o buscador.
 */
export function serializarJsonLd(dados: DadosJsonLd | readonly DadosJsonLd[]) {
  const lista = "@type" in dados ? [dados] : dados;
  const conteudo = lista.length === 1 ? lista[0] : lista;

  return JSON.stringify(conteudo)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Componente de servidor que imprime o bloco de dados estruturados.
 * Escrito com `createElement` porque este arquivo é `.ts`, sem JSX.
 */
export function JsonLd({ dados }: { dados: DadosJsonLd | readonly DadosJsonLd[] }) {
  return createElement("script", {
    type: "application/ld+json",
    // conteúdo do próprio banco, serializado e escapado logo acima
    dangerouslySetInnerHTML: { __html: serializarJsonLd(dados) },
  });
}
