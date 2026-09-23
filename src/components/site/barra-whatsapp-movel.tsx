"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircleMore } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { EQUIPAMENTOS, MENSAGEM_PADRAO, montarMensagem, type IdEquipamento } from "@/lib/diagnostico";

/* ============================================================================
   Barra do WhatsApp no pé do celular

   Jeferson e Jackson lado a lado nas páginas de assistência e conteúdo
   técnico. Páginas legais e convites privados de avaliação ficam de fora:
   nessas rotas uma barra de conversão fixa atrapalharia a tarefa principal.

   Na home e nas landings, a barra acompanha o contexto já montado nos CTAs:
   equipamento e, quando escolhidos, sintoma/situação/cidade. Esse texto só é
   reaproveitado localmente para montar o próximo link de WhatsApp; não entra
   em analytics nem é persistido pelo componente.

   O cabeçalho da barra não usa ponto verde de "online": disponibilidade é
   mostrada apenas por `StatusAtendimento`, que calcula o horário real. Aqui o
   ícone significa só conversa, evitando prometer presença imediata.
   ============================================================================ */

const OBSERVADOS = ['[data-whatsapp="abertura"]', '[data-whatsapp="diagnostico"]', '[data-whatsapp="fechamento"]'];

type ContextoDaBarra = {
  equipamento: IdEquipamento | null;
  mensagem: string | null;
};

function equipamentoValido(id: string | undefined): IdEquipamento | null {
  return EQUIPAMENTOS.find((equipamento) => equipamento.id === id)?.id ?? null;
}

function mensagemDoLink(link: HTMLAnchorElement | null): string | null {
  if (!link) return null;
  const href = link.getAttribute("href");
  if (!href) return null;
  try {
    const texto = new URL(href, window.location.href).searchParams.get("text")?.trim();
    return texto ? texto.slice(0, 2000) : null;
  } catch {
    return null;
  }
}

function lerContexto(): ContextoDaBarra {
  const candidatos = [
    document.querySelector<HTMLAnchorElement>('a[data-whatsapp="diagnostico"]'),
    document.querySelector<HTMLAnchorElement>('a[data-whatsapp="abertura"][data-equipamento]'),
  ];

  for (const link of candidatos) {
    const equipamento = equipamentoValido(link?.dataset.equipamento);
    if (!equipamento) continue;
    return { equipamento, mensagem: mensagemDoLink(link) };
  }

  return { equipamento: null, mensagem: null };
}

function rotaSemBarra(pathname: string) {
  return pathname === "/privacidade" || pathname === "/termos" || pathname.startsWith("/avaliar/");
}

export function BarraWhatsappMovel({ contatos }: { contatos: ContatoWhatsapp[] }) {
  const pathname = usePathname();
  const [visivel, setVisivel] = useState(false);
  const [contextoAtual, setContextoAtual] = useState<ContextoDaBarra>({
    equipamento: null,
    mensagem: null,
  });

  useEffect(() => {
    if (rotaSemBarra(pathname)) return;

    const alvos = OBSERVADOS.flatMap((seletor) => [...document.querySelectorAll(seletor)]);
    const linksDeContexto = [
      ...document.querySelectorAll<HTMLAnchorElement>('a[data-whatsapp="diagnostico"]'),
      ...document.querySelectorAll<HTMLAnchorElement>('a[data-whatsapp="abertura"][data-equipamento]'),
    ];

    const atualizarContexto = () => setContextoAtual(lerContexto());
    atualizarContexto();

    /* React atualiza `href` e `data-equipamento` quando a pessoa avança na
       triagem ou troca um defeito. Observar só esses atributos preserva o texto
       completo sem ouvir teclado, input ou qualquer dado fora dos links que o
       próprio site já gerou. */
    const observadorDoContexto = new MutationObserver(atualizarContexto);
    for (const link of linksDeContexto) {
      observadorDoContexto.observe(link, {
        attributes: true,
        attributeFilter: ["href", "data-equipamento"],
      });
    }

    if (alvos.length === 0) {
      /* Páginas editoriais não têm CTA de abertura. Nelas a barra pode ajudar,
         mas só depois de a pessoa começar a rolar — o template remonta por
         página, então o estado nasce limpo a cada navegação. */
      const aoRolar = () => setVisivel(window.scrollY > Math.min(360, window.innerHeight * 0.45));
      aoRolar();
      window.addEventListener("scroll", aoRolar, { passive: true });
      return () => {
        observadorDoContexto.disconnect();
        window.removeEventListener("scroll", aoRolar);
      };
    }

    const naTela = new Set<Element>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) naTela.add(entrada.target);
          else naTela.delete(entrada.target);
        }
        setVisivel(naTela.size === 0);
        atualizarContexto();
      },
      { threshold: 0 },
    );

    for (const alvo of alvos) observador.observe(alvo);
    return () => {
      observadorDoContexto.disconnect();
      observador.disconnect();
    };
  }, [pathname]);

  if (rotaSemBarra(pathname)) return null;

  const equipamento = contextoAtual.equipamento;
  const equipamentoAtual = equipamento
    ? EQUIPAMENTOS.find((item) => item.id === equipamento) ?? null
    : null;
  const contexto = equipamentoAtual
    ? `${equipamentoAtual.nome}: falar com a equipe`
    : "Falar com a equipe técnica";
  const mensagem =
    contextoAtual.mensagem ??
    (equipamento ? montarMensagem({ equipamento }) : MENSAGEM_PADRAO);

  return (
    <div
      data-visivel={visivel}
      className="jb-barra-movel jb-barra-movel-premium fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/95 px-3 pt-2.5 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "calc(0.7rem + env(safe-area-inset-bottom))" }}
      aria-label="Atalhos de atendimento pelo WhatsApp"
    >
      <div className="mx-auto mb-2 flex max-w-md items-center justify-between gap-3 px-1">
        <p className="flex min-w-0 items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.1em] text-graf-800">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700"
            aria-hidden
          >
            <MessageCircleMore className="size-3.5" />
          </span>
          <span className="truncate">{contexto}</span>
        </p>
        <span className="shrink-0 rounded-full border border-graf-200 bg-white px-2 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-graf-600 shadow-xs">
          WhatsApp
        </span>
      </div>
      <div className="mx-auto max-w-md">
        <OpcoesWhatsapp
          contatos={contatos}
          mensagem={mensagem}
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
