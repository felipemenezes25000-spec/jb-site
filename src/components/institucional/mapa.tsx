import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Mapa da unidade

   O endereço do embed vem de `maps_embed`, editável no painel. Duas
   precauções: só aceita URL do Google Maps (uma configuração errada não vira
   um iframe de qualquer site) e o carregamento é preguiçoso, para o mapa não
   competir com o conteúdo da página.

   O mapa e o endereço formam uma peça só — moldura com borda, mapa em cima e
   uma barra de rodapé com o endereço por escrito e o atalho para abrir no
   aplicativo. Antes a legenda ficava solta embaixo da imagem e o conjunto
   parecia um print colado na página.

   O iframe tem `title` — sem ele o leitor de tela anuncia apenas "quadro".
   Quem não carrega o mapa (ou não enxerga) continua sabendo onde a JB fica.
   ============================================================================ */

function ehGoogleMaps(url: string) {
  try {
    const alvo = new URL(url);
    return (
      alvo.protocol === "https:" &&
      /(^|\.)google\.com(\.br)?$/.test(alvo.hostname) &&
      alvo.pathname.startsWith("/maps/embed")
    );
  } catch {
    return false;
  }
}

/* `py-3` no toque: o link tinha 20px de altura, e sair do site por um alvo de
   20px no celular é errar e abrir o mapa sem querer. */
const CLASSE_ATALHO =
  "foco-jb inline-flex items-center rounded-xs text-[0.9375rem] font-semibold text-jb-700 underline underline-offset-4 hover:text-jb-500 pointer-coarse:min-h-11 pointer-coarse:py-3";

export function MapaDaUnidade({
  src,
  endereco,
  titulo = "Mapa com a localização da JB",
  className,
}: {
  src: string;
  endereco: string;
  titulo?: string;
  className?: string;
}) {
  const url = (src ?? "").trim();
  const buscaNoMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

  if (!ehGoogleMaps(url)) {
    // Sem embed configurado a página não fica com um buraco: mostra o
    // endereço e um link para abrir no aplicativo de mapas do visitante.
    if (!endereco) return null;
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border border-graf-200 bg-graf-50 px-5 py-6",
          className,
        )}
      >
        <MapPin className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
        <div className="min-w-0">
          <p className="text-base font-semibold leading-snug text-graf-950">{endereco}</p>
          <a
            href={buscaNoMaps}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(CLASSE_ATALHO, "mt-1")}
          >
            Abrir no Google Maps
          </a>
        </div>
      </div>
    );
  }

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-2xl border border-graf-200 bg-white",
        className,
      )}
    >
      <div className="aspect-[4/3] bg-graf-100 sm:aspect-[16/7]">
        <iframe
          src={url}
          title={titulo}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      </div>
      {endereco ? (
        <figcaption className="flex flex-wrap items-center justify-between gap-x-8 gap-y-1 border-t border-graf-200 px-5 py-4">
          <div className="flex min-w-0 items-start gap-2.5 text-[0.9375rem] leading-snug text-graf-800">
            <MapPin className="mt-0.5 size-4.5 shrink-0 text-graf-500" aria-hidden />
            <address className="not-italic">{endereco}</address>
          </div>
          <a href={buscaNoMaps} target="_blank" rel="noopener noreferrer" className={CLASSE_ATALHO}>
            Abrir no Google Maps
          </a>
        </figcaption>
      ) : null}
    </figure>
  );
}
