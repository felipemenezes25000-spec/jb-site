import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, FolderTree, Pencil, Trash2 } from "lucide-react";

import {
  alternarPublicacaoCategoria,
  excluirCategoria,
  moverCategoria,
} from "@/app/acoes/admin-catalogo";
import { BotaoAcao } from "@/components/admin/catalogo/botao-acao";
import { Etiqueta } from "@/components/ui/data";
import { IconeCategoria } from "@/components/ui/icone";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Árvore de categorias

   Componente de servidor: as ações são server actions passadas para botões
   cliente, então a árvore inteira continua sendo HTML vindo do servidor.

   A hierarquia é mostrada por recuo e por lista aninhada de verdade (`<ul>`
   dentro de `<li>`), que é o que faz o leitor de tela anunciar "nível 2".
   Recuo por CSS sozinho não diria nada a ninguém.
   ============================================================================ */

export type NoCategoria = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  published: boolean;
  featured: boolean;
  produtos: number;
  filhos: NoCategoria[];
};

/** Linha crua do banco, na ordem em que a árvore deve ser lida. */
export type LinhaCategoria = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  published: boolean;
  featured: boolean;
  parentId: string | null;
  produtos?: number;
};

/**
 * Transforma a lista achatada do banco na árvore. Uma consulta só: a
 * hierarquia é montada em memória, o que é bem mais barato do que uma consulta
 * por nível — e o catálogo tem dezenas de categorias, não milhares.
 */
export function montarArvore(linhas: LinhaCategoria[]): NoCategoria[] {
  const porPai = new Map<string | null, LinhaCategoria[]>();
  for (const linha of linhas) {
    const irmas = porPai.get(linha.parentId) ?? [];
    irmas.push(linha);
    porPai.set(linha.parentId, irmas);
  }

  const construir = (pai: string | null): NoCategoria[] =>
    (porPai.get(pai) ?? []).map((linha) => ({
      id: linha.id,
      name: linha.name,
      slug: linha.slug,
      icon: linha.icon,
      published: linha.published,
      featured: linha.featured,
      produtos: linha.produtos ?? 0,
      filhos: construir(linha.id),
    }));

  return construir(null);
}

/** Achata a árvore preservando a ordem visual, para usar em `<select>`. */
export function achatarCategorias(
  nos: NoCategoria[],
  profundidade = 0,
): { id: string; nome: string; profundidade: number }[] {
  return nos.flatMap((no) => [
    { id: no.id, nome: no.name, profundidade },
    ...achatarCategorias(no.filhos, profundidade + 1),
  ]);
}

/** Ids da categoria e de tudo abaixo dela — usado para evitar ciclo no select. */
export function idsDaSubarvore(nos: NoCategoria[], alvo: string): string[] {
  for (const no of nos) {
    if (no.id === alvo) return [alvo, ...achatarCategorias(no.filhos).map((item) => item.id)];
    const encontrado = idsDaSubarvore(no.filhos, alvo);
    if (encontrado.length > 0) return encontrado;
  }
  return [];
}

export function ArvoreCategorias({
  nos,
  podeMexer,
  nivel = 0,
}: {
  nos: NoCategoria[];
  podeMexer: boolean;
  nivel?: number;
}) {
  return (
    <ul className={cn(nivel === 0 ? "space-y-2" : "mt-2 space-y-2 border-l border-graf-200 pl-4")}>
      {nos.map((no, indice) => (
        <li key={no.id}>
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-graf-200 bg-white p-3 shadow-card",
              !no.published && "bg-graf-50",
            )}
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-graf-500"
            >
              <IconeCategoria nome={no.icon} className="size-4" />
            </span>

            <span className="min-w-0 flex-1">
              <Link
                href={`/admin/categorias/${no.id}`}
                className="block truncate text-sm font-semibold text-graf-900 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                {no.name}
              </Link>
              <span className="block truncate text-xs text-graf-500">
                /categoria/{no.slug} ·{" "}
                {no.produtos === 0
                  ? "sem produtos"
                  : `${no.produtos} ${plural(no.produtos, "produto", "produtos")}`}
              </span>
            </span>

            <span className="flex shrink-0 flex-wrap items-center gap-2">
              {no.featured ? <Etiqueta tom="marca">Destaque</Etiqueta> : null}
              <Etiqueta tom={no.published ? "ok" : "neutro"}>
                {no.published ? "Publicada" : "Oculta"}
              </Etiqueta>
            </span>

            {podeMexer ? (
              <span className="flex shrink-0 items-center gap-1">
                <BotaoAcao
                  acao={moverCategoria}
                  campos={{ id: no.id, direcao: "cima" }}
                  rotulo={<ArrowUp className="size-4" aria-hidden />}
                  rotuloAcessivel={`Subir ${no.name}`}
                  variante="sutil"
                  tamanho="md"
                  className="h-11 w-11 px-0"
                  desabilitado={indice === 0}
                />
                <BotaoAcao
                  acao={moverCategoria}
                  campos={{ id: no.id, direcao: "baixo" }}
                  rotulo={<ArrowDown className="size-4" aria-hidden />}
                  rotuloAcessivel={`Descer ${no.name}`}
                  variante="sutil"
                  tamanho="md"
                  className="h-11 w-11 px-0"
                  desabilitado={indice === nos.length - 1}
                />
                <BotaoAcao
                  acao={alternarPublicacaoCategoria}
                  campos={{ id: no.id }}
                  rotulo={
                    no.published ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )
                  }
                  rotuloAcessivel={no.published ? `Despublicar ${no.name}` : `Publicar ${no.name}`}
                  variante="sutil"
                  tamanho="md"
                  className="h-11 w-11 px-0"
                />
                <Link
                  href={`/admin/categorias/${no.id}`}
                  aria-label={`Editar ${no.name}`}
                  title={`Editar ${no.name}`}
                  className="inline-flex size-11 items-center justify-center rounded-lg bg-graf-100 text-graf-700 transition-colors hover:bg-graf-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>
                <BotaoAcao
                  acao={excluirCategoria}
                  campos={{ id: no.id }}
                  rotulo={<Trash2 className="size-4" aria-hidden />}
                  rotuloAcessivel={`Excluir ${no.name}`}
                  variante="perigo"
                  tamanho="md"
                  className="h-11 w-11 px-0"
                  confirmar={{
                    pergunta: `Excluir a categoria "${no.name}"?`,
                    detalhe:
                      no.produtos > 0 || no.filhos.length > 0
                        ? "Categoria com produtos ou subcategorias não pode ser apagada — o sistema vai recusar e explicar o motivo."
                        : "A categoria some do menu e da loja. Esta ação não pode ser desfeita.",
                    rotuloConfirmar: "Excluir categoria",
                  }}
                />
              </span>
            ) : null}
          </div>

          {no.filhos.length > 0 ? (
            <ArvoreCategorias nos={no.filhos} podeMexer={podeMexer} nivel={nivel + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Cabeçalho reaproveitado quando a árvore está vazia. */
export function ArvoreVazia({ acao }: { acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-graf-300 bg-graf-50/60 px-6 py-14 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-graf-500 shadow-card">
        <FolderTree className="size-5" aria-hidden />
      </span>
      <p className="text-base font-semibold text-graf-800">Nenhuma categoria ainda</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-graf-500">
        A categoria é o que organiza o menu, o filtro do catálogo e a navegação da loja.
      </p>
      {acao ? <div className="mt-6">{acao}</div> : null}
    </div>
  );
}
