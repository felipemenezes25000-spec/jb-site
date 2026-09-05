import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, HelpCircle, Images, LayoutTemplate, Presentation } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Etiqueta } from "@/components/ui/data";
import { plural } from "@/lib/format";
import { exigirArea, somenteLeitura } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Conteúdo",
};

/**
 * Porta de entrada do CMS.
 *
 * Cada cartão leva para uma lista e mostra quantos registros existem e quantos
 * estão no ar — o número é a razão de o cartão existir, não enfeite.
 */
export default async function PaginaConteudo() {
  const usuario = await exigirArea("conteudo");
  const consulta = somenteLeitura(usuario, "conteudo");

  const [paginas, secoes, secoesNoAr, slides, slidesNoAr, perguntas, perguntasNoAr, arquivos] =
    await Promise.all([
      prisma.page.count(),
      prisma.homeSection.count(),
      prisma.homeSection.count({ where: { published: true } }),
      prisma.slide.count(),
      prisma.slide.count({ where: { published: true } }),
      prisma.faq.count(),
      prisma.faq.count({ where: { published: true } }),
      prisma.media.count(),
    ]);

  const areas = [
    {
      href: "/admin/conteudo/paginas",
      icone: FileText,
      titulo: "Páginas",
      descricao:
        "Textos institucionais e políticas — sobre a JB, entrega, privacidade, termos. Cada página responde em um endereço do site.",
      total: plural(paginas, "página cadastrada", "páginas cadastradas"),
      detalhe: paginas > 0 ? "Todas ficam disponíveis no site" : "Nenhuma página cadastrada",
    },
    {
      href: "/admin/conteudo/home",
      icone: LayoutTemplate,
      titulo: "Seções da home",
      descricao:
        "Os blocos da página inicial, na ordem em que aparecem. Dá para esconder um bloco sem apagá-lo.",
      total: plural(secoes, "seção", "seções"),
      detalhe: `${secoesNoAr} no ar`,
    },
    {
      href: "/admin/conteudo/slides",
      icone: Presentation,
      titulo: "Slides",
      descricao:
        "Carrossel de destaque, com imagem, link e período de exibição para campanhas com data marcada.",
      total: plural(slides, "slide", "slides"),
      detalhe: `${slidesNoAr} publicados`,
    },
    {
      href: "/admin/conteudo/faq",
      icone: HelpCircle,
      titulo: "Perguntas frequentes",
      descricao:
        "Dúvidas por grupo: geral, compra, entrega, assistência e as específicas de um produto.",
      total: plural(perguntas, "pergunta", "perguntas"),
      detalhe: `${perguntasNoAr} publicadas`,
    },
    {
      href: "/admin/conteudo/midia",
      icone: Images,
      titulo: "Biblioteca de mídia",
      descricao:
        "Todos os arquivos enviados pelo painel. Dá para copiar o endereço, corrigir a descrição e excluir o que não está em uso.",
      total: plural(arquivos, "arquivo", "arquivos"),
      detalhe: "Imagens de páginas, slides, produtos e chamados",
    },
  ];

  return (
    <div>
      <CabecalhoDeSecao
        titulo="Conteúdo do site"
        descricao="Tudo que o visitante lê antes de comprar ou abrir um chamado. As alterações valem no site logo depois de salvar."
        etiqueta={
          consulta ? <Etiqueta tom="neutro">Somente consulta</Etiqueta> : undefined
        }
      />

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => {
          const Icone = area.icone;
          return (
            <li key={area.href}>
              <Link
                href={area.href}
                className={cn(
                  "flex h-full flex-col rounded-xl border border-graf-200 bg-white p-5 shadow-card transition-[box-shadow,border-color]",
                  "hover:border-graf-300 hover:shadow-raised",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-600">
                    <Icone className="size-5" aria-hidden />
                  </span>
                  <ChevronRight className="mt-2 size-4 text-graf-400" aria-hidden />
                </span>

                <span className="mt-4 block text-base font-bold text-graf-950">{area.titulo}</span>
                <span className="mt-1 block flex-1 text-sm leading-relaxed text-graf-500">
                  {area.descricao}
                </span>

                <span className="mt-4 flex flex-wrap items-baseline gap-x-2 border-t border-graf-100 pt-3 text-sm">
                  <span className="tabular font-semibold text-graf-900">{area.total}</span>
                  <span className="text-graf-500">· {area.detalhe}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
