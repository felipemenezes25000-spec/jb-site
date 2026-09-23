import { ImageResponse } from "next/og";

import { paginaPorSlug } from "@/lib/paginas-equipamento";
import { configuracoesPublicas } from "@/lib/site-publico";

/* ============================================================================
   Prévia premium de cada equipamento

   Quem compartilha uma landing de anúncio precisa continuar vendo a mesma
   promessa que encontrou na página: equipamento primeiro, JB como resposta e
   provas objetivas. A arte usa apenas formas e texto para não depender de
   buscar imagem externa durante a geração.

   Cada pasta de equipamento tem um `opengraph-image.tsx` mínimo que chama esta
   função com o próprio slug.
   ============================================================================ */

export const TAMANHO_OG = { width: 1200, height: 630 };

const JB_500 = "#e0141b";
const JB_700 = "#a5090c";
const GRAF_950 = "#111315";

export async function imagemDoEquipamento(slug: string) {
  const pagina = paginaPorSlug(slug);
  const s = await configuracoesPublicas();
  const cidade = s.endereco_cidade || "São Paulo";
  const empresa = s.empresa_nome || "JB Soluções Odontológicas";
  const desde = s.empresa_desde || "2011";
  const nome = pagina?.nomeCurto ?? "Equipamento";

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
            top: -300,
            right: -150,
            width: 820,
            height: 820,
            borderRadius: 999,
            background: `radial-gradient(circle, ${JB_500}6b 0%, ${JB_700}00 64%)`,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: -240,
            bottom: -400,
            width: 780,
            height: 780,
            borderRadius: 999,
            background: "radial-gradient(circle, #ffffff12 0%, #ffffff00 64%)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28 }}>
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
              {empresa}
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
            Conserto de {pagina?.palavraChave ?? "equipamento odontológico"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxWidth: 1000 }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: -4,
              color: "#ffffff",
              display: "flex",
            }}
          >
            {nome} parou?
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
            A JB conserta.
          </div>
          <div
            style={{
              marginTop: 17,
              maxWidth: 930,
              fontSize: 29,
              lineHeight: 1.35,
              color: "#c7cbd0",
              display: "flex",
            }}
          >
            {pagina
              ? `Conte o defeito e escolha com quem falar. A mensagem chega pronta para a equipe técnica no WhatsApp.`
              : "Assistência técnica odontológica com triagem direta pelo WhatsApp."}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "#9fa4aa",
            }}
          >
            WhatsApp direto com a equipe
          </div>
        </div>
      </div>
    ),
    TAMANHO_OG,
  );
}
