"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { ArrowUpRight, ImageOff, Loader2, Search, Tag, X } from "lucide-react";

import { sugestoesDaBusca } from "@/app/acoes/busca";
import { MINIMO_DE_CARACTERES } from "@/lib/busca/intencao";
import type { Sugestoes } from "@/lib/busca/sugestoes";
import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Busca com sugestões

   Um campo, duas aparências (`cabecalho` e `hero`), um comportamento. Era esse
   o problema antes: dois campos diferentes que faziam a mesma coisa mal — abrir
   /busca com `?q=` e torcer para a pessoa ter digitado o nome exato.

   O que muda aqui é o intervalo entre a terceira letra e o Enter. Nesse
   intervalo a lista mostra o que a JB tem que já responde: equipamentos com
   foto e preço, categorias com contagem, marcas com contagem. Quem digita um
   SKU ou o código do fabricante recebe aquele equipamento marcado como
   casamento por código — é conferência, não navegação.

   TRÊS CUIDADOS QUE ESTE ARQUIVO CARREGA

   1. **Resposta atrasada não sobrescreve resposta nova.** Cada consulta leva um
      número de sequência; a que voltar com número menor que o último aplicado é
      descartada. Sem isso, digitar rápido faz a lista piscar resultados de três
      letras atrás.

   2. **O padrão ARIA é o de combobox com listbox**, não uma `div` com cliques:
      `aria-expanded`, `aria-controls`, `aria-activedescendant` e opções com
      `role="option"`. Setas movem a opção ativa sem tirar o foco do campo, que
      é o que faz leitor de tela anunciar a opção enquanto se digita.

   3. **Enter sem opção ativa é busca, não navegação.** Quem digitou e apertou
      Enter direto quer a página de resultados — e ela continua sendo o destino
      de tudo que não couber nas cinco linhas da lista.
   ============================================================================ */

const ESPERA_MS = 180;

export type FormaDaBusca = "cabecalho" | "hero";

type Props = {
  forma?: FormaDaBusca;
  id?: string;
  /** Texto do campo. O padrão muda com a forma. */
  placeholder?: string;
  rotulo?: string;
  /** Cabeçalho encolhido depois do scroll: 44px em vez de 48px. */
  compacto?: boolean;
  /** Foco assim que o campo aparecer — usado na busca expansível do celular. */
  focoInicial?: boolean;
  className?: string;
};

/** Uma opção da lista, já achatada: a navegação por seta é linear. */
type Opcao =
  | { tipo: "produto"; chave: string; href: string; rotulo: string }
  | { tipo: "categoria"; chave: string; href: string; rotulo: string }
  | { tipo: "marca"; chave: string; href: string; rotulo: string }
  | { tipo: "todos"; chave: string; href: string; rotulo: string };

const VAZIO: Sugestoes = {
  consulta: "",
  produtos: [],
  categorias: [],
  marcas: [],
  totalDeProdutos: 0,
};

export function BuscaComSugestoes({
  forma = "cabecalho",
  id,
  placeholder,
  rotulo = "Buscar no catálogo",
  compacto = false,
  focoInicial = false,
  className,
}: Props) {
  const router = useRouter();
  const gerado = useId();
  const idCampo = id ?? `busca-${gerado}`;
  const idLista = `${idCampo}-lista`;

  const [termo, setTermo] = useState("");
  const [aberta, setAberta] = useState(false);
  const [ativa, setAtiva] = useState(-1);
  const [dados, setDados] = useState<Sugestoes>(VAZIO);
  const [carregando, startTransition] = useTransition();

  const caixaRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const sequencia = useRef(0);
  const aplicada = useRef(0);

  const consultaCurta = termo.trim().length < MINIMO_DE_CARACTERES;

  useEffect(() => {
    if (focoInicial) campoRef.current?.focus();
  }, [focoInicial]);

  /* ------------------------------------------------------------ consulta */

  useEffect(() => {
    const consulta = termo.trim();

    if (consulta.length < MINIMO_DE_CARACTERES) {
      setDados(VAZIO);
      return;
    }

    const numero = ++sequencia.current;
    const temporizador = window.setTimeout(() => {
      startTransition(async () => {
        const resposta = await sugestoesDaBusca(consulta);
        // resposta atrasada de uma consulta anterior não volta para a tela
        if (numero < aplicada.current) return;
        aplicada.current = numero;
        setDados(resposta);
      });
    }, ESPERA_MS);

    return () => window.clearTimeout(temporizador);
  }, [termo]);

  /* ----------------------------------------------------- fechar por fora */

  useEffect(() => {
    if (!aberta) return;

    function aoClicar(evento: MouseEvent) {
      if (!caixaRef.current?.contains(evento.target as Node)) setAberta(false);
    }

    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [aberta]);

  /* -------------------------------------------------------------- opções */

  const opcoes: Opcao[] = [
    ...dados.produtos.map((produto) => ({
      tipo: "produto" as const,
      chave: `p:${produto.slug}`,
      href: `/loja/${produto.slug}`,
      rotulo: produto.nome,
    })),
    ...dados.categorias.map((categoria) => ({
      tipo: "categoria" as const,
      chave: `c:${categoria.slug}`,
      href: `/categoria/${categoria.slug}`,
      rotulo: categoria.nome,
    })),
    ...dados.marcas.map((marca) => ({
      tipo: "marca" as const,
      chave: `m:${marca.slug}`,
      href: `/marcas/${marca.slug}`,
      rotulo: marca.nome,
    })),
  ];

  const consultaLimpa = termo.trim();
  const hrefBusca = consultaLimpa
    ? `/busca?q=${encodeURIComponent(consultaLimpa)}`
    : "/loja";

  if (opcoes.length > 0) {
    opcoes.push({
      tipo: "todos",
      chave: "todos",
      href: hrefBusca,
      rotulo: `Ver todos os resultados para "${consultaLimpa}"`,
    });
  }

  const mostrarPainel = aberta && !consultaCurta;
  const semResultado = mostrarPainel && !carregando && opcoes.length === 0 && dados.consulta !== "";

  const irPara = useCallback(
    (href: string) => {
      setAberta(false);
      setAtiva(-1);
      router.push(href);
    },
    [router],
  );

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ativa >= 0 && opcoes[ativa]) {
      irPara(opcoes[ativa].href);
      return;
    }
    irPara(hrefBusca);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      if (mostrarPainel) {
        evento.preventDefault();
        setAberta(false);
        setAtiva(-1);
      }
      return;
    }

    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      if (opcoes.length === 0) return;
      evento.preventDefault();
      setAberta(true);
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      setAtiva((atual) => {
        const proximo = atual + passo;
        if (proximo < 0) return opcoes.length - 1;
        if (proximo >= opcoes.length) return 0;
        return proximo;
      });
    }
  }

  const hero = forma === "hero";
  const idOpcaoAtiva = ativa >= 0 && opcoes[ativa] ? `${idCampo}-op-${ativa}` : undefined;

  return (
    <div ref={caixaRef} className={cn("relative w-full min-w-0", className)}>
      <form role="search" onSubmit={aoEnviar}>
        <label htmlFor={idCampo} className="sr-only">
          {rotulo}
        </label>

        <div
          className={cn(
            "flex w-full items-center bg-white transition-[height,border-color,background-color,box-shadow] duration-200",
            hero
              ? "h-14 rounded-xl border border-graf-450 hover:border-graf-500 focus-within:border-jb-500 focus-within:ring-4 focus-within:ring-jb-500/15 sm:h-16"
              : cn(
                  "rounded-full border border-graf-300 bg-graf-50",
                  "hover:border-graf-400 hover:bg-white focus-within:border-jb-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-jb-500/8",
                  compacto ? "h-11" : "h-12",
                ),
            // com a lista aberta o campo e o painel formam uma peça só
            mostrarPainel && !hero && "rounded-b-none rounded-t-[1.375rem] border-b-transparent",
            mostrarPainel && hero && "rounded-b-none border-b-transparent",
          )}
        >
          <Search
            className={cn(
              "shrink-0",
              hero ? "ml-3.5 size-5 text-graf-500 sm:ml-5" : "ml-4 size-4.5 text-jb-600",
            )}
            aria-hidden
          />

          <input
            ref={campoRef}
            id={idCampo}
            name="q"
            type="text"
            role="combobox"
            aria-expanded={mostrarPainel}
            /* Só enquanto o painel existe: com a lista fechada, o elemento
               apontado não está no DOM, e referência quebrada em `aria-controls`
               é falha de acessibilidade — não é "aponta para nada por
               enquanto". Com `aria-expanded="false"` não há popup a anunciar. */
            aria-controls={mostrarPainel ? idLista : undefined}
            aria-autocomplete="list"
            aria-activedescendant={idOpcaoAtiva}
            aria-describedby={`${idCampo}-ajuda`}
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            value={termo}
            placeholder={
              placeholder ??
              (hero
                ? "Busque equipamento, marca, modelo ou SKU"
                : "Busque equipamentos, marcas, modelos ou peças...")
            }
            onChange={(evento) => {
              setTermo(evento.target.value);
              setAtiva(-1);
              setAberta(true);
            }}
            onFocus={() => setAberta(true)}
            onKeyDown={aoTeclar}
            className={cn(
              "h-full min-w-0 flex-1 bg-transparent text-graf-900 outline-none placeholder:text-graf-500",
              hero ? "px-3 text-base sm:px-4 sm:text-[1.0625rem]" : "px-3 text-base lg:text-[0.875rem]",
            )}
          />

          {termo ? (
            <button
              type="button"
              onClick={() => {
                setTermo("");
                setDados(VAZIO);
                setAtiva(-1);
                campoRef.current?.focus();
              }}
              aria-label="Limpar a busca"
              className="foco-jb mr-1 flex size-9 shrink-0 items-center justify-center rounded-full text-graf-500 transition-colors hover:bg-graf-100 hover:text-graf-800"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}

          {hero ? (
            <button
              type="submit"
              className="mr-1.5 flex h-11 shrink-0 items-center rounded-lg bg-graf-900 px-4 text-[0.9375rem] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-graf-800 active:translate-y-px active:bg-graf-950 sm:mr-2 sm:h-12 sm:px-6"
            >
              Buscar
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Buscar"
              className="mr-0.5 flex size-11 shrink-0 items-center justify-center rounded-full text-jb-600 transition-colors hover:bg-jb-50 hover:text-jb-800"
            >
              <Search className="size-4.5" aria-hidden />
            </button>
          )}
        </div>

        <p id={`${idCampo}-ajuda`} className="sr-only">
          As sugestões aparecem a partir de {MINIMO_DE_CARACTERES} letras. Use as setas para
          percorrer e Enter para abrir.
        </p>
      </form>

      {/* Contagem para leitor de tela — sem isto a lista muda em silêncio. */}
      <p aria-live="polite" className="sr-only">
        {mostrarPainel && opcoes.length > 0
          ? `${opcoes.length - 1} sugestões disponíveis.`
          : semResultado
            ? "Nenhuma sugestão."
            : ""}
      </p>

      {mostrarPainel ? (
        <div
          className={cn(
            "absolute inset-x-0 top-full z-50 overflow-hidden border border-graf-200 bg-white shadow-pop",
            hero ? "rounded-b-xl border-t-graf-100" : "rounded-b-[1.375rem] border-t-graf-100",
          )}
        >
          <ul id={idLista} role="listbox" aria-label="Sugestões da busca" className="max-h-[26rem] overflow-y-auto py-1.5">
            {carregando && opcoes.length === 0 ? (
              <li className="flex items-center gap-2.5 px-4 py-4 text-sm text-graf-500">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Procurando no catálogo…
              </li>
            ) : null}

            {dados.produtos.length > 0 ? (
              <li>
                <p className="px-4 pb-1 pt-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-graf-500">
                  Equipamentos
                </p>
                <ul>
                  {dados.produtos.map((produto, indice) => (
                    <LinhaProduto
                      key={produto.slug}
                      id={`${idCampo}-op-${indice}`}
                      ativa={ativa === indice}
                      produto={produto}
                      aoEscolher={() => irPara(`/loja/${produto.slug}`)}
                      aoApontar={() => setAtiva(indice)}
                    />
                  ))}
                </ul>
              </li>
            ) : null}

            {dados.categorias.length > 0 ? (
              <li>
                <p className="border-t border-graf-100 px-4 pb-1 pt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-graf-500">
                  Categorias
                </p>
                <ul>
                  {dados.categorias.map((categoria, posicao) => {
                    const indice = dados.produtos.length + posicao;
                    return (
                      <LinhaTaxonomia
                        key={categoria.slug}
                        id={`${idCampo}-op-${indice}`}
                        ativa={ativa === indice}
                        rotulo={categoria.nome}
                        total={categoria.total}
                        aoEscolher={() => irPara(`/categoria/${categoria.slug}`)}
                        aoApontar={() => setAtiva(indice)}
                      />
                    );
                  })}
                </ul>
              </li>
            ) : null}

            {dados.marcas.length > 0 ? (
              <li>
                <p className="border-t border-graf-100 px-4 pb-1 pt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-graf-500">
                  Marcas
                </p>
                <ul>
                  {dados.marcas.map((marca, posicao) => {
                    const indice = dados.produtos.length + dados.categorias.length + posicao;
                    return (
                      <LinhaTaxonomia
                        key={marca.slug}
                        id={`${idCampo}-op-${indice}`}
                        ativa={ativa === indice}
                        rotulo={marca.nome}
                        total={marca.total}
                        aoEscolher={() => irPara(`/marcas/${marca.slug}`)}
                        aoApontar={() => setAtiva(indice)}
                      />
                    );
                  })}
                </ul>
              </li>
            ) : null}

            {opcoes.length > 0 ? (
              <li
                id={`${idCampo}-op-${opcoes.length - 1}`}
                role="option"
                aria-selected={ativa === opcoes.length - 1}
                onMouseEnter={() => setAtiva(opcoes.length - 1)}
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  irPara(hrefBusca);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 border-t border-graf-100 px-4 py-3 text-[0.9375rem] font-semibold text-jb-700",
                  ativa === opcoes.length - 1 && "bg-jb-50",
                )}
              >
                <span className="truncate">
                  Ver todos os resultados para “{consultaLimpa}”
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-semibold text-graf-500">
                  {dados.totalDeProdutos > 0 ? (
                    <span className="tabular">{dados.totalDeProdutos}</span>
                  ) : null}
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </li>
            ) : null}

            {semResultado ? (
              <li className="px-4 py-5">
                <p className="text-[0.9375rem] font-semibold text-graf-900">
                  Nada encontrado para “{consultaLimpa}”.
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-graf-500">
                  Tente o nome do equipamento, a marca ou o modelo. A equipe da JB também
                  localiza equipamento que não está publicado.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onMouseDown={(evento) => {
                      evento.preventDefault();
                      irPara("/loja");
                    }}
                    className="foco-jb inline-flex min-h-9 items-center rounded-full border border-graf-300 px-3.5 text-[0.8125rem] font-semibold text-graf-800 transition-colors hover:border-graf-450 hover:bg-graf-50"
                  >
                    Ver o catálogo
                  </button>
                  <button
                    type="button"
                    onMouseDown={(evento) => {
                      evento.preventDefault();
                      irPara(
                        `/orcamento?tipo=compra&item=${encodeURIComponent(consultaLimpa)}`,
                      );
                    }}
                    className="foco-jb inline-flex min-h-9 items-center rounded-full border border-graf-300 px-3.5 text-[0.8125rem] font-semibold text-graf-800 transition-colors hover:border-graf-450 hover:bg-graf-50"
                  >
                    Pedir este equipamento
                  </button>
                </div>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- linhas */

function LinhaProduto({
  id,
  ativa,
  produto,
  aoEscolher,
  aoApontar,
}: {
  id: string;
  ativa: boolean;
  produto: Sugestoes["produtos"][number];
  aoEscolher: () => void;
  aoApontar: () => void;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={ativa}
      onMouseEnter={aoApontar}
      /* `mouseDown` e não `click`: o clique só dispara depois do `blur`, e o
         `blur` fecha o painel — a linha some antes de ser clicada. */
      onMouseDown={(evento) => {
        evento.preventDefault();
        aoEscolher();
      }}
      className={cn(
        "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
        ativa ? "bg-jb-50" : "hover:bg-graf-50",
      )}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-graf-200 bg-white">
        {produto.imagem ? (
          <Image
            src={produto.imagem}
            alt=""
            fill
            sizes="48px"
            className="object-contain p-1"
          />
        ) : (
          <ImageOff className="size-4 text-graf-400" aria-hidden />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {produto.marca ? (
            <span className="truncate text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-graf-500">
              {produto.marca}
            </span>
          ) : null}
          {produto.porIdentificador ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-graf-900 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white">
              <Tag className="size-2.5" aria-hidden />
              código
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[0.9375rem] font-semibold text-graf-900">
          {produto.nome}
        </span>
        {produto.modelo ? (
          <span className="block truncate text-[0.75rem] text-graf-500">{produto.modelo}</span>
        ) : null}
      </span>

      <span className="shrink-0 text-right">
        {produto.compraDireta && produto.precoCents > 0 ? (
          <span className="tabular text-[0.9375rem] font-bold text-graf-950">
            {formatarPreco(produto.precoCents)}
          </span>
        ) : (
          <span className="text-[0.8125rem] font-semibold text-graf-500">Sob orçamento</span>
        )}
      </span>
    </li>
  );
}

function LinhaTaxonomia({
  id,
  ativa,
  rotulo,
  total,
  aoEscolher,
  aoApontar,
}: {
  id: string;
  ativa: boolean;
  rotulo: string;
  total: number;
  aoEscolher: () => void;
  aoApontar: () => void;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={ativa}
      onMouseEnter={aoApontar}
      onMouseDown={(evento) => {
        evento.preventDefault();
        aoEscolher();
      }}
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 px-4 py-2 transition-colors",
        ativa ? "bg-jb-50" : "hover:bg-graf-50",
      )}
    >
      <span className="truncate text-[0.9375rem] font-semibold text-graf-800">{rotulo}</span>
      <span className="shrink-0 tabular text-[0.8125rem] text-graf-500">
        {total} {total === 1 ? "item" : "itens"}
      </span>
    </li>
  );
}
