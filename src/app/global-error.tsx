"use client";

import { useEffect } from "react";

import { CONTATO_DE_EMERGENCIA } from "@/components/institucional/contato-de-emergencia";
import { telHref, whatsappHref } from "@/lib/format";

/**
 * Último anteparo do aplicativo.
 *
 * Só entra em cena quando a falha acontece no layout raiz — e, quando isso
 * ocorre, o layout (com fonte, folha de estilo global e Toaster) não existe
 * mais. Por isso esta tela declara o próprio `<html>` e `<body>` e usa
 * estilo em linha: nada de Tailwind, nada de `next/font`, nada de componente
 * do kit. Qualquer dependência aqui é mais uma coisa que pode faltar
 * exatamente no momento em que ela é necessária.
 *
 * Pelo mesmo motivo o telefone vem de uma constante local, e não do painel:
 * a tela não consulta o banco.
 */

const CINZA_ESCURO = "#1a1c1e";
const CINZA_MEDIO = "#51565c";
const VERMELHO = "#e0141b";
const BORDA = "#dddfe2";

const FONTE =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export default function ErroGlobal({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    console.error("Falha no layout raiz", error);
  }, [error]);

  const tentarDeNovo = retry ?? reset;
  const linkWhatsapp = whatsappHref(CONTATO_DE_EMERGENCIA.whatsapp);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background: "#ffffff",
          color: CINZA_ESCURO,
          fontFamily: FONTE,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <title>Erro — JB Soluções Odontológicas</title>

        <main
          style={{
            maxWidth: "40rem",
            margin: "0 auto",
            padding: "3rem 1.25rem 4rem",
          }}
        >
          <img
            src="/marca/jb-logo.webp"
            alt={CONTATO_DE_EMERGENCIA.empresa}
            width={126}
            height={70}
            style={{ height: 44, width: "auto" }}
          />

          <p
            style={{
              margin: "2.5rem 0 0",
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: VERMELHO,
            }}
          >
            Erro inesperado
          </p>

          <h1
            style={{
              margin: "0.75rem 0 0",
              fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            O site não conseguiu carregar.
          </h1>

          <p
            style={{
              margin: "1rem 0 0",
              fontSize: "1.0625rem",
              lineHeight: 1.65,
              color: CINZA_MEDIO,
            }}
          >
            A falha foi registrada. Tente de novo em instantes — e, se for urgente, fale
            direto com a equipe da JB pelo telefone ou pelo WhatsApp.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "2rem",
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (tentarDeNovo) tentarDeNovo();
                else window.location.reload();
              }}
              style={{
                minHeight: 48,
                padding: "0 1.5rem",
                border: "none",
                borderRadius: 10,
                background: VERMELHO,
                color: "#ffffff",
                fontSize: "1rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>

            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 48,
                padding: "0 1.5rem",
                borderRadius: 10,
                border: `1px solid ${BORDA}`,
                color: CINZA_ESCURO,
                fontSize: "1rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ir para a página inicial
            </a>
          </div>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "2.5rem 0 0",
              borderTop: `1px solid ${BORDA}`,
              paddingTop: "1.5rem",
              fontSize: "1rem",
              lineHeight: 2,
            }}
          >
            <li>
              Telefone:{" "}
              <a
                href={telHref(CONTATO_DE_EMERGENCIA.telefone)}
                style={{ color: VERMELHO, fontWeight: 600 }}
              >
                {CONTATO_DE_EMERGENCIA.telefone}
              </a>
            </li>
            {linkWhatsapp ? (
              <li>
                WhatsApp:{" "}
                <a
                  href={linkWhatsapp}
                  rel="noopener noreferrer"
                  style={{ color: VERMELHO, fontWeight: 600 }}
                >
                  {CONTATO_DE_EMERGENCIA.whatsapp}
                </a>
              </li>
            ) : null}
            <li>
              E-mail:{" "}
              <a
                href={`mailto:${CONTATO_DE_EMERGENCIA.email}`}
                style={{ color: VERMELHO, fontWeight: 600 }}
              >
                {CONTATO_DE_EMERGENCIA.email}
              </a>
            </li>
          </ul>

          {error.digest ? (
            <p style={{ marginTop: "2rem", fontSize: "0.875rem", color: CINZA_MEDIO }}>
              Código da ocorrência:{" "}
              <code style={{ background: "#f4f4f5", padding: "0.15rem 0.4rem", borderRadius: 4 }}>
                {error.digest}
              </code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
