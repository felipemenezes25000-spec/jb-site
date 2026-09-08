import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";

import { sessaoCliente } from "@/lib/auth-cliente";
import { contarItensDoCarrinho } from "@/lib/carrinho";
import { cn } from "@/lib/utils";

/* ============================================================================
   As duas peças do cabeçalho que dependem de quem está do outro lado

   Antes, o layout da loja lia sessão e carrinho no mesmo `Promise.all` das
   configurações e das categorias. Uma consequência: a página inteira ficava
   dinâmica, porque duas das quatro leituras dependem de cookie. Logo, nenhuma
   página pública tinha casca estática — nem a home, nem a ficha de um
   equipamento, nem o institucional.

   Aqui essas duas leituras viram componentes de servidor próprios, cada um
   dentro do seu `<Suspense>`. O resto do cabeçalho — logo, busca, menu,
   categorias, telefone — é prerenderizado e chega imediatamente; o contador e
   a saudação transmitem depois.

   O ponto que faz isso ser seguro: **nada aqui é cacheado**. Um contador de
   carrinho ou um nome de cliente guardado em cache compartilhado apareceria
   para outra pessoa. Estes componentes leem cookie a cada requisição, de
   propósito, e é justamente por isso que precisam ficar fora do escopo
   cacheado — ver `@/lib/loja-publica`, que é o lado oposto desta moeda.

   Os fallbacks têm a MESMA caixa do conteúdo final. Se o esqueleto medisse
   diferente, o cabeçalho pularia quando os dados chegassem, e o ganho de
   percepção viraria deslocamento de layout.
   ============================================================================ */

/* --------------------------------------------------------- área da clínica */

/**
 * O tom do cromo em que estas peças estão montadas.
 *
 * `"claro"` é o cabeçalho branco do site; `"escuro"` é o cromo preto da
 * vitrine. Não é decoração: no fundo preto a moldura clara some e o texto
 * grafite fica ilegível, então cada tom tem a sua própria caixa e o seu
 * próprio contraste — em vez de uma variante depender de sobrescrita de CSS.
 */
export type TomDoCromo = "claro" | "escuro";

const CAIXA_CONTA: Record<TomDoCromo, string> = {
  claro: cn(
    "flex h-11 items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-graf-100",
    "lg:border lg:border-graf-300 lg:bg-white lg:px-3 lg:shadow-xs",
    "lg:hover:border-graf-400 lg:hover:bg-graf-50",
  ),
  escuro: cn(
    "flex h-11 items-center gap-2.5 rounded-xs px-2 transition-colors hover:bg-white/10",
    "lg:border lg:border-chrome-line lg:px-3",
  ),
};

const AVATAR: Record<TomDoCromo, string> = {
  claro: cn(
    "flex size-7 shrink-0 items-center justify-center rounded-full",
    "bg-graf-100 text-graf-700 lg:bg-jb-50 lg:text-jb-600",
  ),
  escuro: "flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white",
};

const SAUDACAO: Record<TomDoCromo, string> = {
  claro: "block truncate text-xs font-medium text-graf-500",
  escuro: "block truncate text-[0.6875rem] font-medium text-white/55",
};

const NOME_DA_AREA: Record<TomDoCromo, string> = {
  claro: "block text-sm font-bold text-graf-900",
  escuro: "block text-[0.8125rem] font-bold text-white",
};

/**
 * O acesso à Área da Clínica, com a saudação de quem está logado.
 *
 * Sessão e saudação são coisas diferentes: um cadastro com o nome em branco
 * continua logado, só não tem por quem ser chamado.
 */
export async function AcessoDaConta({ tom = "claro" }: { tom?: TomDoCromo }) {
  const cliente = await sessaoCliente();
  const primeiroNome = cliente?.name?.trim().split(/\s+/)[0] ?? "";
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}` : "Entrar";

  return (
    <Link
      href={cliente ? "/minha-jb" : "/entrar"}
      aria-label={
        cliente
          ? "Área da Clínica — área da clínica"
          : "Entrar na Área da Clínica — área da clínica"
      }
      className={CAIXA_CONTA[tom]}
    >
      <span aria-hidden className={AVATAR[tom]}>
        <User className="size-4" />
      </span>
      <span className="hidden max-w-36 text-left leading-tight lg:block">
        <span className={SAUDACAO[tom]}>{saudacao}</span>
        <span className={NOME_DA_AREA[tom]}>Área da Clínica</span>
      </span>
    </Link>
  );
}

/**
 * Esqueleto do acesso à conta.
 *
 * Mostra o link já funcionando, apontando para `/entrar`: quem clica antes de
 * a sessão ser lida chega numa tela que redireciona sozinha se já houver
 * sessão. O que falta é só a saudação — e é ela que fica com o traço.
 */
export function AcessoDaContaEsqueleto({ tom = "claro" }: { tom?: TomDoCromo }) {
  return (
    <Link href="/entrar" aria-label="Área da Clínica" className={CAIXA_CONTA[tom]}>
      <span aria-hidden className={AVATAR[tom]}>
        <User className="size-4" />
      </span>
      <span className="hidden max-w-36 text-left leading-tight lg:block">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 block h-3 w-14 rounded",
            tom === "escuro" ? "bg-white/15" : "bg-graf-200",
          )}
        />
        <span className={cn("mt-1", NOME_DA_AREA[tom])}>Área da Clínica</span>
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- carrinho */

const CAIXA_CARRINHO: Record<TomDoCromo, string> = {
  claro:
    "relative flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100",
  escuro:
    "relative flex size-11 items-center justify-center rounded-xs text-white/85 transition-colors hover:bg-white/10 hover:text-white",
};

export async function ContadorDoCarrinho({ tom = "claro" }: { tom?: TomDoCromo }) {
  const itens = await contarItensDoCarrinho();

  return (
    <Link
      href="/carrinho"
      aria-label={
        itens === 0
          ? "Carrinho — nenhum item"
          : `Carrinho com ${itens} ${itens === 1 ? "item" : "itens"}`
      }
      className={CAIXA_CARRINHO[tom]}
    >
      <ShoppingCart className="size-5" aria-hidden />
      {itens > 0 ? (
        <span
          aria-hidden
          className={cn(
            "tabular absolute right-0.5 top-1 flex h-5 min-w-5 items-center justify-center",
            "rounded-full bg-jb-500 px-1.5 text-[0.75rem] font-bold leading-none text-white ring-2",
            tom === "escuro" ? "ring-chrome" : "ring-white",
          )}
        >
          {itens > 99 ? "99+" : itens}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Esqueleto do carrinho: o ícone, sem o número.
 *
 * Sem selo nenhum, e não um selo com "0" — enquanto a contagem não chegou, a
 * verdade é "ainda não sei", e mostrar zero seria afirmar carrinho vazio para
 * quem pode ter três itens dentro.
 */
export function ContadorDoCarrinhoEsqueleto({ tom = "claro" }: { tom?: TomDoCromo }) {
  return (
    <Link href="/carrinho" aria-label="Carrinho" className={CAIXA_CARRINHO[tom]}>
      <ShoppingCart className="size-5" aria-hidden />
    </Link>
  );
}
