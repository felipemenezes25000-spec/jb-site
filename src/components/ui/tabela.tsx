import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";

import { Vazio } from "@/components/ui/data";
import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Tabela
   Uma listagem, dois desenhos: tabela de verdade a partir de md e lista de
   cartões rótulo/valor abaixo disso — tabela larga em 360px vira rolagem
   lateral e ninguém lê.

   A ordenação não guarda estado aqui: o cabeçalho é um link que só troca o
   parâmetro na URL e quem decide o que fazer com ele é a rota. Assim a
   tabela continua sendo Server Component e o resultado é compartilhável.
   ============================================================================ */

export type Alinhamento = "esquerda" | "centro" | "direita";
export type Direcao = "asc" | "desc";

export type Coluna<T> = {
  /** Nome do campo. Serve de chave da ordenação e de acesso ao valor bruto. */
  chave: string;
  rotulo: string;
  alinhamento?: Alinhamento;
  /** Largura CSS aplicada à coluna no desktop, ex.: "12rem". */
  largura?: string;
  /** Quando ausente, o valor é lido de `linha[chave]` e formatado do jeito óbvio. */
  renderizar?: (linha: T) => React.ReactNode;
  /**
   * O que escrever quando a célula está vazia.
   *
   * O travessão solto era o padrão e é exatamente o que a plataforma não
   * quer: numa coluna inteira ele vira um paredão de traços que não informa
   * se o dado não existe, não se aplica ou não foi preenchido. Diga em
   * português — "Sem controle", "Não informado", "Sob consulta".
   */
  vazio?: string;
  /** Some no mobile — use em colunas de apoio, nunca na que identifica a linha. */
  esconderNoMobile?: boolean;
  ordenavel?: boolean;
};

export type Ordenacao = { chave: string; direcao: Direcao };

export type EstadoVazio = {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  icone?: React.ComponentType<{ className?: string }>;
};

const ALINHAR: Record<Alinhamento, string> = {
  esquerda: "text-left",
  centro: "text-center",
  direita: "text-right",
};

/** Valor bruto virando texto sem surpresa: nada vazio na tela, sempre um "—". */
function valorPadrao(linha: unknown, chave: string, vazio: string): React.ReactNode {
  const bruto = (linha as Record<string, unknown>)[chave];
  const semValor = <span className="text-graf-500">{vazio}</span>;
  if (bruto === null || bruto === undefined) return semValor;
  if (bruto instanceof Date) return formatarData(bruto);
  if (typeof bruto === "boolean") return bruto ? "Sim" : "Não";
  if (typeof bruto === "number" || typeof bruto === "bigint") return String(bruto);
  if (typeof bruto === "string") return bruto.trim() === "" ? semValor : bruto;
  return semValor;
}

function conteudoDaCelula<T>(linha: T, coluna: Coluna<T>): React.ReactNode {
  return coluna.renderizar
    ? coluna.renderizar(linha)
    : valorPadrao(linha, coluna.chave, coluna.vazio ?? "Não informado");
}

function CabecalhoOrdenavel({
  coluna,
  ordenacao,
  hrefOrdenar,
}: {
  coluna: { chave: string; rotulo: string };
  ordenacao?: Ordenacao;
  hrefOrdenar: (chave: string, direcao: Direcao) => string;
}) {
  const ativo = ordenacao?.chave === coluna.chave;
  const proxima: Direcao = ativo && ordenacao?.direcao === "asc" ? "desc" : "asc";
  const Icone = !ativo ? ArrowUpDown : ordenacao?.direcao === "asc" ? ArrowUp : ArrowDown;

  return (
    <Link
      href={hrefOrdenar(coluna.chave, proxima)}
      scroll={false}
      className={cn(
        "-mx-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors",
        // no tablet a tabela também é tocada: 36px vira 44px
        "pointer-coarse:min-h-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        ativo ? "text-graf-900" : "text-graf-500 hover:text-graf-800",
      )}
    >
      {coluna.rotulo}
      <Icone className={cn("size-3.5 shrink-0", ativo ? "text-jb-600" : "text-graf-500")} aria-hidden />
      <span className="sr-only">
        {ativo
          ? ordenacao?.direcao === "asc"
            ? "ordenado do menor para o maior, clique para inverter"
            : "ordenado do maior para o menor, clique para inverter"
          : "clique para ordenar por esta coluna"}
      </span>
    </Link>
  );
}

export function Tabela<T>({
  colunas,
  linhas,
  chaveDaLinha,
  hrefDaLinha,
  ordenacao,
  hrefOrdenar,
  vazio,
  legenda,
  rodape,
  densa,
  className,
}: {
  colunas: Coluna<T>[];
  linhas: T[];
  chaveDaLinha: (linha: T, indice: number) => string;
  /** Torna a linha inteira clicável — vira link de verdade, funciona sem JS. */
  hrefDaLinha?: (linha: T) => string;
  ordenacao?: Ordenacao;
  /** Sem isto nenhum cabeçalho vira link, mesmo com `ordenavel`. */
  hrefOrdenar?: (chave: string, direcao: Direcao) => string;
  vazio?: EstadoVazio;
  /** Descrição da tabela para leitor de tela. */
  legenda?: string;
  rodape?: React.ReactNode;
  densa?: boolean;
  className?: string;
}) {
  if (linhas.length === 0) {
    return (
      <Vazio
        className={className}
        icone={vazio?.icone}
        titulo={vazio?.titulo ?? "Nada por aqui ainda"}
        descricao={vazio?.descricao}
        acao={vazio?.acao}
      />
    );
  }

  const noMobile = colunas.filter((coluna) => !coluna.esconderNoMobile);
  const paddingY = densa ? "py-2.5" : "py-3.5";

  return (
    <div className={className}>
      {/* ---------------------------------------------------- desktop */}
      {/* `max-w-full` e `min-w-0` garantem que a caixa role em vez de empurrar a
          página: sem eles, a tabela larga esticava o documento e o painel
          inteiro ganhava rolagem horizontal a partir de 1024px, onde a barra
          lateral fixa entra e o espaço útil encolhe. */}
      <div className="hidden min-w-0 max-w-full overflow-x-auto rounded-xl border border-graf-200 bg-white shadow-card md:block">
        <table className="w-full border-collapse text-sm">
          {legenda ? <caption className="sr-only">{legenda}</caption> : null}
          <thead>
            <tr className="bg-graf-50">
              {colunas.map((coluna) => {
                const ordenavel = Boolean(coluna.ordenavel && hrefOrdenar);
                const ativo = ordenacao?.chave === coluna.chave;
                return (
                  <th
                    key={coluna.chave}
                    scope="col"
                    style={coluna.largura ? { width: coluna.largura } : undefined}
                    aria-sort={
                      ordenavel
                        ? ativo
                          ? ordenacao?.direcao === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-[0.8125rem] font-bold uppercase tracking-wider text-graf-500",
                      ALINHAR[coluna.alinhamento ?? "esquerda"],
                    )}
                  >
                    {ordenavel && hrefOrdenar ? (
                      <CabecalhoOrdenavel
                        coluna={coluna}
                        ordenacao={ordenacao}
                        hrefOrdenar={hrefOrdenar}
                      />
                    ) : (
                      coluna.rotulo
                    )}
                  </th>
                );
              })}
              {hrefDaLinha ? (
                <th scope="col" className="w-12 px-4 py-3">
                  <span className="sr-only">Abrir</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => {
              const href = hrefDaLinha?.(linha);
              return (
                <tr
                  key={chaveDaLinha(linha, indice)}
                  className={cn(
                    "relative border-t border-graf-200 align-middle",
                    href && "transition-colors hover:bg-jb-50/40 focus-within:bg-jb-50/40",
                  )}
                >
                  {colunas.map((coluna, coluna_indice) => (
                    <td
                      key={coluna.chave}
                      className={cn(
                        "px-4 text-graf-700",
                        paddingY,
                        ALINHAR[coluna.alinhamento ?? "esquerda"],
                        coluna_indice === 0 && "font-medium text-graf-900",
                      )}
                    >
                      {coluna_indice === 0 && href ? (
                        <Link
                          href={href}
                          className={cn(
                            "rounded-sm transition-colors after:absolute after:inset-0 after:content-['']",
                            "hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                          )}
                        >
                          {conteudoDaCelula(linha, coluna)}
                        </Link>
                      ) : (
                        conteudoDaCelula(linha, coluna)
                      )}
                    </td>
                  ))}
                  {href ? (
                    <td className={cn("px-4 text-right", paddingY)}>
                      <ChevronRight className="ml-auto size-4 text-graf-400" aria-hidden />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rodape ? (
          <div className="border-t border-graf-200 bg-graf-50 px-4 py-3 text-sm text-graf-600">
            {rodape}
          </div>
        ) : null}
      </div>

      {/* ----------------------------------------------------- mobile */}
      <ul className="space-y-3 md:hidden">
        {linhas.map((linha, indice) => {
          const href = hrefDaLinha?.(linha);
          const [primeira, ...demais] = noMobile;
          return (
            <li
              key={chaveDaLinha(linha, indice)}
              className={cn(
                "relative rounded-xl border border-graf-200 bg-white p-4 shadow-card",
                href && "transition-colors focus-within:border-jb-300 hover:border-graf-300",
              )}
            >
              {primeira ? (
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[0.9375rem] font-semibold leading-snug text-graf-950">
                    {href ? (
                      <Link
                        href={href}
                        className={cn(
                          "rounded-sm after:absolute after:inset-0 after:content-['']",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                        )}
                      >
                        {conteudoDaCelula(linha, primeira)}
                      </Link>
                    ) : (
                      conteudoDaCelula(linha, primeira)
                    )}
                  </p>
                  {href ? (
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-graf-400" aria-hidden />
                  ) : null}
                </div>
              ) : null}

              {demais.length > 0 ? (
                <dl className="mt-3 grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
                  {demais.map((coluna) => (
                    <div key={coluna.chave} className="contents">
                      <dt className="text-graf-500">{coluna.rotulo}</dt>
                      <dd className="min-w-0 text-graf-800">{conteudoDaCelula(linha, coluna)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </li>
          );
        })}
        {rodape ? <li className="px-1 pt-1 text-sm text-graf-600">{rodape}</li> : null}
      </ul>
    </div>
  );
}
