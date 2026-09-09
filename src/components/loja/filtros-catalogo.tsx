"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

import { Botao, classesBotao } from "@/components/ui/button";
import { Chip, FiltrosAtivos } from "@/components/ui/chip";
import { useDialogo } from "@/components/ui/use-dialogo";
import { formatarPreco, formatarValor, paraCentavos } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Filtros do catálogo

   O estado mora na URL — o resultado é compartilhável, volta certo no botão
   "voltar" do navegador e é renderizado no servidor.

   Cada opção é um link de verdade, não uma caixa que depende de JavaScript:
   marcar "ALT" leva para a mesma lista com a marca somada, e clicar de novo
   leva para a lista sem ela. O desenho de caixa de seleção fica por conta do
   ícone, que é decorativo — quem usa leitor de tela ouve "Filtrar por
   Marca: ALT" ou "Remover filtro Marca: ALT".

   Nenhum grupo é inventado: as opções vêm do que existe publicado, e grupo
   sem opção simplesmente não aparece.
   ============================================================================ */

export type OpcaoFiltro = { valor: string; rotulo: string; quantidade?: number };

export type GruposFiltro = {
  categorias: OpcaoFiltro[];
  marcas: OpcaoFiltro[];
  condicoes: OpcaoFiltro[];
  voltagens: OpcaoFiltro[];
  faixaPreco: { minCents: number; maxCents: number };
};

export type ParametrosCatalogo = Record<string, string | string[] | undefined>;

/** O que a rota já define sozinha e por isso não vira filtro na barra. */
export type Travas = {
  travarCategoria?: boolean;
  travarCondicao?: boolean;
  travarMarca?: boolean;
};

export const ORDENS = [
  { valor: "relevancia", rotulo: "Mais relevantes" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
  { valor: "novidades", rotulo: "Novidades" },
  { valor: "destaque", rotulo: "Em destaque" },
] as const;

const CAMPO_DO_FILTRO: Record<string, string> = {
  categoria: "Categoria",
  marca: "Marca",
  condicao: "Condição",
  voltagem: "Voltagem",
};

/* --------------------------------------------------------------- endereços */

function paraParams(parametros: ParametrosCatalogo) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor === undefined) continue;
    const texto = Array.isArray(valor) ? valor.join(",") : valor;
    if (texto) params.set(chave, texto);
  }
  return params;
}

/** Endereço da mesma lista com as mudanças aplicadas. Página sempre volta ao início. */
export function enderecoCom(
  caminho: string,
  parametros: ParametrosCatalogo,
  mudancas: Record<string, string | null>,
) {
  const params = paraParams(parametros);
  for (const [chave, valor] of Object.entries(mudancas)) {
    if (valor === null || valor === "") params.delete(chave);
    else params.set(chave, valor);
  }
  params.delete("pagina");
  const consulta = params.toString();
  return consulta ? `${caminho}?${consulta}` : caminho;
}

export function valoresDe(parametros: ParametrosCatalogo, chave: string): string[] {
  const bruto = parametros[chave];
  if (!bruto) return [];
  const texto = Array.isArray(bruto) ? bruto.join(",") : bruto;
  return texto.split(",").filter(Boolean);
}

export function textoDe(parametros: ParametrosCatalogo, chave: string): string {
  const bruto = parametros[chave];
  if (!bruto) return "";
  return Array.isArray(bruto) ? (bruto[0] ?? "") : bruto;
}

/** Soma ou tira um valor de um filtro de vários valores. */
export function alternado(parametros: ParametrosCatalogo, chave: string, valor: string) {
  const atuais = valoresDe(parametros, chave);
  const novos = atuais.includes(valor)
    ? atuais.filter((v) => v !== valor)
    : [...atuais, valor];
  return novos.length ? novos.join(",") : null;
}

/**
 * Filtros aplicados, um por valor — é assim que viram fichas removíveis.
 * Fica dentro deste módulo de propósito: é código de cliente, e chamar daqui
 * de um Server Component devolveria uma referência, não a função.
 */
export function filtrosAplicados(parametros: ParametrosCatalogo, grupos: GruposFiltro) {
  const fichas: { chave: string; valor: string | null; campo?: string; rotulo: string }[] = [];

  const fontes: Record<string, OpcaoFiltro[]> = {
    categoria: grupos.categorias,
    marca: grupos.marcas,
    condicao: grupos.condicoes,
    voltagem: grupos.voltagens,
  };

  for (const chave of ["categoria", "marca", "condicao", "voltagem"]) {
    for (const valor of valoresDe(parametros, chave)) {
      const rotulo = fontes[chave]?.find((o) => o.valor === valor)?.rotulo ?? valor;
      fichas.push({ chave, valor, campo: CAMPO_DO_FILTRO[chave], rotulo });
    }
  }

  const min = textoDe(parametros, "preco_min");
  if (min) {
    fichas.push({
      chave: "preco_min",
      valor: null,
      campo: "Preço",
      rotulo: `a partir de ${formatarPreco(Number(min))}`,
    });
  }
  const max = textoDe(parametros, "preco_max");
  if (max) {
    fichas.push({
      chave: "preco_max",
      valor: null,
      campo: "Preço",
      rotulo: `até ${formatarPreco(Number(max))}`,
    });
  }
  if (textoDe(parametros, "estoque") === "1") {
    fichas.push({ chave: "estoque", valor: null, rotulo: "Somente em estoque" });
  }
  /* Este alarga a lista em vez de estreitar, mas é a mesma promessa: o que
     mudou o resultado aparece escrito e sai com um clique. Sem a ficha, a
     unidade vendida voltava à lista sem nada na tela explicando por quê. */
  if (textoDe(parametros, "vendidos") === "1") {
    fichas.push({ chave: "vendidos", valor: null, rotulo: "Incluindo unidades já vendidas" });
  }

  return fichas;
}

/* ------------------------------------------------------------------- peças */

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-graf-200 pb-6 last:border-b-0 last:pb-0">
      <summary className="-mx-2 flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500">
        <span className="text-[0.9375rem] font-bold text-graf-950">{titulo}</span>
        <ChevronDown
          className="size-4 shrink-0 text-graf-500 transition-transform duration-200 group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="mt-1.5">{children}</div>
    </details>
  );
}

function OpcaoLink({
  campo,
  opcao,
  marcado,
  href,
}: {
  campo: string;
  opcao: OpcaoFiltro;
  marcado: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      // combinação de filtros é resultado dinâmico: não vale pré-carregar dezenas
      prefetch={false}
      aria-label={`${marcado ? "Remover filtro" : "Filtrar por"} ${campo}: ${opcao.rotulo}`}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm transition-colors",
        "hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        marcado && "bg-jb-50/70 hover:bg-jb-50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          marcado
            ? "border-jb-500 bg-jb-500 text-white"
            : "border-graf-300 bg-white text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={3} />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          marcado ? "font-semibold text-graf-950" : "text-graf-700",
        )}
      >
        {opcao.rotulo}
      </span>
      {opcao.quantidade !== undefined ? (
        <span className="tabular shrink-0 text-[0.8125rem] text-graf-500">
          {opcao.quantidade}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Pastilha para grupo curto de rótulos curtos — voltagem, por exemplo.
 * Uma coluna de caixas de seleção para "Bivolt / 127 V / 220 V" faz a barra
 * parecer formulário de sistema; três pastilhas lado a lado ocupam uma linha
 * e leem como escolha de loja.
 */
function OpcaoPastilha({
  campo,
  opcao,
  marcado,
  href,
}: {
  campo: string;
  opcao: OpcaoFiltro;
  marcado: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      aria-label={`${marcado ? "Remover filtro" : "Filtrar por"} ${campo}: ${opcao.rotulo}`}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        marcado
          ? "border-jb-500 bg-jb-50 text-jb-700"
          : "border-graf-200 bg-white text-graf-700 hover:border-graf-400 hover:bg-graf-50",
      )}
    >
      {opcao.rotulo}
    </Link>
  );
}

/** Lista com rolagem própria quando o grupo é longo — a barra não vira uma página. */
function Lista({ children, muitas }: { children: React.ReactNode; muitas: boolean }) {
  return (
    <div
      className={cn(
        "-mx-2 space-y-0.5 px-2",
        muitas && "max-h-72 overflow-y-auto overscroll-contain",
      )}
    >
      {children}
    </div>
  );
}

/* ================================================================== painel */

export function ConteudoFiltros({
  grupos,
  parametros,
  travarCategoria,
  travarCondicao,
  travarMarca,
  onNavigate,
}: {
  grupos: GruposFiltro;
  parametros: ParametrosCatalogo;
  onNavigate?: () => void;
} & Travas) {
  const router = useRouter();
  const caminho = usePathname();
  const idMin = useId();
  const idMax = useId();
  const idErroFaixa = useId();
  const [erroFaixa, setErroFaixa] = useState("");

  const marcado = (chave: string, valor: string) =>
    valoresDe(parametros, chave).includes(valor);

  const enderecoOpcao = (chave: string, valor: string) =>
    enderecoCom(caminho, parametros, { [chave]: alternado(parametros, chave, valor) });

  const min = textoDe(parametros, "preco_min");
  const max = textoDe(parametros, "preco_max");
  const temFaixa = grupos.faixaPreco.maxCents > grupos.faixaPreco.minCents;
  const emEstoque = textoDe(parametros, "estoque") === "1";
  const comVendidos = textoDe(parametros, "vendidos") === "1";

  return (
    <div
      className="space-y-6"
      onClick={(evento) => {
        if ((evento.target as HTMLElement).closest("a[href]")) onNavigate?.();
      }}
    >
      {/* um grupo com uma opção só não filtra nada: ou some, ou engana */}
      {!travarCategoria && grupos.categorias.length > 1 ? (
        <Grupo titulo="Categoria">
          <Lista muitas={grupos.categorias.length > 8}>
            {grupos.categorias.map((opcao) => (
              <OpcaoLink
                key={opcao.valor}
                campo="Categoria"
                opcao={opcao}
                marcado={marcado("categoria", opcao.valor)}
                href={enderecoOpcao("categoria", opcao.valor)}
              />
            ))}
          </Lista>
        </Grupo>
      ) : null}

      {!travarCondicao && grupos.condicoes.length > 1 ? (
        <Grupo titulo="Condição">
          <Lista muitas={false}>
            {grupos.condicoes.map((opcao) => (
              <OpcaoLink
                key={opcao.valor}
                campo="Condição"
                opcao={opcao}
                marcado={marcado("condicao", opcao.valor)}
                href={enderecoOpcao("condicao", opcao.valor)}
              />
            ))}
          </Lista>
        </Grupo>
      ) : null}

      {/* em /marcas/[slug] a marca já é o recorte da rota: mostrar o grupo
          deixaria a pessoa marcar outra marca sem efeito nenhum */}
      {!travarMarca && grupos.marcas.length > 1 ? (
        <Grupo titulo="Marca">
          <Lista muitas={grupos.marcas.length > 8}>
            {grupos.marcas.map((opcao) => (
              <OpcaoLink
                key={opcao.valor}
                campo="Marca"
                opcao={opcao}
                marcado={marcado("marca", opcao.valor)}
                href={enderecoOpcao("marca", opcao.valor)}
              />
            ))}
          </Lista>
        </Grupo>
      ) : null}

      {grupos.voltagens.length > 1 ? (
        <Grupo titulo="Voltagem">
          <div className="flex flex-wrap gap-2 pt-1">
            {grupos.voltagens.map((opcao) => (
              <OpcaoPastilha
                key={opcao.valor}
                campo="Voltagem"
                opcao={opcao}
                marcado={marcado("voltagem", opcao.valor)}
                href={enderecoOpcao("voltagem", opcao.valor)}
              />
            ))}
          </div>
        </Grupo>
      ) : null}

      {temFaixa ? (
        <Grupo titulo="Preço">
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              const dados = new FormData(evento.currentTarget);
              const de = String(dados.get("min") ?? "").trim();
              const ate = String(dados.get("max") ?? "").trim();

              /* Faixa invertida ("de 10.000 ate 4.000") seguia para a URL e o
                 catalogo respondia com a lista vazia, sem dizer por que. Quem
                 digita assim quase sempre trocou os campos de lugar, entao a
                 tela diz isso em vez de devolver nada. */
              if (de && ate && paraCentavos(de) > paraCentavos(ate)) {
                setErroFaixa("O valor final precisa ser maior que o inicial.");
                return;
              }

              setErroFaixa("");
              router.push(
                enderecoCom(caminho, parametros, {
                  preco_min: de ? String(paraCentavos(de)) : null,
                  preco_max: ate ? String(paraCentavos(ate)) : null,
                }),
                { scroll: false },
              );
            }}
          >
            {/* os dois campos dividem a linha e o botão vem embaixo, em toda a
                largura: numa coluna de 272px o trio lado a lado espremia os
                campos a ponto de o valor digitado não caber */}
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={idMin}
                  className="mb-1.5 block text-[0.8125rem] font-semibold text-graf-700"
                >
                  De
                </label>
                <input
                  id={idMin}
                  name="min"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-invalid={erroFaixa ? true : undefined}
                  aria-describedby={erroFaixa ? idErroFaixa : undefined}
                  placeholder={formatarValor(grupos.faixaPreco.minCents)}
                  defaultValue={min ? formatarValor(Number(min)) : ""}
                  className="h-11 w-full min-w-0 rounded-lg border border-graf-450 bg-white px-3 text-base transition-colors placeholder:text-graf-500 hover:border-graf-500 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/20 sm:text-sm"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={idMax}
                  className="mb-1.5 block text-[0.8125rem] font-semibold text-graf-700"
                >
                  Até
                </label>
                <input
                  id={idMax}
                  name="max"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-invalid={erroFaixa ? true : undefined}
                  aria-describedby={erroFaixa ? idErroFaixa : undefined}
                  placeholder={formatarValor(grupos.faixaPreco.maxCents)}
                  defaultValue={max ? formatarValor(Number(max)) : ""}
                  className="h-11 w-full min-w-0 rounded-lg border border-graf-450 bg-white px-3 text-base transition-colors placeholder:text-graf-500 hover:border-graf-500 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/20 sm:text-sm"
                />
              </div>
            </div>
            <Botao type="submit" variante="secundario" tamanho="sm" larguraTotal className="mt-3">
              Aplicar faixa de preço
            </Botao>
            <p
              id={idErroFaixa}
              aria-live="polite"
              className="mt-2 text-[0.8125rem] font-semibold text-jb-700 empty:mt-0"
            >
              {erroFaixa}
            </p>
            <p className="mt-2.5 text-[0.8125rem] text-graf-500">
              Catálogo de {formatarPreco(grupos.faixaPreco.minCents)} a{" "}
              {formatarPreco(grupos.faixaPreco.maxCents)}.
            </p>
          </form>
        </Grupo>
      ) : null}

      <Grupo titulo="Disponibilidade">
        <Lista muitas={false}>
          <OpcaoLink
            campo="Disponibilidade"
            opcao={{ valor: "1", rotulo: "Somente em estoque" }}
            marcado={emEstoque}
            href={enderecoCom(caminho, parametros, {
              estoque: emEstoque ? null : "1",
              vendidos: null,
            })}
          />
          {/* Seminovo é unidade, não modelo: a que já saiu não volta, e por
              isso a lista não a mostra por padrão. Quem quer ver o que a JB
              já revisou e vendeu — histórico, link antigo, curiosidade
              legítima de quem está avaliando a bancada — pede aqui. As duas
              opções se desmarcam: "só em estoque" e "com vendidos" pedem
              coisas opostas. */}
          <OpcaoLink
            campo="Disponibilidade"
            opcao={{ valor: "1", rotulo: "Incluir unidades já vendidas" }}
            marcado={comVendidos}
            href={enderecoCom(caminho, parametros, {
              vendidos: comVendidos ? null : "1",
              estoque: null,
            })}
          />
        </Lista>
      </Grupo>
    </div>
  );
}

/** Barra lateral do desktop. Acompanha a rolagem sem cobrir a página. */
export function PainelFiltros({
  grupos,
  parametros,
  className,
  ...travas
}: {
  grupos: GruposFiltro;
  parametros: ParametrosCatalogo;
  className?: string;
} & Travas) {
  const caminho = usePathname();
  const aplicados = filtrosAplicados(parametros, grupos);
  /* A busca entra na conta junto com os outros. Ela vira ficha removível na
     mesma fileira e o "Limpar" já a levava embora — só o contador a deixava
     de fora, e a tela mostrava duas fichas dizendo "1 ativo". */
  const ativos = aplicados.length + (textoDe(parametros, "q") ? 1 : 0);
  const limpavel = ativos > 0;

  return (
    <div className={cn("lg:sticky lg:top-24", className)}>
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-graf-200 pb-3">
        <h2 className="flex items-baseline gap-2 text-base font-bold text-graf-950">
          Filtros
          {ativos > 0 ? (
            <span className="tabular text-[0.8125rem] font-semibold text-graf-500">
              {ativos} ativo{ativos > 1 ? "s" : ""}
            </span>
          ) : null}
        </h2>
        {/* o "limpar" precisa ser um alvo visível, não um link perdido:
            com filtro aplicado é a saída mais procurada da tela */}
        {limpavel ? (
          <Link
            href={caminho}
            scroll={false}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-graf-200 px-3 text-[0.8125rem] font-semibold text-graf-700 transition-colors pointer-coarse:min-h-11 hover:border-jb-200 hover:bg-jb-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <X className="size-3.5" aria-hidden />
            Limpar
          </Link>
        ) : null}
      </div>
      <ConteudoFiltros grupos={grupos} parametros={parametros} {...travas} />
    </div>
  );
}

/* ================================================================== barra */

/**
 * Barra do catálogo: busca dentro do resultado, atalho de filtros no celular,
 * ordenação e a fileira de filtros aplicados.
 */
export function BarraCatalogo({
  grupos,
  parametros,
  className,
  ...travas
}: {
  grupos: GruposFiltro;
  parametros: ParametrosCatalogo;
  className?: string;
} & Travas) {
  const router = useRouter();
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);
  const gaveta = useDialogo(aberto, fechar);
  const idBusca = useId();

  const busca = textoDe(parametros, "q");
  const ordem = textoDe(parametros, "ordem") || "relevancia";
  const aplicados = filtrosAplicados(parametros, grupos);
  /* A busca entra na conta junto com os outros. Ela vira ficha removível na
     mesma fileira e o "Limpar" já a levava embora — só o contador a deixava
     de fora, e a tela mostrava duas fichas dizendo "1 ativo". */
  const ativos = aplicados.length + (busca ? 1 : 0);
  // sem nenhuma consulta: a coleção inteira, do jeito que a rota a define
  const enderecoLimpo = caminho;

  function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const termo = String(dados.get("q") ?? "").trim();
    router.push(enderecoCom(caminho, parametros, { q: termo || null }), { scroll: false });
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form role="search" onSubmit={buscar} className="relative min-w-0 flex-1">
          <label htmlFor={idBusca} className="sr-only">
            Buscar no catálogo
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graf-500"
            aria-hidden
          />
          <input
            id={idBusca}
            type="search"
            name="q"
            defaultValue={busca}
            key={busca}
            placeholder="Buscar por nome, modelo ou marca"
            className="h-11 w-full rounded-lg border border-graf-450 bg-white pl-10 pr-3 text-base transition-colors placeholder:text-graf-500 hover:border-graf-500 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/20 sm:text-sm"
          />
          {/* aparece ao receber foco: quem usa teclado enxerga o que vai acionar */}
          <button
            type="submit"
            className="sr-only focus:not-sr-only focus:absolute focus:right-1.5 focus:top-1/2 focus:inline-flex focus:h-8 focus:-translate-y-1/2 focus:items-center focus:rounded-md focus:bg-jb-500 focus:px-3 focus:text-xs focus:font-bold focus:text-white"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAberto(true)}
            aria-haspopup="dialog"
            aria-expanded={aberto}
            className={classesBotao(
              "secundario",
              "md",
              "whitespace-nowrap lg:hidden",
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filtros
            {ativos > 0 ? (
              <span className="tabular ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-jb-500 text-xs font-bold text-white">
                {ativos}
              </span>
            ) : null}
          </button>

          <label className="flex min-w-0 flex-1 basis-44 items-center gap-2 text-[0.8125rem] font-semibold text-graf-600 sm:basis-auto sm:flex-none">
            <span className="hidden shrink-0 sm:inline">Ordenar por</span>
            <select
              value={ordem}
              onChange={(evento) =>
                router.push(
                  enderecoCom(caminho, parametros, {
                    ordem: evento.target.value === "relevancia" ? null : evento.target.value,
                  }),
                  { scroll: false },
                )
              }
              aria-label="Ordenar resultados"
              className="h-11 w-full min-w-0 rounded-lg border border-graf-450 bg-white pl-3 pr-9 text-base font-semibold text-graf-800 transition-colors hover:border-graf-500 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/20 sm:w-auto sm:text-sm"
            >
              {ORDENS.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {aplicados.length > 0 || busca ? (
        <FiltrosAtivos hrefLimpar={enderecoLimpo} className="mt-4">
          {busca ? (
            <Chip
              campo="Busca"
              rotulo={busca}
              tom="marca"
              href={enderecoCom(caminho, parametros, { q: null })}
            />
          ) : null}
          {aplicados.map((ficha) => (
            <Chip
              key={`${ficha.chave}-${ficha.valor ?? ficha.rotulo}`}
              campo={ficha.campo}
              rotulo={ficha.rotulo}
              href={enderecoCom(caminho, parametros, {
                [ficha.chave]: ficha.valor
                  ? alternado(parametros, ficha.chave, ficha.valor)
                  : null,
              })}
            />
          ))}
        </FiltrosAtivos>
      ) : null}

      {/* Gaveta de filtros — celular e tablet */}
      {aberto ? (
        <div className="fixed inset-0 z-70 lg:hidden">
          <div
            className="absolute inset-0 bg-graf-950/50 backdrop-blur-[1px]"
            onClick={fechar}
            aria-hidden
          />
          <div
            ref={gaveta}
            role="dialog"
            aria-modal="true"
            aria-label="Filtros do catálogo"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-[min(23rem,92vw)] flex-col bg-white shadow-pop"
          >
            <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-graf-200 px-4">
              <p className="flex items-baseline gap-2 text-[1.0625rem] font-bold text-graf-950">
                Filtros
                {ativos > 0 ? (
                  <span className="tabular text-[0.8125rem] font-semibold text-graf-500">
                    {ativos} ativo{ativos > 1 ? "s" : ""}
                  </span>
                ) : null}
              </p>
              <div className="flex items-center gap-1">
                {ativos > 0 ? (
                  <Link
                    href={enderecoLimpo}
                    scroll={false}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-graf-200 px-3 text-[0.8125rem] font-semibold text-graf-700 transition-colors hover:border-jb-200 hover:bg-jb-50 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    <X className="size-3.5" aria-hidden />
                    Limpar
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={fechar}
                  aria-label="Fechar filtros"
                  className="flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4">
              <ConteudoFiltros grupos={grupos} parametros={parametros} {...travas} />
            </div>

            <div className="shrink-0 border-t border-graf-200 p-4">
              <Botao onClick={fechar} larguraTotal>
                Ver resultados
              </Botao>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
