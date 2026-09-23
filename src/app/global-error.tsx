"use client";

import { useEffect } from "react";

import { CONTATO_DE_EMERGENCIA } from "@/components/institucional/contato-de-emergencia";
import { telHref, whatsappHref } from "@/lib/format";

/**
 * Último anteparo do aplicativo.
 *
 * Quando o layout raiz falha não há Tailwind, next/font ou componentes de
 * interface confiáveis. Por isso esta tela continua totalmente em estilo
 * inline e com contatos fixos no código, mas agora preserva a identidade da
 * experiência pública em vez de parecer uma página genérica do navegador.
 */

const CINZA_ESCURO = "#111315";
const CINZA_MEDIO = "#5a6066";
const VERMELHO = "#e0141b";
const VERMELHO_ESCURO = "#b91016";
const BORDA = "#e4e6e8";

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

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background:
            "radial-gradient(circle at 85% 5%, rgba(224,20,27,.13), transparent 28rem), radial-gradient(circle at 5% 95%, rgba(17,19,21,.06), transparent 24rem), #f7f8f9",
          color: CINZA_ESCURO,
          fontFamily: FONTE,
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <title>Erro — JB Soluções Odontológicas</title>

        <main
          style={{
            boxSizing: "border-box",
            width: "min(100% - 2rem, 72rem)",
            minHeight: "100dvh",
            margin: "0 auto",
            display: "grid",
            alignItems: "center",
            padding: "2rem 0 3rem",
          }}
        >
          <section
            style={{
              position: "relative",
              overflow: "hidden",
              display: "grid",
              gap: "2rem",
              padding: "clamp(1.25rem, 4vw, 3rem)",
              border: "1px solid rgba(255,255,255,.92)",
              borderRadius: "clamp(1.4rem, 3vw, 2rem)",
              background: "rgba(255,255,255,.9)",
              boxShadow: "0 40px 110px -64px rgba(17,19,21,.62)",
              backdropFilter: "blur(18px)",
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                width: 280,
                height: 280,
                right: -120,
                top: -140,
                borderRadius: "999px",
                background: "radial-gradient(circle, rgba(224,20,27,.19), transparent 68%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ position: "relative" }}>
              <div
                style={{
                  display: "inline-flex",
                  padding: "0.6rem 0.75rem",
                  borderRadius: 14,
                  border: `1px solid ${BORDA}`,
                  background: "#fff",
                  boxShadow: "0 16px 34px -28px rgba(17,19,21,.55)",
                }}
              >
                <img
                  src="/marca/jb-logo.webp"
                  alt={CONTATO_DE_EMERGENCIA.empresa}
                  width={126}
                  height={70}
                  style={{ height: 38, width: "auto" }}
                />
              </div>

              <p
                style={{
                  margin: "2rem 0 0",
                  fontSize: "0.72rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: VERMELHO,
                }}
              >
                Falha crítica de interface
              </p>

              <h1
                style={{
                  maxWidth: "13ch",
                  margin: "0.75rem 0 0",
                  fontSize: "clamp(2.4rem, 8vw, 5.3rem)",
                  lineHeight: 0.96,
                  letterSpacing: "-0.055em",
                  fontWeight: 850,
                }}
              >
                O site falhou. <span style={{ color: VERMELHO }}>O atendimento continua.</span>
              </h1>

              <p
                style={{
                  maxWidth: "38rem",
                  margin: "1.25rem 0 0",
                  fontSize: "clamp(1rem, 2vw, 1.125rem)",
                  lineHeight: 1.65,
                  color: CINZA_MEDIO,
                }}
              >
                Tente carregar novamente. Se o seu equipamento precisa de assistência, fale
                diretamente com Jeferson ou Jackson pelo WhatsApp ou telefone.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  marginTop: "1.75rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (tentarDeNovo) tentarDeNovo();
                    else window.location.reload();
                  }}
                  style={{
                    minHeight: 50,
                    padding: "0 1.35rem",
                    border: "none",
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${VERMELHO}, ${VERMELHO_ESCURO})`,
                    color: "#ffffff",
                    fontSize: "0.95rem",
                    fontWeight: 750,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    boxShadow: "0 22px 52px -30px rgba(224,20,27,.68)",
                  }}
                >
                  Tentar de novo
                </button>

                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  href="/"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 48,
                    padding: "0 1.35rem",
                    borderRadius: 12,
                    border: `1px solid ${BORDA}`,
                    background: "#fff",
                    color: CINZA_ESCURO,
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  Página inicial
                </a>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                padding: "1.1rem",
                border: `1px solid ${BORDA}`,
                borderRadius: 16,
                background: "#f8f9fa",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: CINZA_MEDIO,
                }}
              >
                Canais diretos
              </p>
              <ul
                style={{
                  display: "grid",
                  gap: "0.7rem",
                  listStyle: "none",
                  padding: 0,
                  margin: "0.9rem 0 0",
                  fontSize: "0.95rem",
                }}
              >
                {CONTATO_DE_EMERGENCIA.contatos.map(({ numero, nome }) => (
                  <li
                    key={numero}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "0.45rem",
                    }}
                  >
                    <strong>{nome}</strong>
                    <span aria-hidden style={{ color: "#a1a6ab" }}>·</span>
                    <a
                      href={whatsappHref(numero, `Olá, ${nome}! Vim pelo site e preciso de assistência técnica.`)}
                      data-whatsapp="erro"
                      rel="noopener noreferrer"
                      style={{ color: VERMELHO_ESCURO, fontWeight: 750 }}
                    >
                      WhatsApp
                    </a>
                    <span aria-hidden style={{ color: "#a1a6ab" }}>·</span>
                    <a href={telHref(numero)} style={{ color: VERMELHO_ESCURO, fontWeight: 750 }}>
                      Ligar
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href={`mailto:${CONTATO_DE_EMERGENCIA.email}`}
                    style={{ color: VERMELHO_ESCURO, fontWeight: 700 }}
                  >
                    {CONTATO_DE_EMERGENCIA.email}
                  </a>
                </li>
              </ul>
            </div>

            {error.digest ? (
              <p style={{ margin: 0, fontSize: "0.78rem", color: CINZA_MEDIO }}>
                Código da ocorrência:{" "}
                <code style={{ background: "#eef0f2", padding: "0.2rem 0.45rem", borderRadius: 5 }}>
                  {error.digest}
                </code>
              </p>
            ) : null}
          </section>
        </main>
      </body>
    </html>
  );
}
