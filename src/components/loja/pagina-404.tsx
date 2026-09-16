import Link from "next/link";
import { ArrowRight, Headset, LayoutGrid, Recycle, UserRound } from "lucide-react";

import { FaixaDeContato } from "@/components/institucional/canais";
import { BuscaHero } from "@/components/loja/busca-hero";
import type { SettingsMap } from "@/lib/settings";

const ATALHOS = [
  {
    href: "/loja",
    icone: LayoutGrid,
    titulo: "Catálogo completo",
    texto: "Produtos, peças e acessórios organizados por categoria.",
  },
  {
    href: "/seminovos",
    icone: Recycle,
    titulo: "Seminovos JB",
    texto: "Produtos seminovos disponíveis para compra.",
  },
  {
    href: "/assistencia-tecnica/solicitar",
    icone: Headset,
    titulo: "Solicitar assistência",
    texto: "Abra um chamado para o equipamento que precisa de suporte técnico.",
  },
  {
    href: "/minha-jb",
    icone: UserRound,
    titulo: "Área da Clínica",
    texto: "Pedidos, chamados, produtos e documentos em um só lugar.",
  },
] as const;

export function Conteudo404({
  configuracoes: s,
  mostrarVoltar = true,
}: {
  configuracoes: SettingsMap;
  mostrarVoltar?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl min-w-0">
      <p className="sobretitulo">Erro 404</p>
      <h1 className="text-display texto-forte mt-3 max-w-2xl text-balance">
        Esta página não existe — ou mudou de endereço.
      </h1>
      <p className="texto-guia texto-suave mt-5 max-w-xl">
        O link pode estar antigo, o produto pode ter saído do catálogo ou o endereço pode ter sido
        digitado errado. Use a busca ou escolha um dos caminhos abaixo.
      </p>

      <div className="mt-8 max-w-xl">
        <BuscaHero />
      </div>

      <h2 className="mt-12 text-apoio font-bold text-graf-950 sm:mt-14">
        Caminhos mais procurados
      </h2>
      <ul className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        {ATALHOS.map((atalho) => (
          <li key={atalho.href} className="min-w-0">
            <Link
              href={atalho.href}
              className="group flex h-full min-h-24 min-w-0 items-start gap-3.5 rounded-xl border border-graf-200 bg-white p-4 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 sm:p-5"
            >
              <atalho.icone className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2 text-base font-bold text-graf-950">
                  <span className="min-w-0">{atalho.titulo}</span>
                  <ArrowRight className="size-4 shrink-0 text-jb-600 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-graf-600">{atalho.texto}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <FaixaDeContato s={s} className="mt-10 sm:mt-12" />

      {mostrarVoltar ? (
        <p className="mt-8 sm:mt-10">
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
