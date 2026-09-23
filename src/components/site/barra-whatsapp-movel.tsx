"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";

import { BotaoWhatsapp } from "@/components/site/botao-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { telHref } from "@/lib/format";

/* ============================================================================
   Barra do WhatsApp no pé do celular

   Aparece quando o botão da abertura sai da tela, e some de novo quando algum
   outro botão grande de WhatsApp está visível (diagnóstico, chamada final,
   rodapé): duas chamadas iguais empilhadas na mesma tela é ruído.

   Observa por IntersectionObserver, nunca por evento de rolagem. Fica abaixo
   do aviso de cookies (z-90), que precisa ser respondido primeiro, e respeita
   a área segura do iPhone.

   A mensagem é a do botão da abertura: na página da autoclave, a barra também
   chama sobre a autoclave. É lida do próprio link (`?text=` do wa.me), para a
   barra não precisar saber em que página está. Monta por página, pelo
   `template.tsx` do grupo, e não no layout, que não remonta entre páginas.
   ============================================================================ */

const OBSERVADOS = ['[data-whatsapp="abertura"]', '[data-whatsapp="diagnostico"]', '[data-whatsapp="fechamento"]', '[data-whatsapp="rodape"]'];

/** A mensagem e o equipamento do botão da abertura, lidos do próprio link. */
function lerAbertura(): { mensagem: string; equipamento?: string } | null {
  const abertura = document.querySelector<HTMLAnchorElement>('a[data-whatsapp="abertura"]');
  const mensagem = abertura ? new URL(abertura.href).searchParams.get("text") : null;
  if (!abertura || !mensagem) return null;
  return { mensagem, equipamento: abertura.dataset.equipamento || undefined };
}

export function BarraWhatsappMovel({ whatsapp, telefone }: { whatsapp: string; telefone: string }) {
  const [visivel, setVisivel] = useState(false);
  const [daAbertura, setDaAbertura] = useState<{ mensagem: string; equipamento?: string } | null>(null);
  const ligar = telHref(telefone);

  useEffect(() => {
    const alvos = OBSERVADOS.flatMap((seletor) => [...document.querySelectorAll(seletor)]);
    if (alvos.length === 0) return;

    const naTela = new Set<Element>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) naTela.add(entrada.target);
          else naTela.delete(entrada.target);
        }
        setVisivel(naTela.size === 0);
        /* A primeira leitura do observador chega logo depois da montagem, e
           é nela que a mensagem da abertura é copiada: o servidor não sabe
           qual botão a página desenhou. */
        setDaAbertura((atual) => atual ?? lerAbertura());
      },
      { threshold: 0 },
    );

    for (const alvo of alvos) observador.observe(alvo);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      data-visivel={visivel}
      className="jb-barra-movel fixed inset-x-0 bottom-0 z-40 border-t border-graf-200 bg-white/95 px-3 pt-3 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-2">
        <BotaoWhatsapp
          numero={whatsapp}
          mensagem={daAbertura?.mensagem ?? MENSAGEM_PADRAO}
          equipamento={daAbertura?.equipamento}
          posicao="barra-movel"
          tamanho="lg"
          larguraTotal
          className="jb-pulso flex-1"
        />
        {ligar ? (
          <a
            href={ligar}
            aria-label="Ligar para a JB"
            className="foco-jb flex size-13 shrink-0 items-center justify-center rounded-lg border border-graf-300 bg-white text-graf-800 active:bg-graf-100"
          >
            <Phone className="size-5" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}
