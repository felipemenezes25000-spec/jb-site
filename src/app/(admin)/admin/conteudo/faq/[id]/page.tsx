import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";

import { excluirFaq, salvarFaq } from "@/app/acoes/admin-conteudo";
import { BotaoAcaoConfirmar } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { produtosParaEscolha } from "@/components/admin/conteudo/consultas";
import { FormularioFaq } from "@/components/admin/conteudo/formulario-faq";
import { rotuloGrupoFaq } from "@/components/admin/conteudo/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const faq = await prisma.faq.findUnique({ where: { id }, select: { question: true } });
  return { title: faq ? `${faq.question.slice(0, 50)} · FAQ` : "Pergunta" };
}

const AVISOS: Record<string, string> = {
  criada: "Pergunta criada.",
};

export default async function PaginaEditarFaq({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const { id } = await params;
  const { ok } = await searchParams;

  const faq = await prisma.faq.findUnique({
    where: { id },
    select: {
      id: true,
      question: true,
      answer: true,
      group: true,
      productId: true,
      published: true,
      order: true,
    },
  });

  if (!faq) notFound();

  const podeEscrever = podeEditar(usuario, "conteudo");
  const produtos = await produtosParaEscolha();

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Perguntas frequentes", href: "/admin/conteudo/faq" },
          { rotulo: faq.question.slice(0, 40) },
        ]}
        titulo="Editar pergunta"
        descricao={`Grupo ${rotuloGrupoFaq(faq.group)} · posição ${faq.order}`}
        etiqueta={
          faq.published ? (
            <Etiqueta tom="ok" ponto>
              Publicada
            </Etiqueta>
          ) : (
            <Etiqueta tom="neutro" ponto>
              Despublicada
            </Etiqueta>
          )
        }
        acoes={
          podeEscrever ? (
            <BotaoAcaoConfirmar
              acao={excluirFaq}
              valores={{ id: faq.id }}
              rotulo="Excluir"
              pergunta="Excluir esta pergunta?"
              detalhe="Para tirar do site sem perder o texto, use Despublicar na listagem."
              rotuloConfirmar="Excluir pergunta"
              icone={<Trash2 className="size-4" aria-hidden />}
            />
          ) : undefined
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {podeEscrever ? (
        <FormularioFaq
          acao={salvarFaq}
          faq={{
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            group: faq.group,
            productId: faq.productId ?? "",
            published: faq.published,
          }}
          produtos={produtos}
        />
      ) : (
        <div className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
          <h2 className="text-base font-bold text-graf-950">{faq.question}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-graf-700">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  );
}
