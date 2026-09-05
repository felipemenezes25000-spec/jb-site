import { ImageResponse } from "next/og";

import { formatarPreco } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/**
 * Imagem de compartilhamento da página de produto.
 *
 * É o que aparece quando alguém manda o link do equipamento no WhatsApp, no
 * e-mail ou numa rede. Sem ela, o link vira um retângulo cinza com o domínio —
 * e num negócio em que a conversa acontece no WhatsApp, isso custa venda.
 *
 * COMO É GERADA
 * -------------
 * `ImageResponse` de `next/og`, que é a API oficial desta versão do Next
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * 01-metadata/opengraph-image.md). Roda no runtime Node.js, que é o padrão do
 * arquivo, e por isso pode consultar o Prisma direto. Nenhuma dependência nova:
 * a fonte usada é a que o próprio `@vercel/og` já embute.
 *
 * A `ImageResponse` desenha com Satori, que aceita um subconjunto pequeno de
 * CSS. Duas regras valem para tudo aqui: todo elemento com mais de um filho
 * precisa de `display: flex` explícito, e não existe classe do Tailwind — as
 * cores da marca aparecem em hexadecimal, copiadas de `globals.css`.
 *
 * PREÇO
 * -----
 * Vale a mesma regra do site: preço zerado ou venda direta desligada não vira
 * número inventado, vira "Preço sob consulta".
 */

export const alt = "Equipamento odontológico na JB Soluções Odontológicas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A imagem é regerada no máximo de hora em hora, não a cada compartilhamento. */
export const revalidate = 3600;

/* ------------------------------------------------------------------- cores */

const VERMELHO = "#e0141b";
const GRAFITE = "#1a1c1e";
const GRAFITE_MEDIO = "#51565c";
const GRAFITE_CLARO = "#9ba1a8";
const BORDA = "#dddfe2";
const FUNDO_PAINEL = "#f7f8f8";

const ROTULO_CONDICAO: Record<string, string> = {
  novo: "Novo",
  seminovo: "Seminovo JB",
  usado: "Usado",
  recondicionado: "Recondicionado JB",
};

const DOMINIO = (process.env.NEXT_PUBLIC_SITE_URL ?? "jbsolucoesodontologicas.com.br")
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

/* ------------------------------------------------------------------- dados */

async function carregar(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      model: true,
      condition: true,
      priceCents: true,
      allowDirectPurchase: true,
      warrantyMonths: true,
      brand: { select: { name: true } },
      media: {
        orderBy: { order: "asc" },
        take: 1,
        select: { media: { select: { url: true, mime: true } } },
      },
    },
  });
}

/**
 * Baixa a foto do produto e devolve como `data:` URI.
 *
 * Por que baixar aqui em vez de passar a URL para o Satori: se o Satori tentar
 * buscar sozinho e a busca falhar (Blob fora do ar, link quebrado, arquivo em
 * formato que ele não decodifica), a geração inteira estoura e o link fica sem
 * imagem nenhuma. Buscando antes, a falha é só a falta da foto — o cartão
 * continua saindo, com o nome e o preço.
 *
 * Só PNG e JPEG passam: são os formatos que o decodificador do `@vercel/og`
 * entende com certeza. WebP e AVIF ficam de fora de propósito.
 */
async function fotoEmDataUri(url: string | undefined, mime: string | undefined) {
  if (!url || !url.startsWith("https://")) return null;
  if (mime && !["image/png", "image/jpeg", "image/jpg"].includes(mime.toLowerCase())) {
    return null;
  }

  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!resposta.ok) return null;

    const tipo = (resposta.headers.get("content-type") ?? "").split(";")[0]?.trim();
    if (!tipo || !["image/png", "image/jpeg"].includes(tipo)) return null;

    const bytes = new Uint8Array(await resposta.arrayBuffer());
    // 4 MB é folga suficiente para foto de catálogo e teto contra arquivo
    // gigante segurando a geração da imagem
    if (bytes.byteLength === 0 || bytes.byteLength > 4 * 1024 * 1024) return null;

    return `data:${tipo};base64,${Buffer.from(bytes).toString("base64")}`;
  } catch (erro) {
    console.error("opengraph-image: falha ao buscar a foto do produto", erro);
    return null;
  }
}

/** Corta o nome sem deixar palavra pela metade. */
function encurtar(texto: string, limite: number) {
  if (texto.length <= limite) return texto;
  const cortado = texto.slice(0, limite);
  const espaco = cortado.lastIndexOf(" ");
  return `${(espaco > limite * 0.6 ? cortado.slice(0, espaco) : cortado).trimEnd()}…`;
}

/* ---------------------------------------------------------------- desenho */

/** A faixa vermelha e o logotipo escrito, que aparecem nos dois cenários. */
function Marca() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 64,
          height: 64,
          borderRadius: 14,
          backgroundColor: VERMELHO,
          color: "#ffffff",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        JB
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: GRAFITE, lineHeight: 1.1 }}>
          JB Soluções Odontológicas
        </div>
        <div style={{ fontSize: 18, color: GRAFITE_MEDIO }}>
          Equipamentos e assistência técnica
        </div>
      </div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let produto: Awaited<ReturnType<typeof carregar>> = null;
  try {
    produto = await carregar(slug);
  } catch (erro) {
    console.error("opengraph-image: falha ao carregar o produto", erro);
  }

  // Produto inexistente ou banco fora do ar: cartão da marca, sem dado falso.
  if (!produto) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: 80,
            backgroundColor: "#ffffff",
            borderTop: `14px solid ${VERMELHO}`,
            fontFamily: "sans-serif",
          }}
        >
          <Marca />
          <div
            style={{
              display: "flex",
              marginTop: 40,
              fontSize: 52,
              fontWeight: 700,
              color: GRAFITE,
              lineHeight: 1.15,
            }}
          >
            Equipamentos odontológicos, peças e assistência técnica
          </div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 26, color: GRAFITE_MEDIO }}>
            {DOMINIO}
          </div>
        </div>
      ),
      size,
    );
  }

  const foto = await fotoEmDataUri(produto.media[0]?.media.url, produto.media[0]?.media.mime);

  // Com foto, a coluna do texto cai de 1200 para 700 e cabe bem menos: o nome
  // é cortado antes e a fonte encolhe mais cedo, senão ele vira quatro linhas e
  // empurra o preço para cima do rodapé.
  const nome = encurtar(produto.name, foto ? 62 : 76);
  const tamanhoDoNome = foto
    ? nome.length > 40
      ? 42
      : nome.length > 24
        ? 48
        : 56
    : nome.length > 52
      ? 46
      : nome.length > 30
        ? 54
        : 62;

  const condicao = ROTULO_CONDICAO[produto.condition] ?? "";
  const linhaDeIdentificacao = [produto.brand?.name, produto.model]
    .filter((parte): parte is string => Boolean(parte && parte.trim()))
    .join(" · ");

  const temPreco = produto.allowDirectPurchase && produto.priceCents > 0;

  // texto montado fora do JSX: o Satori trata cada nó de texto como um item de
  // flex, e misturar texto solto com valor interpolado espalha o espaçamento
  const garantia = produto.warrantyMonths
    ? `· ${produto.warrantyMonths} ${produto.warrantyMonths === 1 ? "mês" : "meses"} de garantia`
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#ffffff",
          borderTop: `14px solid ${VERMELHO}`,
          fontFamily: "sans-serif",
        }}
      >
        {/* coluna do texto */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: foto ? 700 : 1200,
            padding: foto ? "56px 48px 56px 64px" : "56px 64px",
          }}
        >
          <Marca />

          {/*
            O bloco do meio cresce e se centra sozinho. Sem isso, um nome de
            três linhas encosta na marca em cima e no preço embaixo — foi o que
            aconteceu no primeiro teste com "Compressor odontológico isento de
            óleo".
          */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              justifyContent: "center",
              paddingTop: 28,
              paddingBottom: 28,
            }}
          >
            {condicao ? (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  marginBottom: 20,
                  padding: "8px 18px",
                  borderRadius: 999,
                  backgroundColor: "#fff1f1",
                  border: `1px solid ${VERMELHO}`,
                  color: "#a5090c",
                  fontSize: 22,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {condicao}
              </div>
            ) : null}

            <div
              style={{
                display: "flex",
                fontSize: tamanhoDoNome,
                fontWeight: 700,
                color: GRAFITE,
                lineHeight: 1.12,
              }}
            >
              {nome}
            </div>

            {linhaDeIdentificacao ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 16,
                  fontSize: 26,
                  color: GRAFITE_MEDIO,
                }}
              >
                {linhaDeIdentificacao}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {temPreco ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <div style={{ display: "flex", fontSize: 22, color: GRAFITE_MEDIO }}>
                  a partir de
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: 54,
                    fontWeight: 700,
                    color: VERMELHO,
                  }}
                >
                  {formatarPreco(produto.priceCents)}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  fontSize: 40,
                  fontWeight: 700,
                  color: GRAFITE,
                }}
              >
                Preço sob consulta
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginTop: 22,
                paddingTop: 22,
                borderTop: `1px solid ${BORDA}`,
                fontSize: 22,
                color: GRAFITE_CLARO,
              }}
            >
              <div style={{ display: "flex" }}>{DOMINIO}</div>
              {garantia ? <div style={{ display: "flex" }}>{garantia}</div> : null}
            </div>
          </div>
        </div>

        {/* coluna da foto — some quando não há foto utilizável */}
        {foto ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 500,
              height: "100%",
              padding: 48,
              backgroundColor: FUNDO_PAINEL,
              borderLeft: `1px solid ${BORDA}`,
            }}
          >
            <img
              src={foto}
              alt=""
              width={404}
              height={404}
              style={{ objectFit: "contain" }}
            />
          </div>
        ) : null}
      </div>
    ),
    size,
  );
}
