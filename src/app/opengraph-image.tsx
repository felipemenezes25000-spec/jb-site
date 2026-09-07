import { ImageResponse } from "next/og";

import { SETTING_DEFAULTS, getSettings } from "@/lib/settings";

/**
 * Imagem de compartilhamento padrão do site.
 *
 * Pelo arquivo, e não por página: esta convenção do Next vale para toda rota
 * abaixo da raiz, então qualquer endereço colado no WhatsApp passa a ter
 * prévia. Quem tem imagem própria — produto, artigo da Central Técnica,
 * página do CMS com capa — continua mandando a sua, porque `metadataDePagina`
 * define `openGraph.images` e o que a página declara vence o arquivo.
 *
 * Ficava tudo sem prévia antes disso, e para um negócio que vende por
 * WhatsApp o link sem imagem é o link que ninguém abre.
 *
 * Desenhado com formas e texto, sem carregar arquivo de imagem: a geração não
 * depende de a rede buscar um PNG, e um logotipo raster ficaria borrado em
 * 1200×630.
 */
export const alt = "JB Soluções Odontológicas — equipamentos e assistência técnica";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const JB_500 = "#e0141b";
const JB_700 = "#a5090c";
const GRAF_950 = "#1a1c1e";

export default async function ImagemDeCompartilhamento() {
  /* A rede de proteção segue a mesma dos 404: banco fora do ar não pode
     derrubar a geração da imagem, então a falha cai nos valores padrão. */
  const s = await getSettings().catch(() => ({ ...SETTING_DEFAULTS }));

  const nome = s.empresa_nome || "JB Soluções Odontológicas";
  const cidade = s.endereco_cidade || "São Paulo";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: GRAF_950,
          padding: 72,
          position: "relative",
        }}
      >
        {/* brilho da marca, canto superior direito */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -180,
            width: 760,
            height: 760,
            borderRadius: 999,
            background: `radial-gradient(circle, ${JB_500}55 0%, ${JB_700}00 62%)`,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: JB_500,
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#9ba1a8",
              display: "flex",
            }}
          >
            {cidade}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2.5,
              color: "#ffffff",
              maxWidth: 940,
              display: "flex",
            }}
          >
            {nome}
          </div>
          <div
            style={{
              fontSize: 38,
              lineHeight: 1.3,
              color: "#c3c7cc",
              maxWidth: 900,
              display: "flex",
            }}
          >
            Equipamentos odontológicos e assistência técnica — da compra à
            manutenção, com a mesma equipe.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 8, background: JB_500, display: "flex" }} />
          <div style={{ width: 44, height: 8, background: JB_700, display: "flex" }} />
        </div>
      </div>
    ),
    size,
  );
}
