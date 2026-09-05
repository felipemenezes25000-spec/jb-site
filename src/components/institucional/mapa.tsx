import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Mapa da unidade

   O endereço do embed vem de `maps_embed`, editável no painel. Duas
   precauções: só aceita URL do Google Maps (uma configuração errada não vira
   um iframe de qualquer site) e o carregamento é preguiçoso, para o mapa não
   competir com o conteúdo da página.

   O iframe tem `title` — sem ele o leitor de tela anuncia apenas "quadro".
   Abaixo fica sempre o endereço por escrito: quem não carrega o mapa (ou não
   enxerga) continua sabendo onde a JB fica.
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

  if (!ehGoogleMaps(url)) {
    // Sem embed configurado a página não fica com um buraco: mostra o
    // endereço e um link para abrir no aplicativo de mapas do visitante.
    if (!endereco) return null;
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border border-dashed border-graf-300 bg-graf-50 px-5 py-6",
          className,
        )}
      >
        <MapPin className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-graf-800">{endereco}</p>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline underline-offset-4 hover:text-jb-500"
          >
            Abrir no Google Maps
          </a>
        </div>
      </div>
    );
  }

  return (
    <figure className={className}>
      <div className="aspect-[16/10] overflow-hidden rounded-xl border border-graf-200 bg-graf-100 sm:aspect-[16/7]">
        <iframe
          src={url}
          title={titulo}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      </div>
      {endereco ? (
        <figcaption className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-graf-600">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-graf-500" aria-hidden />
            {endereco}
          </span>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
            target="_blank"
            rel="noopener noreferrer"
            /* `py-3` no toque: o link tinha 20px de altura, e sair do site por
               um alvo de 20px no celular é errar e abrir o mapa sem querer. */
            className="inline-flex items-center font-semibold text-jb-700 underline underline-offset-4 hover:text-jb-500 pointer-coarse:min-h-11 pointer-coarse:py-3"
          >
            Abrir no Google Maps
          </a>
        </figcaption>
      ) : null}
    </figure>
  );
}
