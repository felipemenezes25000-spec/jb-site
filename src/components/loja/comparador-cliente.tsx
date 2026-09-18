"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, Scale, X } from "lucide-react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const CHAVE = "jb:comparar";
export const MAXIMO_COMPARACAO = 3;

export type ItemComparado = { slug: string; nome: string };

type Contexto = {
  itens: ItemComparado[];
  alternar: (item: ItemComparado) => void;
  remover: (slug: string) => void;
  limpar: () => void;
  contem: (slug: string) => boolean;
  cheio: boolean;
  pronto: boolean;
};

const ComparadorContexto = createContext<Contexto | null>(null);

function ler(): ItemComparado[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados
      .filter(
        (item): item is ItemComparado =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as ItemComparado).slug === "string" &&
          typeof (item as ItemComparado).nome === "string",
      )
      .slice(0, MAXIMO_COMPARACAO);
  } catch {
    return [];
  }
}

function gravar(itens: ItemComparado[]) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    /* sem armazenamento a seleção vive só nesta aba */
  }
}

export function ComparadorProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemComparado[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setItens(ler());
    setPronto(true);
  }, []);

  useEffect(() => {
    function aoMudar(evento: StorageEvent) {
      if (evento.key === CHAVE) setItens(ler());
    }
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  const aplicar = useCallback(
    (mudanca: (atuais: ItemComparado[]) => ItemComparado[]) => {
      setItens((atuais) => {
        const proximos = mudanca(atuais);
        gravar(proximos);
        return proximos;
      });
    },
    [],
  );

  const valor = useMemo<Contexto>(
    () => ({
      itens,
      pronto,
      cheio: itens.length >= MAXIMO_COMPARACAO,
      contem: (slug) => itens.some((item) => item.slug === slug),
      alternar: (item) =>
        aplicar((atuais) => {
          if (atuais.some((atual) => atual.slug === item.slug)) {
            return atuais.filter((atual) => atual.slug !== item.slug);
          }
          const base = atuais.length >= MAXIMO_COMPARACAO ? atuais.slice(1) : atuais;
          return [...base, item];
        }),
      remover: (slug) => aplicar((atuais) => atuais.filter((atual) => atual.slug !== slug)),
      limpar: () => aplicar(() => []),
    }),
    [itens, pronto, aplicar],
  );

  return <ComparadorContexto.Provider value={valor}>{children}</ComparadorContexto.Provider>;
}

export function useComparador(): Contexto {
  const contexto = useContext(ComparadorContexto);
  return (
    contexto ?? {
      itens: [],
      alternar: () => {},
      remover: () => {},
      limpar: () => {},
      contem: () => false,
      cheio: false,
      pronto: false,
    }
  );
}

export function hrefDaComparacao(itens: ItemComparado[]): string {
  const busca = itens.map((item) => `p=${encodeURIComponent(item.slug)}`).join("&");
  return busca ? `/comparar?${busca}` : "/comparar";
}

export function BotaoComparar({
  slug,
  nome,
  forma = "icone",
  className,
}: {
  slug: string;
  nome: string;
  forma?: "icone" | "linha";
  className?: string;
}) {
  const { contem, alternar, pronto } = useComparador();
  const marcado = pronto && contem(slug);
  const rotulo = marcado ? "Remover da comparação" : "Adicionar à comparação";

  if (forma === "linha") {
    return (
      <button
        type="button"
        data-comparar-slug={slug}
        onClick={() => alternar({ slug, nome })}
        aria-pressed={marcado}
        className={cn(
          "foco-jb inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-[0.875rem] font-semibold transition-colors duration-150 motion-reduce:transition-none",
          marcado
            ? "border-jb-300 bg-jb-50 text-jb-700"
            : "border-graf-300 text-graf-800 hover:border-graf-450 hover:bg-graf-50",
          className,
        )}
      >
        {marcado ? <Check className="size-4 shrink-0" aria-hidden /> : <Scale className="size-4 shrink-0" aria-hidden />}
        {marcado ? "Na comparação" : "Comparar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      data-comparar-slug={slug}
      onClick={(evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        alternar({ slug, nome });
      }}
      aria-pressed={marcado}
      aria-label={`${rotulo}: ${nome}`}
      title={rotulo}
      className={cn(
        "foco-jb relative z-10 flex size-9 items-center justify-center rounded-full border bg-white/90 backdrop-blur transition-colors duration-150",
        "pointer-coarse:size-11 motion-reduce:transition-none",
        marcado
          ? "border-jb-400 text-jb-600"
          : "border-graf-200 text-graf-600 hover:border-graf-400 hover:text-graf-900",
        className,
      )}
    >
      {marcado ? <Check className="size-4" aria-hidden /> : <Scale className="size-4" aria-hidden />}
    </button>
  );
}

export function BarraComparar() {
  const { itens, remover, limpar } = useComparador();
  const pathname = usePathname();
  const reduzirMovimento = useReducedMotion() !== false;
  const visivel = itens.length > 0 && !pathname.startsWith("/comparar");

  return (
    <>
      <span className="sr-only" role="status" aria-atomic="true">
        {visivel
          ? `${itens.length} ${itens.length === 1 ? "equipamento selecionado" : "equipamentos selecionados"} para comparação.`
          : ""}
      </span>
      <AnimatePresence initial={false}>
        {visivel ? (
          <ConteudoBarraComparar
            key="selecao-comparacao"
            itens={itens}
            remover={remover}
            limpar={limpar}
            reduzirMovimento={reduzirMovimento}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ConteudoBarraComparar({
  itens,
  remover,
  limpar,
  reduzirMovimento,
}: {
  itens: ItemComparado[];
  remover: Contexto["remover"];
  limpar: Contexto["limpar"];
  reduzirMovimento: boolean;
}) {
  const presente = useIsPresent();
  const lista = useRef<HTMLUListElement>(null);
  const slugsJaVistos = useRef<string[]>([]);

  useEffect(() => {
    // A lista tem uma linha no celular; só ela se move para revelar a seleção.
    // A página e o botão de compra permanecem na mesma posição.
    //
    // Revela quando QUALQUER item novo aparece, não quando o último muda. Um
    // clique em "Comparar" antes de o provedor terminar de ler o
    // localStorage rendia `[B]` e, no render seguinte, `[A, B]`: A entrava na
    // frente, empurrava B para fora da faixa visível, e como o último item
    // continuava sendo B a revelação não rodava de novo. Remover não revela
    // nada — o foco já foi para o vizinho e a lista não deve pular.
    const atuais = itens.map((item) => item.slug);
    const chegouAlguem = atuais.some((slug) => !slugsJaVistos.current.includes(slug));
    slugsJaVistos.current = atuais;
    if (!chegouAlguem) return;
    lista.current?.scrollTo({
      left: lista.current.scrollWidth,
      behavior: reduzirMovimento ? "instant" : "smooth",
    });
  }, [itens, reduzirMovimento]);

  function removerComFoco(slug: string) {
    const botoes = Array.from(
      lista.current?.querySelectorAll<HTMLButtonElement>("button[data-remover-comparacao]") ?? [],
    ).filter((botao) => !botao.closest("[inert]"));
    const indice = botoes.findIndex((botao) => botao.dataset.removerComparacao === slug);
    const proximo = botoes[indice + 1] ?? botoes[indice - 1];
    if (proximo) proximo.focus({ preventScroll: true });
    else focarOrigemDaComparacao(slug);
    remover(slug);
  }

  /* Duas versões desta barra foram escritas em paralelo e colidiram no pull
     de 17/09. Esta é a fusão das duas, não a escolha de uma:

     · da que estava na branch vêm o gancho `data-motion-compare-bar` — que
       `motion-commerce.css` usa para o brilho sob a barra e para desligá-lo
       com movimento reduzido — e a entrada que "assenta", com a leve escala;
     · da que estava na árvore vem todo o resto: a barra como `aside` com
       nome, o anúncio da seleção para leitor de tela, `inert` no que está
       saindo, o foco devolvido ao remover e a lista de uma linha rolável no
       celular.

     A curva é a do sistema. A versão da branch usava uma mola física
     (`stiffness: 460`) que não existe em lugar nenhum dos tokens; a
     intenção dela — assentar com sensação física, sem quicar — é
     exatamente o que `--jb-motion-ease-spring` documenta. */
  return (
    <motion.aside
      data-motion-compare-bar
      aria-label="Equipamentos selecionados para comparar"
      inert={!presente}
      initial={reduzirMovimento ? false : { opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
      transition={{
        duration: reduzirMovimento ? 0 : 0.32,
        /* --jb-motion-ease-spring */
        ease: [0.16, 1, 0.3, 1],
      }}
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 print:hidden"
      style={{ bottom: "calc(1rem + var(--jb-barra-inferior, 0px))" }}
    >
      <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-graf-200 bg-white p-2.5 shadow-pop sm:flex-nowrap">
        <span className="flex flex-1 items-center gap-2 pl-1.5 text-apoio font-bold uppercase tracking-[0.08em] text-graf-500 sm:flex-none">
          <Scale className="size-4 text-jb-600" aria-hidden />
          Comparar
        </span>

        <motion.ul
          ref={lista}
          layoutScroll
          aria-label="Seleção de equipamentos"
          className="relative order-last flex min-w-0 basis-full items-center gap-1.5 overflow-x-auto p-0.5 sm:order-none sm:flex-1 sm:basis-auto sm:flex-wrap"
        >
          <AnimatePresence initial={false}>
            {itens.map((item) => (
              <ItemNaBarra
                key={item.slug}
                item={item}
                remover={removerComFoco}
                reduzirMovimento={reduzirMovimento}
              />
            ))}
          </AnimatePresence>
        </motion.ul>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              focarOrigemDaComparacao(itens[0].slug);
              limpar();
            }}
            className="foco-jb hidden min-h-11 items-center rounded-lg px-2.5 text-apoio font-semibold text-graf-500 transition-colors hover:bg-graf-50 hover:text-graf-800 motion-reduce:transition-none sm:inline-flex"
          >
            Limpar
          </button>
          <Link
            href={hrefDaComparacao(itens)}
            className={cn(
              "foco-jb inline-flex min-h-11 items-center rounded-lg px-4 text-[0.875rem] font-bold transition-colors duration-150 motion-reduce:transition-none",
              itens.length < 2
                ? "bg-graf-100 text-graf-500"
                : "bg-jb-500 text-white hover:bg-jb-600",
            )}
            aria-disabled={itens.length < 2}
            onClick={(evento) => {
              if (itens.length < 2) evento.preventDefault();
            }}
          >
            {itens.length < 2 ? "Escolha mais um" : `Comparar ${itens.length}`}
          </Link>
        </div>
      </div>
    </motion.aside>
  );
}

function ItemNaBarra({
  item,
  remover,
  reduzirMovimento,
}: {
  item: ItemComparado;
  remover: Contexto["remover"];
  reduzirMovimento: boolean;
}) {
  const presente = useIsPresent();

  return (
    <motion.li
      layout={reduzirMovimento ? false : "position"}
      inert={!presente}
      initial={reduzirMovimento ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduzirMovimento ? 0 : -4 }}
      /* --jb-motion-ease */
      transition={{ duration: reduzirMovimento ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="shrink-0"
    >
      <span className="flex max-w-56 items-center gap-1 rounded-full border border-graf-200 bg-graf-50 py-1 pl-3 pr-1 text-apoio font-semibold text-graf-800">
        <span className="truncate">{item.nome}</span>
        <button
          type="button"
          data-remover-comparacao={item.slug}
          onClick={() => remover(item.slug)}
          aria-label={`Tirar ${item.nome} da comparação`}
          className="foco-jb flex size-6 shrink-0 items-center justify-center rounded-full text-graf-500 transition-colors hover:bg-graf-200 hover:text-graf-900 motion-reduce:transition-none pointer-coarse:size-11"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </span>
    </motion.li>
  );
}

function focarOrigemDaComparacao(slug: string) {
  const candidatos = Array.from(
    document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(
      'button[data-comparar-slug], a[href="/comparar"]',
    ),
  ).filter((elemento) => elemento.getClientRects().length > 0);
  const origem = candidatos.find((elemento) => elemento.dataset.compararSlug === slug)
    ?? candidatos.find((elemento) => elemento instanceof HTMLAnchorElement);
  origem?.focus({ preventScroll: true });
}
