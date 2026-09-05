"use client";

import { useId, useState } from "react";
import { Link2, RotateCcw } from "lucide-react";

import { Campo } from "@/components/ui/form";
import { gerarSlug } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Nome + endereço (slug)

   O slug acompanha o nome enquanto ninguém o editar à mão. No instante em que
   a pessoa digita no campo de endereço, ele para de seguir — porque mudar o
   endereço de uma página que já está no ar quebra link e busca, e isso precisa
   ser uma decisão consciente. O botão "seguir o nome" devolve o vínculo.

   O servidor gera o slug de novo a partir do que chegar, então o que se vê
   aqui é sempre o que será gravado.
   ============================================================================ */

export function CampoNomeESlug({
  nomeInicial = "",
  slugInicial = "",
  rotuloNome = "Nome",
  prefixoUrl,
  erroNome,
  erroSlug,
  autoFocus,
  className,
}: {
  nomeInicial?: string;
  slugInicial?: string;
  rotuloNome?: string;
  /** Mostrado antes do campo, ex.: "/loja/". */
  prefixoUrl?: string;
  erroNome?: string;
  erroSlug?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const base = useId();
  const [nome, setNome] = useState(nomeInicial);
  const [slug, setSlug] = useState(slugInicial);
  // registro novo começa seguindo o nome; registro que já existe, não
  const [seguindo, setSeguindo] = useState(slugInicial.trim() === "");

  function aoMudarNome(valor: string) {
    setNome(valor);
    if (seguindo) setSlug(gerarSlug(valor));
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <Campo
        rotulo={rotuloNome}
        name="name"
        id={`${base}-nome`}
        value={nome}
        onChange={(evento) => aoMudarNome(evento.target.value)}
        required
        autoFocus={autoFocus}
        maxLength={160}
        erro={erroNome}
      />

      <div>
        <Campo
          rotulo="Endereço na web"
          name="slug"
          id={`${base}-slug`}
          value={slug}
          onChange={(evento) => {
            setSeguindo(false);
            setSlug(evento.target.value);
          }}
          maxLength={160}
          erro={erroSlug}
          ajuda={
            prefixoUrl
              ? `Vai virar ${prefixoUrl}${slug || gerarSlug(nome) || "..."}`
              : "Só letras, números e hífen."
          }
        />
        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          {seguindo ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-graf-500">
              <Link2 className="size-3.5" aria-hidden />
              Acompanhando o nome
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSeguindo(true);
                setSlug(gerarSlug(nome));
              }}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 font-semibold text-jb-700 underline underline-offset-2",
                "hover:text-jb-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
              )}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Gerar de novo a partir do nome
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
