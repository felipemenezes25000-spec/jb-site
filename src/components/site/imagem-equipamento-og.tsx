import { ImageResponse } from "next/og";

import { equipamentoDaPagina, paginaPorSlug } from "@/lib/paginas-equipamento";
import { configuracoesPublicas } from "@/lib/site-publico";

/* ============================================================================
   Prévia do link de cada equipamento

   O anúncio de autoclave vira link colado em grupo de WhatsApp, e a prévia
   precisa dizer "autoclave", não só o nome da JB. Mesmo desenho da imagem
   padrão (`app/opengraph-image.tsx`), com o equipamento no título: formas e
   texto, sem arquivo de imagem, para a geração não depender de buscar nada.

   Cada pasta de equipamento tem um `opengraph-image.tsx` de três linhas que
   chama esta função com o seu caminho.
   ============================================================================ */

export const TAMANHO_OG = { width: 1200, height: 630 };

const JB_500 = "#e0141b";
const JB_700 = "#a5090c";
const GRAF_950 = "#1a1c1e";

export async function imagemDoEquipamento(slug: string) {
  const pagina = paginaPorSlug(slug);
  const s = await configuracoesPublicas();
  const cidade = s.endereco_cidade || "São Paulo";
  const nome = pagina?.nomeCurto ?? "Equipamento";
  const evoxx = pagina ? equipamentoDaPagina(pagina).evoxx : false;

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
          <div style={{ width: 20, height: 20, borderRadius: 999, background: JB_500, display: "flex" }} />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#9ba1a8",
              display: "flex",
            }}
          >
            {s.empresa_nome || "JB Soluções Odontológicas"} · {cidade}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -3,
              color: "#ffffff",
              display: "flex",
            }}
          >
            {nome} parou?
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: JB_500,
              display: "flex",
            }}
          >
            A JB conserta.
          </div>
          <div style={{ fontSize: 34, lineHeight: 1.3, color: "#c3c7cc", display: "flex" }}>
            {pagina
              ? `Conserto de ${pagina.palavraChave} em ${cidade}.${evoxx ? " Autorizada EVOXX." : ""} Chame no WhatsApp.`
              : "Assistência técnica odontológica. Chame no WhatsApp."}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 120, height: 8, background: JB_500, display: "flex" }} />
          <div style={{ width: 44, height: 8, background: JB_700, display: "flex" }} />
        </div>
      </div>
    ),
    TAMANHO_OG,
  );
}
