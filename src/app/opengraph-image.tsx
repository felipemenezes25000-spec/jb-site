import { ImageResponse } from "next/og";

import { SETTING_DEFAULTS, getSettings } from "@/lib/settings";

/**
 * Imagem de compartilhamento padrão do site.
 *
 * Replica a linguagem da hero pública: problema primeiro, JB como resposta e
 * três provas factuais embaixo. É feita só com formas e texto para continuar
 * funcionando mesmo quando armazenamento de imagens ou banco estiverem fora.
 */
export const alt = "JB Soluções Odontológicas: assistência técnica odontológica de todas as marcas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const JB_500 = "#e0141b";
const JB_700 = "#a5090c";
const GRAF_950 = "#111315";
const GRAF_700 = "#555b61";

export default async function ImagemDeCompartilhamento() {
  const s = await getSettings().catch(() => ({ ...SETTING_DEFAULTS }));

  const nome = s.empresa_nome || "JB Soluções Odontológicas";
  const cidade = s.endereco_cidade || "São Paulo";
  const desde = s.empresa_desde || "2011";

  const provas = ["Todas as marcas", `Desde ${desde}`, `${cidade} e região`];

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
          padding: 64,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -310,
            right: -170,
            width: 820,
            height: 820,
            borderRadius: 999,
            background: `radial-gradient(circle, ${JB_500}66 0%, ${JB_700}00 64%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -220,
            bottom: -390,
            width: 760,
            height: 760,
            borderRadius: 999,
            background: "radial-gradient(circle, #ffffff12 0%, #ffffff00 62%)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 13, height: 34, borderRadius: 999, background: JB_500, display: "flex" }} />
            <div
              style={{
                fontSize: 25,
                fontWeight: 700,
                letterSpacing: -0.5,
                color: "#ffffff",
                display: "flex",
              }}
            >
              {nome}
            </div>
          </div>
          <div
            style={{
              padding: "10px 18px",
              border: "1px solid #ffffff22",
              borderRadius: 999,
              background: "#ffffff0d",
              fontSize: 18,
              fontWeight: 700,
              color: "#d7dadd",
              display: "flex",
            }}
          >
            Assistência técnica odontológica
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 970 }}>
          <div
            style={{
              fontSize: 86,
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: -4,
              color: "#ffffff",
              display: "flex",
            }}
          >
            Equipamento parou?
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -3.5,
              color: JB_500,
              display: "flex",
            }}
          >
            A JB assume daqui.
          </div>
          <div
            style={{
              marginTop: 18,
              maxWidth: 900,
              fontSize: 30,
              lineHeight: 1.35,
              color: "#c7cbd0",
              display: "flex",
            }}
          >
            Autoclave, compressor, cadeira e outros equipamentos. Triagem direto pelo WhatsApp.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {provas.map((prova) => (
            <div
              key={prova}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 16px",
                border: "1px solid #ffffff1f",
                borderRadius: 14,
                background: "#ffffff0c",
                fontSize: 18,
                fontWeight: 700,
                color: "#f3f4f5",
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: 999, background: JB_500, display: "flex" }} />
              {prova}
            </div>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", fontSize: 18, color: GRAF_700 }}>
            jbsolucoesodontologicas.com.br
          </div>
        </div>
      </div>
    ),
    size,
  );
}
