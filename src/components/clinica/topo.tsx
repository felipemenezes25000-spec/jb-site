import Link from "next/link";
import { Bell, LogOut, Store } from "lucide-react";

import { Logo } from "@/components/ui/logo";
import { telHref, whatsappHref } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Topo da Área da Clínica

   A área do cliente deixou de usar o cabeçalho da loja. O motivo é de produto,
   não de estética: quem entrou já comprou. Busca de catálogo, mega menu de
   categorias, carrinho e o botão de pedir assistência são a barra de quem está
   escolhendo o que comprar — dentro da área, eles competem com o trabalho da
   clínica e fazem a ferramenta parecer uma página do site.

   O que fica aqui é o que a área precisa: a marca, o nome da área, o aviso do
   que mudou, a identidade de quem está logado, a saída da conta e a volta para
   a loja. Uma linha, 64px, sem sombra — a casca não disputa com o conteúdo.

   É Server Component de propósito: nada aqui tem estado. O menu de navegação,
   que tem (a gaveta do celular), é outro componente.
   ============================================================================ */

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "JB";
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

export function TopoClinica({
  nome,
  email,
  naoLidas,
  sair,
}: {
  nome: string;
  email: string;
  /** Avisos ainda não lidos. Zero não desenha marcador nenhum. */
  naoLidas: number;
  /** Formulário de sair, montado no servidor — a ação é uma Server Action. */
  sair: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-100 focus:rounded-lg focus:bg-graf-950 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-50 border-b border-graf-200 bg-white/95 backdrop-blur">
        <div className="container-jb flex h-16 items-center gap-3 sm:gap-4">
          <Link
            href="/minha-jb"
            aria-label="Área da Clínica — visão geral"
            className="flex min-h-11 shrink-0 items-center rounded-sm"
          >
            <Logo altura={30} />
          </Link>

          <span aria-hidden className="hidden h-6 w-px bg-graf-200 sm:block" />

          <p className="hidden min-w-0 sm:block">
            <span className="block truncate text-[0.9375rem] font-bold leading-tight text-graf-950">
              Área da Clínica
            </span>
          </p>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/loja"
              className="hidden h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-graf-700 transition-colors hover:bg-graf-100 hover:text-graf-950 md:inline-flex"
            >
              <Store className="size-4 shrink-0" aria-hidden />
              Ir para a loja
            </Link>

            <Link
              href="/loja"
              aria-label="Ir para a loja"
              className="flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100 md:hidden"
            >
              <Store className="size-5" aria-hidden />
            </Link>

            {/* O sino leva ao bloco de avisos do painel: é onde eles moram de
                verdade. Um painel flutuante duplicaria a mesma lista em dois
                lugares e obrigaria a área inteira a virar componente de
                cliente por causa de um contador. */}
            <Link
              href="/minha-jb#avisos"
              aria-label={
                naoLidas > 0
                  ? `Avisos — ${naoLidas} ${naoLidas === 1 ? "não lido" : "não lidos"}`
                  : "Avisos"
              }
              className="relative flex size-11 items-center justify-center rounded-lg text-graf-700 transition-colors hover:bg-graf-100"
            >
              <Bell className="size-5" aria-hidden />
              {naoLidas > 0 ? (
                <span
                  aria-hidden
                  className="tabular absolute right-1 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-jb-500 px-1.5 text-[0.75rem] font-bold leading-none text-white ring-2 ring-white"
                >
                  {naoLidas > 99 ? "99+" : naoLidas}
                </span>
              ) : null}
            </Link>

            <span aria-hidden className="mx-1 hidden h-6 w-px bg-graf-200 lg:block" />

            <Link
              href="/minha-jb/perfil"
              className={cn(
                "flex h-11 items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-graf-100",
                "lg:pr-3",
              )}
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-graf-950 text-xs font-bold tracking-wide text-white"
              >
                {iniciais(nome)}
              </span>
              <span className="hidden max-w-44 text-left leading-tight lg:block">
                <span className="block truncate text-sm font-bold text-graf-950">
                  {nome || "Minha conta"}
                </span>
                <span className="block truncate text-xs text-graf-500">{email}</span>
              </span>
              <span className="sr-only">Meus dados</span>
            </Link>

            {sair}
          </div>
        </div>
      </header>
    </>
  );
}

/**
 * O botão de sair do topo. Só o ícone — o rótulo por extenso vive no menu
 * lateral, que é a saída que a pessoa encontra procurando.
 *
 * O nome acessível é deliberadamente diferente do "Sair da conta" do menu: dois
 * controles com o MESMO nome acessível na mesma tela são ambíguos para quem
 * navega por voz ou por lista de elementos — e quebram qualquer seletor por
 * papel e nome, inclusive os da suíte de ponta a ponta.
 */
export function BotaoSairTopo() {
  return (
    <button
      type="submit"
      aria-label="Sair da Área da Clínica"
      title="Sair da Área da Clínica"
      className="flex size-11 items-center justify-center rounded-lg text-graf-600 transition-colors hover:bg-graf-100 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <LogOut className="size-5" aria-hidden />
    </button>
  );
}

/**
 * Rodapé da área — três linhas, não as cinco colunas da loja.
 *
 * Dentro de uma ferramenta de trabalho, o rodapé da loja (catálogo inteiro,
 * assistência, institucional, políticas e redes) empurra o conteúdo para cima
 * e some com a sensação de aplicação. Aqui sobra o que a clínica pode precisar
 * enquanto trabalha: como falar com a JB, a volta para a loja e as políticas.
 */
export function RodapeClinica({
  telefone,
  whatsapp,
}: {
  telefone: string;
  whatsapp: string;
}) {
  return (
    <footer className="mt-auto border-t border-graf-200 bg-white">
      <div className="container-jb flex flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-graf-500">
          JB Soluções Odontológicas · Área da Clínica
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {telefone ? (
            <a
              href={telHref(telefone)}
              className="inline-flex min-h-11 items-center font-semibold text-graf-700 transition-colors hover:text-jb-700"
            >
              {telefone}
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsappHref(whatsapp, "Olá! Sou cliente da JB e vim pela Área da Clínica.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-semibold text-graf-700 transition-colors hover:text-jb-700"
            >
              WhatsApp
            </a>
          ) : null}
          <Link
            href="/privacidade"
            className="inline-flex min-h-11 items-center text-graf-500 transition-colors hover:text-graf-800"
          >
            Privacidade
          </Link>
          <Link
            href="/termos"
            className="inline-flex min-h-11 items-center text-graf-500 transition-colors hover:text-graf-800"
          >
            Termos
          </Link>
        </div>
      </div>
    </footer>
  );
}
