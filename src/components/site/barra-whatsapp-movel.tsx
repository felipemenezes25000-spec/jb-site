"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { EQUIPAMENTOS, MENSAGEM_PADRAO, montarMensagem, type IdEquipamento } from "@/lib/diagnostico";

/* ============================================================================
   Barra do WhatsApp no pé do celular

   Jeferson e Jackson lado a lado nas páginas de assistência e conteúdo
   técnico. Páginas legais e convites privados de avaliação ficam de fora:
   nessas rotas uma barra de conversão fixa atrapalharia a tarefa principal.
   ============================================================================ */

const OBSERVADOS = ['[data-whatsapp="abertura"]', '[data-whatsapp="diagnostico"]', '[data-whatsapp="fechamento"]'];

function lerEquipamento(): IdEquipamento | null {
  const id = document.querySelector<HTMLAnchorElement>('a[data-whatsapp="abertura"]')?.dataset.equipamento;
  return EQUIPAMENTOS.find((equipamento) => equipamento.id === id)?.id ?? null;
}

function rotaSemBarra(pathname: string) {
  return pathname === "/privacidade" || pathname === "/termos" || pathname.startsWith("/avaliar/");
}

export function BarraWhatsappMovel({ contatos }: { contatos: ContatoWhatsapp[] }) {
  const pathname = usePathname();
  const [visivel, setVisivel] = useState(false);
  const [equipamento, setEquipamento] = useState<IdEquipamento | null | undefined>(undefined);

  useEffect(() => {
    if (rotaSemBarra(pathname)) return;

    const alvos = OBSERVADOS.flatMap((seletor) => [...document.querySelectorAll(seletor)]);
    if (alvos.length === 0) {
      /* Páginas editoriais não têm CTA de abertura. Nelas a barra pode ajudar,
         mas só depois de a pessoa começar a rolar — o template remonta por
         página, então o estado nasce limpo a cada navegação. */
      const aoRolar = () => setVisivel(window.scrollY > Math.min(360, window.innerHeight * 0.45));
      aoRolar();
      window.addEventListener("scroll", aoRolar, { passive: true });
      return () => window.removeEventListener("scroll", aoRolar);
    }

    const naTela = new Set<Element>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) naTela.add(entrada.target);
          else naTela.delete(entrada.target);
        }
        setVisivel(naTela.size === 0);
        setEquipamento((atual) => (atual === undefined ? lerEquipamento() : atual));
      },
      { threshold: 0 },
    );

    for (const alvo of alvos) observador.observe(alvo);
    return () => observador.disconnect();
  }, [pathname]);

  if (rotaSemBarra(pathname)) return null;

  const equipamentoAtual = equipamento
    ? EQUIPAMENTOS.find((item) => item.id === equipamento) ?? null
    : null;
  const contexto = equipamentoAtual
    ? `${equipamentoAtual.nome}: falar com a equipe`
    : "Falar com a equipe técnica";

  return (
    <div
      data-visivel={visivel}
      className="jb-barra-movel jb-barra-movel-premium fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/95 px-3 pt-2.5 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "calc(0.7rem + env(safe-area-inset-bottom))" }}
      aria-label="Atalhos de atendimento pelo WhatsApp"
    >
      <div className="mx-auto mb-2 flex max-w-md items-center justify-between gap-3 px-1">
        <p className="flex min-w-0 items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] text-graf-800">
          <span className="size-2 shrink-0 rounded-full bg-ok-500 shadow-[0_0_0_4px_rgb(16_185_129/0.12)]" aria-hidden />
          <span className="truncate">{contexto}</span>
        </p>
        <span className="shrink-0 rounded-full border border-graf-200 bg-white px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-graf-600 shadow-xs">
          WhatsApp
        </span>
      </div>
      <div className="mx-auto max-w-md">
        <OpcoesWhatsapp
          contatos={contatos}
          mensagem={equipamento ? montarMensagem({ equipamento }) : MENSAGEM_PADRAO}
          equipamento={equipamento ?? undefined}
          posicao="barra-movel"
          tamanho="lg"
          lado
          classeDoPrincipal="jb-pulso"
        />
      </div>
    </div>
  );
}
