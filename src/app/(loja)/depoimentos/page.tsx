import type { Metadata } from "next";
import { MessageSquareQuote, Quote } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { Grade } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { formatarData } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 * Ver docs/evolucao-jb/cobertura.md, fase 5.
 */
export const instant = false;

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Depoimentos" }];

/**
 * Depoimentos.
 *
 * `noindex` enquanto não houver nenhum — a mesma regra da Central Técnica.
 * Uma página de depoimentos vazia indexada é pior que não existir: ela
 * responde à busca de quem procurava prova social com uma tela em branco.
 */
export async function generateMetadata(): Promise<Metadata> {
  const total = await prisma.review.count({
    where: { publicConsent: true, publishedAt: { not: null } },
  });

  return {
    ...metadataDePagina({
      titulo: "Depoimentos",
      descricao:
        "O que clínicas atendidas pela JB escreveram — publicado só com autorização de quem escreveu.",
      caminho: "/depoimentos",
    }),
    ...(total === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DepoimentosPage() {
  /* As três condições andam juntas: autorização, curadoria e — implícita no
     `publishedAt` — a decisão de manter no ar. Retirar um depoimento é
     limpar essa data, e ele some daqui sem apagar a resposta. */
  const depoimentos = await prisma.review.findMany({
    where: { publicConsent: true, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 60,
    select: {
      id: true,
      comment: true,
      displayName: true,
      publishedAt: true,
      request: { select: { kind: true } },
    },
  });

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-6" />
        <TituloSecao
          como="h1"
          sobretitulo="O que dizem"
          titulo="Depoimentos de quem autorizou"
          descricao="Cada texto aqui foi escrito por uma clínica atendida pela JB, em resposta a um convite de avaliação, e publicado só depois de a pessoa marcar que autoriza. Nada foi editado para soar melhor."
        />

        <div className="mt-8">
          {depoimentos.length > 0 ? (
            <Grade colunas={{ base: 1, md: 2 }} como="ul">
              {depoimentos.map((depoimento) => (
                <li key={depoimento.id}>
                  <Cartao className="flex h-full flex-col gap-4 p-6">
                  <Quote className="size-6 shrink-0 text-jb-200" aria-hidden />
                  <blockquote className="text-[1.0625rem] leading-relaxed text-graf-800">
                    {depoimento.comment}
                  </blockquote>
                  <footer className="mt-auto border-t border-graf-100 pt-4 text-apoio text-graf-500">
                    {/* Nome vazio é anônimo, e anônimo é escolha de quem
                        respondeu — não um dado que faltou. */}
                    <span className="block font-semibold text-graf-700">
                      {depoimento.displayName || "Cliente que preferiu não se identificar"}
                    </span>
                    <span>
                      {depoimento.request.kind === "compra" ? "Sobre uma compra" : "Sobre um atendimento técnico"}
                      {depoimento.publishedAt
                        ? ` · ${formatarData(depoimento.publishedAt)}`
                        : ""}
                    </span>
                  </footer>
                  </Cartao>
                </li>
              ))}
            </Grade>
          ) : (
            /* O estado vazio explica a política em vez de prometer conteúdo.
               "Em breve" aqui seria a promessa de que depoimentos existem e
               ainda não foram carregados — e não é o caso. */
            <Vazio
              icone={MessageSquareQuote}
              titulo="Ainda não há depoimento autorizado para publicar"
              descricao="A JB só publica o que a clínica escreveu e autorizou, com a autorização registrada. Não há depoimento redigido pela empresa, nem avaliação obtida em troca de desconto — então, enquanto ninguém autorizar, esta página fica assim."
              acao={
                <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="sm">
                  Falar com a equipe
                </LinkBotao>
              }
            />
          )}
        </div>
      </Secao>
    </>
  );
}
