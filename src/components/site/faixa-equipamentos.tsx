import Image from "next/image";
import Link from "next/link";

import { ICONE_DO_EQUIPAMENTO, IMAGEM_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { EQUIPAMENTOS } from "@/lib/diagnostico";
import { PAGINAS_DE_EQUIPAMENTO } from "@/lib/paginas-equipamento";

/* ============================================================================
   Conserto por equipamento

   Logo abaixo da abertura, um atalho para a página de cada equipamento: quem
   chegou pela home com uma autoclave parada vai direto para a triagem da
   autoclave, e o buscador encontra as sete páginas a partir da home.

   Era uma marquise infinita com o trilho duplicado. Link que anda não se
   clica, e movimento automático sem pausa não entra num site que quer
   parecer organizado. Agora é navegação parada: sete colunas no desktop e uma
   fileira que rola de lado no celular, onde o item cortado na borda é a pista
   de que há mais. Sem prefetch automático: sete páginas baixadas em segundo
   plano disputariam rede com a conversa no WhatsApp.
   ============================================================================ */

const ITENS = EQUIPAMENTOS.flatMap((equipamento) => {
  const pagina = PAGINAS_DE_EQUIPAMENTO.find((item) => item.equipamento === equipamento.id);
  return pagina ? [{ equipamento, pagina }] : [];
});

export function FaixaEquipamentos() {
  return (
    <nav aria-label="Conserto por equipamento" className="border-b border-graf-200 bg-surface-muted">
      <div className="container-jb">
        <ul
          data-rolagem-horizontal
          className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-3 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-7 lg:gap-3 lg:overflow-visible lg:px-0 lg:py-4 [&::-webkit-scrollbar]:hidden">
          {ITENS.map(({ equipamento, pagina }) => {
            const Icone = ICONE_DO_EQUIPAMENTO[equipamento.id];
            const imagem = IMAGEM_DO_EQUIPAMENTO[equipamento.id];
            return (
              <li key={pagina.slug} className="shrink-0 snap-start lg:min-w-0">
                <Link
                  href={`/${pagina.slug}`}
                  prefetch={false}
                  className="foco-jb group flex min-h-14 items-center gap-3 rounded-xl border border-graf-200/80 bg-white py-2 pl-2 pr-4 text-sm font-extrabold leading-tight tracking-tight text-graf-900 transition-[border-color,box-shadow,color] duration-200 hover:border-jb-300 hover:text-jb-700 hover:shadow-card lg:h-full lg:pr-3"
                >
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted">
                    {imagem ? (
                      <Image src={imagem} alt="" fill sizes="40px" className="object-contain p-1 mix-blend-multiply" />
                    ) : (
                      <Icone className="size-5 text-jb-600" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0">{equipamento.nome}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
