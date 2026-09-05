import Link from "next/link";
import {
  ArrowRight,
  Headset,
  LayoutGrid,
  MessageCircle,
  Phone,
  Recycle,
  UserRound,
} from "lucide-react";

import { BuscaHero } from "@/components/loja/busca-hero";
import { LinkBotao } from "@/components/ui/button";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

/* ============================================================================
   Miolo da página de endereço morto

   O mesmo conteúdo serve dois lugares com molduras diferentes:

     · dentro da loja (`(loja)/not-found.tsx`), onde o cabeçalho e o rodapé da
       loja já estão na tela e o 404 entra só como conteúdo;
     · fora dela (`app/not-found.tsx`), para endereço que nem chega a cair num
       grupo de rotas — ali a página traz a própria marca e o próprio rodapé.

   Quem chegou num link morto precisa de saída, não de desculpa: busca,
   caminhos prováveis e um canal direto com a equipe.
   ============================================================================ */

const ATALHOS = [
  {
    href: "/loja",
    icone: LayoutGrid,
    titulo: "Catálogo completo",
    texto: "Equipamentos novos, peças e acessórios.",
  },
  {
    href: "/seminovos",
    icone: Recycle,
    titulo: "Seminovos JB",
    texto: "Unidades revisadas, com checklist e fotos reais.",
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
    texto: "Pedidos, chamados, garantias e documentos.",
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
  const whatsapp = whatsappHref(s.whatsapp, "Olá! Não encontrei uma página no site da JB.");

  return (
    <>
      <p className="label-mono text-jb-600">Erro 404</p>
      <h1 className="mt-3 max-w-2xl text-display leading-tight">
        Esta página não existe — ou mudou de endereço.
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-graf-600">
        O link pode estar velho, o produto pode ter saído do catálogo ou o endereço veio com
        um erro de digitação. Procure pelo que você precisa:
      </p>

      <div className="mt-8 max-w-xl">
        <BuscaHero />
      </div>

      <h2 className="mt-14 text-xs font-bold uppercase tracking-wider text-graf-500">
        Caminhos mais procurados
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ATALHOS.map((atalho) => (
          <li key={atalho.href}>
            <Link
              href={atalho.href}
              className="flex h-full flex-col rounded-xl border border-graf-200 bg-white p-5 shadow-card transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100">
                <atalho.icone className="size-4.5" aria-hidden />
              </span>
              <span className="mt-4 text-base font-bold text-graf-950">{atalho.titulo}</span>
              <span className="mt-1 text-sm leading-relaxed text-graf-600">{atalho.texto}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-jb-700">
                Ir para lá
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12 rounded-2xl border border-graf-200 bg-white px-6 py-7 shadow-card sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
          <div className="max-w-lg">
            <h2 className="text-xl font-bold text-graf-950">Prefere falar com alguém?</h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">
              {s.horario
                ? `A equipe da JB atende ${s.horario.charAt(0).toLowerCase()}${s.horario.slice(1)}.`
                : "A equipe da JB responde pelos canais abaixo."}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {s.telefone ? (
              <a
                href={telHref(s.telefone)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-jb-500 px-5 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-jb-700"
              >
                <Phone className="size-4" aria-hidden />
                {formatarTelefone(s.telefone)}
              </a>
            ) : null}

            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-graf-300 bg-white px-5 text-[0.9375rem] font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            ) : null}

            <LinkBotao href="/contato" variante="secundario">
              Enviar mensagem
            </LinkBotao>
          </div>
        </div>
      </section>

      {mostrarVoltar ? (
        <p className="mt-10">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-graf-700 underline underline-offset-4 transition-colors hover:text-jb-700"
          >
            Voltar para a página inicial
          </Link>
        </p>
      ) : null}
    </>
  );
}
