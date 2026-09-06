import { Suspense } from "react";
import type { Metadata } from "next";

import { excluirMidia, salvarMidia } from "@/app/acoes/admin-conteudo";
import {
  BibliotecaDeMidia,
  type MidiaDaBiblioteca,
} from "@/components/admin/conteudo/biblioteca-midia";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { FiltrosLista } from "@/components/admin/filtros-lista";
import { Esqueleto, Etiqueta } from "@/components/ui/data";
import { Paginacao } from "@/components/ui/paginacao";
import { formatarDataHora, plural } from "@/lib/format";
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

export const metadata: Metadata = {
  title: "Biblioteca de mídia",
};

const POR_PAGINA = 48;

/** Onde uma mídia pode estar sendo usada — mesma lista conferida na exclusão. */
const VINCULOS = {
  pageCovers: "capa de página",
  pageImages: "galeria de página",
  slides: "slide",
  homeSections: "seção da home",
  brandLogos: "logo de marca",
  categoryImages: "imagem de categoria",
  productMedia: "foto de produto",
  unitMedia: "foto de unidade",
  equipmentMedia: "foto de equipamento",
  requestMedia: "anexo de chamado",
  workOrderMedia: "anexo de OS",
} as const;

type ChaveDeVinculo = keyof typeof VINCULOS;

export default async function PaginaBibliotecaDeMidia({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pasta?: string; pagina?: string }>;
}) {
  const usuario = await exigirArea("conteudo");
  const podeEscrever = podeEditar(usuario, "conteudo");
  const { q, pasta, pagina } = await searchParams;

  const busca = (q ?? "").trim();
  const numeroDaPagina = Math.max(1, Number(pagina) || 1);

  const where = {
    ...(pasta ? { folder: pasta } : {}),
    ...(busca
      ? {
          OR: [
            { filename: { contains: busca, mode: "insensitive" as const } },
            { alt: { contains: busca, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [arquivos, total, pastasBrutas, ocupacao] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (numeroDaPagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        url: true,
        filename: true,
        alt: true,
        credit: true,
        hasPeople: true,
        authorizedAt: true,
        authorizedBy: true,
        usageNote: true,
        mime: true,
        size: true,
        width: true,
        height: true,
        folder: true,
        createdAt: true,
        _count: {
          select: {
            pageCovers: true,
            pageImages: true,
            slides: true,
            homeSections: true,
            brandLogos: true,
            categoryImages: true,
            productMedia: true,
            unitMedia: true,
            equipmentMedia: true,
            requestMedia: true,
            workOrderMedia: true,
          },
        },
      },
    }),
    prisma.media.count({ where }),
    prisma.media.findMany({
      distinct: ["folder"],
      orderBy: { folder: "asc" },
      select: { folder: true },
    }),
    prisma.media.aggregate({ _sum: { size: true }, _count: { _all: true } }),
  ]);

  const midias: MidiaDaBiblioteca[] = arquivos.map((arquivo) => {
    const contagem = arquivo._count;
    const chaves = Object.keys(VINCULOS) as ChaveDeVinculo[];
    const ondeUsa = chaves
      .filter((chave) => contagem[chave] > 0)
      .map((chave) => `${contagem[chave]} ${VINCULOS[chave]}`);
    const usos = chaves.reduce((soma, chave) => soma + contagem[chave], 0);

    return {
      id: arquivo.id,
      url: arquivo.url,
      filename: arquivo.filename,
      alt: arquivo.alt,
      credit: arquivo.credit,
      hasPeople: arquivo.hasPeople,
      autorizadaEm: arquivo.authorizedAt ? formatarDataHora(arquivo.authorizedAt) : "",
      autorizadaPor: arquivo.authorizedBy,
      usageNote: arquivo.usageNote,
      mime: arquivo.mime,
      size: arquivo.size,
      width: arquivo.width,
      height: arquivo.height,
      folder: arquivo.folder,
      criadaEm: formatarDataHora(arquivo.createdAt),
      usos,
      ondeUsa,
    };
  });

  const pastas = pastasBrutas.map((linha) => linha.folder);
  const espaco = ocupacao._sum.size ?? 0;

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Conteúdo", href: "/admin/conteudo" }, { rotulo: "Biblioteca de mídia" }]}
        titulo="Biblioteca de mídia"
        descricao="Todos os arquivos enviados pelo painel e pelos formulários do site. Arquivo em uso não pode ser excluído."
        etiqueta={
          <Etiqueta tom="neutro">
            {plural(ocupacao._count._all, "arquivo", "arquivos")} ·{" "}
            {(espaco / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB
          </Etiqueta>
        }
      />

      <FiltrosLista
        campos={[
          {
            tipo: "busca",
            nome: "q",
            rotulo: "Buscar",
            placeholder: "Nome do arquivo ou descrição",
          },
          {
            tipo: "selecao",
            nome: "pasta",
            rotulo: "Pasta",
            todos: "Todas as pastas",
            opcoes: pastas.map((nome) => ({ valor: nome, rotulo: nome })),
          },
        ]}
      />

      <BibliotecaDeMidia
        midias={midias}
        pastas={pastas}
        acaoSalvar={salvarMidia}
        acaoExcluir={excluirMidia}
        podeEditar={podeEscrever}
      />

      <Suspense fallback={<Esqueleto className="h-11" />}>
        <Paginacao
          pagina={numeroDaPagina}
          porPagina={POR_PAGINA}
          total={total}
          rotuloSingular="arquivo"
          rotuloPlural="arquivos"
        />
      </Suspense>
    </div>
  );
}
