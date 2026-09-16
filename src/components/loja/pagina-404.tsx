import Link from "next/link";
import { ArrowRight, Headset, LayoutGrid, Recycle, UserRound } from "lucide-react";

import { FaixaDeContato } from "@/components/institucional/canais";
import { BuscaHero } from "@/components/loja/busca-hero";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Miolo da página de endereço morto

   O mesmo conteúdo serve dois lugares com molduras diferentes:

     · dentro da loja (`(loja)/not-found.tsx`), onde o cabeçalho e o rodapé da
       loja já estão na tela e o 404 entra só como conteúdo;
     · fora dela (`app/not-found.tsx`), para endereço que nem chega a cair num
       grupo de rotas — ali a página traz a própria marca e o próprio rodapé.

   Quem chegou num link morto precisa de saída, não de desculpa: busca,
   caminhos prováveis e um canal direto com a equipe. O fim da página usa a
   mesma faixa de contato das páginas institucionais, em vez de um bloco
   próprio — telefone e WhatsApp continuam saindo das configurações.
   ============================================================================ */

const ATALHOS = [
  {
    href: "/loja",
    icone: LayoutGrid,
    titulo: "Catálogo completo",
    texto: "Equipamentos, peças e acessórios por categoria.",
  },
  {
    href: "/seminovos",
    icone: Recycle,
    titulo: "Seminovos JB",
    texto: "Equipamentos seminovos disponíveis.",
  },
  {
    href: "/assistencia-tecnica/solicitar",
    icone: Headset,
    titulo: "Solicitar assistência",
    texto: "Abra um chamado para o equipamento parado.",
  },
  {
    href: "/minha-jb",
    icone: UserRound,
    titulo: "Área da Clínica",
    texto: "Pedidos, chamados, equipamentos e documentos.",
  },
];

export function Conteudo404({
  configuracoes: s,
  mostrarVoltar = true,
}: {
  configuracoes: SettingsMap;
  /** O link para a home é redundante quando o cabeçalho da loja está na tela. */
  mostrarVoltar?: boolean;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="sobretitulo">Erro 404</p>
      <h1 className="text-display texto-forte mt-3 max-w-2xl">
        Esta página não existe — ou mudou de endereço.
      </h1>
      <p className="texto-guia texto-suave mt-5 max-w-xl">
        O link pode estar velho, o produto pode ter saído do catálogo ou o endereço veio com
        um erro de digitação. Procure pelo que você precisa:
      </p>

      <div className="mt-8 max-w-xl">
        <BuscaHero />
      </div>

      <h2 className="mt-14 text-[0.8125rem] font-bold text-graf-950">
        Caminhos mais procurados
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {ATALHOS.map((atalho) => (
          <li key={atalho.href}>
            <Link
              href={atalho.href}
              className="group flex h-full items-start gap-3.5 rounded-xl border border-graf-200 bg-white p-5 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <atalho.icone className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-base font-bold text-graf-950">
                  {atalho.titulo}
                  <ArrowRight
                    className="size-4 text-jb-600 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-graf-600">
                  {atalho.texto}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <FaixaDeContato s={s} className="mt-12" />

      {mostrarVoltar ? (
        <p className="mt-10">
          <Link
            href="/"
            className="foco-jb inline-flex min-h-11 items-center rounded-xs text-sm font-semibold text-graf-700 underline underline-offset-4 transition-colors hover:text-jb-700"
          >
            Voltar para a página inicial
          </Link>
        </p>
      ) : null}
    </div>
  );
}
