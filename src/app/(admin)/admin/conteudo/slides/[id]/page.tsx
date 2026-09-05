import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";

import { excluirSlide, salvarSlide } from "@/app/acoes/admin-conteudo";
import { BotaoAcaoConfirmar } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioSlide } from "@/components/admin/conteudo/formulario-slide";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { formatarDataHora, paraInputDate } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const slide = await prisma.slide.findUnique({ where: { id }, select: { title: true } });
  return { title: slide ? `${slide.title} · Slides` : "Slide" };
}

const AVISOS: Record<string, string> = {
  criado: "Slide criado e posicionado no fim do carrossel.",
};

export default async function PaginaEditarSlide({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const { id } = await params;
  const { ok } = await searchParams;

  const slide = await prisma.slide.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      subtitle: true,
      href: true,
      order: true,
      published: true,
      startsAt: true,
      endsAt: true,
      updatedAt: true,
      image: {
        select: { id: true, url: true, filename: true, alt: true, width: true, height: true },
      },
    },
  });

  if (!slide) notFound();

  const podeEscrever = podeEditar(usuario, "conteudo");
  const biblioteca = await bibliotecaDeImagens();

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Slides", href: "/admin/conteudo/slides" },
          { rotulo: slide.title },
        ]}
        titulo={slide.title}
        descricao={`Posição ${slide.order} · alterado em ${formatarDataHora(slide.updatedAt)}`}
        etiqueta={
          slide.published ? (
            <Etiqueta tom="ok" ponto>
              Publicado
            </Etiqueta>
          ) : (
            <Etiqueta tom="neutro" ponto>
              Despublicado
            </Etiqueta>
          )
        }
        acoes={
          podeEscrever ? (
            <BotaoAcaoConfirmar
              acao={excluirSlide}
              valores={{ id: slide.id }}
              rotulo="Excluir"
              pergunta={`Excluir o slide "${slide.title}"?`}
              detalhe="A imagem continua na biblioteca de mídia, mas o slide é perdido."
              rotuloConfirmar="Excluir slide"
              icone={<Trash2 className="size-4" aria-hidden />}
            />
          ) : undefined
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {podeEscrever ? (
        <FormularioSlide
          acao={salvarSlide}
          slide={{
            id: slide.id,
            title: slide.title,
            subtitle: slide.subtitle ?? "",
            href: slide.href ?? "",
            published: slide.published,
            startsAt: paraInputDate(slide.startsAt),
            endsAt: paraInputDate(slide.endsAt),
          }}
          imagem={slide.image}
          biblioteca={biblioteca}
        />
      ) : (
        <Aviso tom="info" titulo="Somente consulta">
          Seu perfil abre o conteúdo do site, mas não pode alterar os slides.
        </Aviso>
      )}
    </div>
  );
}
