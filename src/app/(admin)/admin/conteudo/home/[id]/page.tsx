import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";

import { excluirSecaoHome, salvarSecaoHome } from "@/app/acoes/admin-conteudo";
import { BotaoAcaoConfirmar } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioSecao } from "@/components/admin/conteudo/formulario-secao";
import { SECOES, ehTipoSecao } from "@/components/admin/conteudo/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { Etiqueta } from "@/components/ui/data";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const secao = await prisma.homeSection.findUnique({
    where: { id },
    select: { kind: true, title: true },
  });
  if (!secao) return { title: "Seção da home" };
  const rotulo = ehTipoSecao(secao.kind) ? SECOES[secao.kind].rotulo : secao.kind;
  return { title: `${secao.title || rotulo} · Home` };
}

const AVISOS: Record<string, string> = {
  criada: "Seção criada e já posicionada no fim da home.",
};

export default async function PaginaEditarSecao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const { id } = await params;
  const { ok } = await searchParams;

  const secao = await prisma.homeSection.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      title: true,
      subtitle: true,
      body: true,
      ctaLabel: true,
      ctaHref: true,
      order: true,
      published: true,
      updatedAt: true,
      media: {
        select: { id: true, url: true, filename: true, alt: true, width: true, height: true },
      },
    },
  });

  if (!secao) notFound();

  const podeEscrever = podeEditar(usuario, "conteudo");
  const rotulo = ehTipoSecao(secao.kind) ? SECOES[secao.kind].rotulo : secao.kind;

  const [biblioteca, existentes] = await Promise.all([
    bibliotecaDeImagens(),
    prisma.homeSection.findMany({ where: { id: { not: id } }, select: { kind: true } }),
  ]);

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Home", href: "/admin/conteudo/home" },
          { rotulo: secao.title || rotulo },
        ]}
        titulo={secao.title || rotulo}
        descricao={`${rotulo} · posição ${secao.order} · alterada em ${formatarDataHora(secao.updatedAt)}`}
        etiqueta={
          secao.published ? (
            <Etiqueta tom="ok" ponto>
              No ar
            </Etiqueta>
          ) : (
            <Etiqueta tom="neutro" ponto>
              Escondida
            </Etiqueta>
          )
        }
        acoes={
          podeEscrever ? (
            <BotaoAcaoConfirmar
              acao={excluirSecaoHome}
              valores={{ id: secao.id }}
              rotulo="Excluir"
              pergunta="Excluir esta seção da home?"
              detalhe="O texto cadastrado é perdido. Para tirar do ar sem perder nada, use Esconder na listagem."
              rotuloConfirmar="Excluir seção"
              icone={<Trash2 className="size-4" aria-hidden />}
            />
          ) : undefined
        }
      />

      {ok && AVISOS[ok] ? <Aviso tom="sucesso">{AVISOS[ok]}</Aviso> : null}

      {podeEscrever ? (
        <FormularioSecao
          acao={salvarSecaoHome}
          secao={{
            id: secao.id,
            kind: secao.kind,
            title: secao.title,
            subtitle: secao.subtitle,
            body: secao.body,
            ctaLabel: secao.ctaLabel,
            ctaHref: secao.ctaHref,
            published: secao.published,
          }}
          imagem={secao.media}
          biblioteca={biblioteca}
          tiposEmUso={existentes.map((outra) => outra.kind)}
        />
      ) : (
        <Aviso tom="info" titulo="Somente consulta">
          Seu perfil abre o conteúdo do site, mas não pode alterar as seções da home.
        </Aviso>
      )}
    </div>
  );
}
