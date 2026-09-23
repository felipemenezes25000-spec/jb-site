"use client";

import { useEffect, useState } from "react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { EQUIPAMENTOS, MENSAGEM_PADRAO, montarMensagem, type IdEquipamento } from "@/lib/diagnostico";

/* ============================================================================
   Barra do WhatsApp no pé do celular

   Jeferson e Jackson lado a lado, como em todo o site. Aparece quando os
   botões da abertura saem da tela, e some de novo quando algum outro par
   grande de WhatsApp está visível (diagnóstico, chamada final): duas
   chamadas iguais empilhadas na mesma tela é ruído.

   Observa por IntersectionObserver, nunca por evento de rolagem. Fica abaixo
   do aviso de cookies (z-90), que precisa ser respondido primeiro, e respeita
   a área segura do iPhone.

   A mensagem é a da abertura: na página da autoclave, a barra também chama
   sobre a autoclave. O equipamento é lido do próprio botão da abertura
   (`data-equipamento`), para a barra não precisar saber em que página está.
   Monta por página, pelo `template.tsx` do grupo, e não no layout, que não
   remonta entre páginas.
   ============================================================================ */

const OBSERVADOS = ['[data-whatsapp="abertura"]', '[data-whatsapp="diagnostico"]', '[data-whatsapp="fechamento"]'];

/** O equipamento do botão da abertura, quando a página tem um. */
function lerEquipamento(): IdEquipamento | null {
  const id = document.querySelector<HTMLAnchorElement>('a[data-whatsapp="abertura"]')?.dataset.equipamento;
  return EQUIPAMENTOS.find((equipamento) => equipamento.id === id)?.id ?? null;
}

export function BarraWhatsappMovel({ contatos }: { contatos: ContatoWhatsapp[] }) {
  const [visivel, setVisivel] = useState(false);
  const [equipamento, setEquipamento] = useState<IdEquipamento | null | undefined>(undefined);

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
           é nela que o equipamento da abertura é copiado: o servidor não sabe
           qual botão a página desenhou. */
        setEquipamento((atual) => (atual === undefined ? lerEquipamento() : atual));
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
  );
}
