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

/** Rota da imagem de compartilhamento padrão — gerada por `app/opengraph-image.tsx`. */
const IMAGEM_COMPARTILHAMENTO = "/opengraph-image";

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
/**
 * O nome da empresa, como aparece no template de título do layout raiz.
 *
 * O layout monta "%s · JB Soluções Odontológicas". Quando o título da página
 * já traz o nome — o que acontece sempre que ele vem do campo de SEO do
 * painel, onde é natural escrever o nome inteiro — a aba terminava com
 * "Sobre a JB Soluções Odontológicas · JB Soluções Odontológicas": 68
 * caracteres para dizer duas vezes a mesma coisa, num espaço em que o Google
 * mostra uns 60.
 */
const EMPRESA_NO_TITULO = "JB Soluções Odontológicas";

/** O título já diz o nome da empresa? Então o template não deve repeti-lo. */
function jaTemAMarca(titulo: string) {
  return titulo.toLowerCase().includes(EMPRESA_NO_TITULO.toLowerCase());
}

export function metadataDePagina(entrada: EntradaMetadata): Metadata {
  const titulo = entrada.titulo.trim();
  const descricao = entrada.descricao ? textoLimpo(entrada.descricao) : undefined;
  const imagem = entrada.imagem ? urlAbsoluta(entrada.imagem) : undefined;

  /* Toda página compartilha com imagem: a própria, quando existe capa, ou a
     do site.

     A imagem fica declarada aqui, e não só como arquivo de convenção, porque
     uma página que exporta `openGraph` por `generateMetadata` não recebe de
     volta a imagem de `app/opengraph-image.tsx` — medido: com a chave
     ausente, /loja, /contato, /faq e /assistencia-tecnica continuavam sem
     prévia nenhuma. Apontar para a rota da imagem resolve sem duplicar
     desenho: quem gera continua sendo aquele arquivo.

     Para um negócio que fecha venda por WhatsApp, link sem prévia é link que
     ninguém abre. */
  const imagemFinal = imagem ?? urlAbsoluta(IMAGEM_COMPARTILHAMENTO);

  const og = {
    type: entrada.tipo ?? "website",
    locale: "pt_BR",
    url: entrada.caminho ? urlAbsoluta(entrada.caminho) : undefined,
    title: titulo,
    description: descricao,
    images: [{ url: imagemFinal, alt: titulo, width: 1200, height: 630 }],
  };

  const twitter = {
    card: "summary_large_image" as const,
    title: titulo,
    description: descricao,
    images: [imagemFinal],
  };

  return {
    /* `absolute` desliga o template do layout para esta página — só quando o
       título já carrega o nome da empresa, para não dizer duas vezes. */
    title: jaTemAMarca(titulo) ? { absolute: titulo } : titulo,
    description: descricao,
    alternates: entrada.caminho ? { canonical: entrada.caminho } : undefined,
    openGraph: og,
    twitter,
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
    /* A área de atendimento vem das configurações quando a JB a declarou; só
       na falta dela caímos na cidade do endereço. Listar cidade onde não há
       cobertura é o erro que o escopo proíbe — e ele custa visita perdida. */
    areaServed: limpo(s.area_atendimento)
      ? { "@type": "AdministrativeArea", name: s.area_atendimento.trim() }
      : limpo(s.endereco_cidade)
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

/**
 * Uma faixa de CEP com preço e prazo reais, como o painel cadastrou.
 *
 * O escopo proíbe inventar prazo ou custo fixo quando eles dependem do CEP. A
 * saída não é omitir a entrega: é declarar cada faixa com o preço dela e o
 * intervalo de CEP em que aquele preço vale. `prazoDias` nulo não vira
 * número — sai do JSON-LD.
 */
export type FaixaDeEntregaSeo = {
  cepInicio: string;
  cepFim: string;
  valorCents: number;
  prazoDias: number | null;
};

/** Devolução, quando — e só quando — a JB definiu a política inteira. */
export type DevolucaoSeo = {
  dias: number;
  metodo: "transporte" | "no_local";
  quemPaga: "jb" | "cliente";
};

const METODO_DE_DEVOLUCAO = {
  transporte: "https://schema.org/ReturnByMail",
  no_local: "https://schema.org/ReturnInStore",
} as const;

const FRETE_DA_DEVOLUCAO = {
  jb: "https://schema.org/FreeReturn",
  cliente: "https://schema.org/ReturnFeesCustomerResponsibility",
} as const;

/**
 * Lê a política de devolução das configurações.
 *
 * Devolve `null` a menos que os três campos estejam preenchidos. Meia
 * política publicada é pior que nenhuma: o Google mostra o prazo, o cliente
 * cobra o prazo, e a JB nunca combinou o resto.
 */
export function politicaDeDevolucao(s: SettingsMap): DevolucaoSeo | null {
  const dias = Number((s.devolucao_prazo_dias ?? "").trim());
  const metodo = (s.devolucao_metodo ?? "").trim();
  const quemPaga = (s.devolucao_frete ?? "").trim();

  if (!Number.isInteger(dias) || dias < 1) return null;
  if (metodo !== "transporte" && metodo !== "no_local") return null;
  if (quemPaga !== "jb" && quemPaga !== "cliente") return null;

  return { dias, metodo, quemPaga };
}

function devolucaoJsonLd(devolucao: DevolucaoSeo): DadosJsonLd {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "BR",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: devolucao.dias,
    returnMethod: METODO_DE_DEVOLUCAO[devolucao.metodo],
    returnFees: FRETE_DA_DEVOLUCAO[devolucao.quemPaga],
  };
}

function entregaJsonLd(faixa: FaixaDeEntregaSeo): DadosJsonLd {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: {
      "@type": "MonetaryAmount",
      value: (faixa.valorCents / 100).toFixed(2),
      currency: "BRL",
    },
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: "BR",
      postalCodeRange: [
        {
          "@type": "PostalCodeRangeSpecification",
          postalCodeBegin: faixa.cepInicio,
          postalCodeEnd: faixa.cepFim,
        },
      ],
    },
    /* Prazo desconhecido sai do objeto. O campo não admite "não sei", e
       chutar dois dias porque o concorrente promete dois é como se inventa
       prazo de entrega. */
    deliveryTime:
      faixa.prazoDias !== null && faixa.prazoDias > 0
        ? {
            "@type": "ShippingDeliveryTime",
            transitTime: {
              "@type": "QuantitativeValue",
              maxValue: faixa.prazoDias,
              unitCode: "DAY",
            },
          }
        : undefined,
  };
}

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
  /** Já conferido por `@/lib/identificadores`. String vazia é ausência. */
  gtin?: string | null;
  mpn?: string | null;
  /** Faixas reais do perfil de frete do produto. Vazio: nada é declarado. */
  entrega?: readonly FaixaDeEntregaSeo[];
  devolucao?: DevolucaoSeo | null;
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

  const faixas = (produto.entrega ?? []).map(entregaJsonLd);

  return {
    "@context": CONTEXTO,
    "@type": "Product",
    name: produto.nome,
    url,
    sku: limpo(produto.sku),
    /* GTIN e MPN só chegam aqui depois de conferidos. O que este arquivo
       garante é o outro lado: quando não há identificador, o campo some — e
       não vira o SKU interno "para preencher". */
    gtin: limpo(produto.gtin),
    mpn: limpo(produto.mpn),
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
          shippingDetails: faixas.length ? faixas : undefined,
          hasMerchantReturnPolicy: produto.devolucao
            ? devolucaoJsonLd(produto.devolucao)
            : undefined,
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

export type ArtigoSeo = {
  titulo: string;
  caminho: string;
  descricao?: string | null;
  imagem?: string | null;
  /** Nome de quem assinou. Sem autor real, NADA de `author` no objeto. */
  autor?: string | null;
  revisor?: string | null;
  publicadoEm?: Date | null;
  revisadoEm?: Date | null;
  editor: string;
};

/**
 * Artigo da Central Técnica.
 *
 * Duas regras que valem mais que o resto do objeto:
 *
 * As datas vêm do banco ou não vêm. `datePublished` calculado no build é uma
 * data falsa com aspecto de cuidado, e ela se renova a cada deploy — o
 * buscador lê "revisado ontem" para sempre.
 *
 * `author` só existe com autor real. Um artigo técnico assinado pela própria
 * empresa quando ninguém assinou é a ficção que o escopo proíbe nomeadamente.
 */
export function artigoJsonLd(artigo: ArtigoSeo): DadosJsonLd {
  const url = urlAbsoluta(artigo.caminho);
  const autor = limpo(artigo.autor);
  const revisor = limpo(artigo.revisor);

  return {
    "@context": CONTEXTO,
    "@type": "TechArticle",
    headline: textoLimpo(artigo.titulo, 110),
    url,
    mainEntityOfPage: url,
    description: artigo.descricao ? textoLimpo(artigo.descricao, 300) : undefined,
    image: artigo.imagem ? urlAbsoluta(artigo.imagem) : undefined,
    datePublished: artigo.publicadoEm ? artigo.publicadoEm.toISOString() : undefined,
    dateModified: artigo.revisadoEm ? artigo.revisadoEm.toISOString() : undefined,
    author: autor ? { "@type": "Person", name: autor } : undefined,
    reviewedBy: revisor ? { "@type": "Person", name: revisor } : undefined,
    publisher: {
      "@type": "Organization",
      name: artigo.editor,
      "@id": `${SITE_URL}/#organizacao`,
    },
  };
}

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
