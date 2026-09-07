"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Scale, X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Seleção de comparação

   O comparador já existia e é bom: /comparar lê `?p=slug&p=slug`, não
   transforma ausência de dado em zero e explica por que indica um ou outro. O
   que faltava era o caminho até ele. Para comparar dois equipamentos era
   preciso abrir /comparar e procurar os dois numa lista — ou seja, decorar o
   nome de dois equipamentos que a pessoa acabou de ver em outra página.

   Agora a seleção acompanha a navegação: marca-se no cartão da vitrine ou na
   página do equipamento, e uma barra fixa mostra o que está selecionado e leva
   para a comparação. A URL continua sendo a fonte da verdade em /comparar —
   isto aqui só a monta.

   POR QUE `localStorage` E NÃO O BANCO

   Comparar é decisão de sessão de navegação, não é dado da clínica: quem
   compara três autoclaves numa terça não quer encontrar essa lista de volta em
   outro computador na semana seguinte. Favorito é que é dado da clínica, e
   favorito continua no banco, com conta. Aqui não há nada a sincronizar, não
   há PII e não há motivo para uma escrita no servidor a cada clique.

   O acesso é embrulhado em `try` porque `localStorage` lança em navegação
   privada de alguns navegadores e em iframe com cookies bloqueados. Falhar ali
   não pode derrubar a vitrine: sem armazenamento, a seleção vale só enquanto a
   aba estiver aberta.
   ============================================================================ */

const CHAVE = "jb:comparar";

/** O mesmo teto de /comparar. Acima disto a tabela não cabe no celular. */
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
    /* sem armazenamento a seleção vive só nesta aba — e isso é aceitável */
  }
}

export function ComparadorProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ItemComparado[]>([]);
  /* `pronto` evita o pisca-pisca de hidratação: o servidor não conhece a
     seleção, então o botão só muda de estado depois da primeira leitura. */
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setItens(ler());
    setPronto(true);
  }, []);

  /* Duas abas abertas na mesma loja compartilham a seleção. Sem isto, marcar
     numa aba e comparar na outra levaria à lista antiga. */
  useEffect(() => {
    function aoMudar(evento: StorageEvent) {
      if (evento.key === CHAVE) setItens(ler());
    }
    window.addEventListener("storage", aoMudar);
    return () => window.removeEventListener("storage", aoMudar);
  }, []);

  /**
   * Toda alteração é função do estado anterior, nunca de uma cópia capturada
   * no render. Dois cliques no mesmo quadro — marcar dois cartões seguidos —
   * calculavam ambos a partir da mesma lista antiga, e o segundo apagava o
   * primeiro. Com o atualizador, o segundo enxerga o resultado do primeiro.
   *
   * A gravação acontece dentro do atualizador porque é ali que a lista final
   * existe. É efeito colateral em `setState`, e é deliberado: `localStorage`
   * não é estado do React, é o mesmo dado escrito no lugar onde ele sobrevive
   * ao recarregamento.
   */
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
          // no teto, o mais antigo sai — recusar em silêncio parece defeito
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

/**
 * Fora do provedor devolve uma seleção vazia e inerte em vez de lançar. O
 * cartão de produto aparece em página de erro e em pré-visualização do admin,
 * onde a casca da loja não existe — e ali ele deve renderizar sem comparação,
 * não quebrar a página inteira.
 */
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

/* ========================================================== botão de marcar */

export function BotaoComparar({
  slug,
  nome,
  forma = "icone",
  className,
}: {
  slug: string;
  nome: string;
  /** `icone` para o canto do cartão; `linha` para a coluna de compra. */
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
        onClick={() => alternar({ slug, nome })}
        aria-pressed={marcado}
        className={cn(
          "foco-jb inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-[0.875rem] font-semibold transition-colors duration-150",
          marcado
            ? "border-jb-300 bg-jb-50 text-jb-700"
            : "border-graf-300 text-graf-800 hover:border-graf-450 hover:bg-graf-50",
          className,
        )}
      >
        <Scale className="size-4 shrink-0" aria-hidden />
        {marcado ? "Na comparação" : "Comparar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(evento) => {
        /* O cartão inteiro é um link (pseudo-elemento sobre a área). Sem parar
           a propagação, marcar para comparar abriria o equipamento. */
        evento.preventDefault();
        evento.stopPropagation();
        alternar({ slug, nome });
      }}
      aria-pressed={marcado}
      aria-label={`${rotulo}: ${nome}`}
      title={rotulo}
      className={cn(
        /* 36px no ponteiro fino, 44px no dedo: o alvo mínimo da WCAG 2.2
           (2.5.8) vale para toque, e no desktop um botão de 44px sobre a foto
           do equipamento vira um segundo protagonista no cartão. */
        "foco-jb relative z-10 flex size-9 items-center justify-center rounded-full border bg-white/90 backdrop-blur transition-colors duration-150",
        "pointer-coarse:size-11",
        marcado
          ? "border-jb-400 text-jb-600"
          : "border-graf-200 text-graf-600 hover:border-graf-400 hover:text-graf-900",
        className,
      )}
    >
      <Scale className="size-4" aria-hidden />
    </button>
  );
}

/* ============================================================ barra fixa */

/**
 * Barra da seleção.
 *
 * Fica fora da página de comparação (lá a seleção já está na tela) e some
 * quando não há nada marcado. O `bottom` respeita `--jb-barra-inferior`, que a
 * barra de compra do celular publica quando existe — duas barras fixas
 * empilhadas no mesmo lugar escondem uma à outra.
 */
export function BarraComparar() {
  const { itens, remover, limpar } = useComparador();
  const pathname = usePathname();

  if (itens.length === 0 || pathname.startsWith("/comparar")) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "calc(1rem + var(--jb-barra-inferior, 0px))" }}
    >
      <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-graf-200 bg-white p-2.5 shadow-pop sm:flex-nowrap">
        <span className="flex shrink-0 items-center gap-2 pl-1.5 text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500">
          <Scale className="size-4 text-jb-600" aria-hidden />
          Comparar
        </span>

        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {itens.map((item) => (
            <li key={item.slug}>
              <span className="flex max-w-56 items-center gap-1 rounded-full border border-graf-200 bg-graf-50 py-1 pl-3 pr-1 text-[0.8125rem] font-semibold text-graf-800">
                <span className="truncate">{item.nome}</span>
                <button
                  type="button"
                  onClick={() => remover(item.slug)}
                  aria-label={`Tirar ${item.nome} da comparação`}
                  className="foco-jb flex size-6 shrink-0 items-center justify-center rounded-full text-graf-500 transition-colors hover:bg-graf-200 hover:text-graf-900"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={limpar}
            className="foco-jb hidden min-h-9 items-center rounded-lg px-2.5 text-[0.8125rem] font-semibold text-graf-500 transition-colors hover:bg-graf-50 hover:text-graf-800 sm:inline-flex"
          >
            Limpar
          </button>
          <Link
            href={hrefDaComparacao(itens)}
            className={cn(
              "foco-jb inline-flex min-h-10 items-center rounded-lg px-4 text-[0.875rem] font-bold transition-colors duration-150",
              itens.length < 2
                ? "bg-graf-100 text-graf-500"
                : "bg-jb-500 text-white hover:bg-jb-600",
            )}
            aria-disabled={itens.length < 2}
            onClick={(evento) => {
              // com um item só não há comparação: o clique não leva a lugar nenhum
              if (itens.length < 2) evento.preventDefault();
            }}
          >
            {itens.length < 2 ? "Escolha mais um" : `Comparar ${itens.length}`}
          </Link>
        </div>
      </div>
    </div>
  );
}
