import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, MessageCircle, Phone, ScrollText, Timer } from "lucide-react";

import { FormularioOrcamento } from "@/components/assistencia/formulario-orcamento";
import type { TipoPedido } from "@/components/assistencia/rotulos";
import { Cartao, Trilha } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { telHref, whatsappHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/**
 * Pedido de orçamento geral.
 *
 * Serve às três portas de entrada da JB: comprar equipamento, contratar
 * serviço e falar sobre plano de manutenção. O tipo pode vir na URL
 * (`?tipo=servico`) e o primeiro item também (`?item=Instalação`), que é como
 * as páginas de serviço mandam a pessoa para cá já com a linha preenchida.
 *
 * A página não mostra preço nenhum: quem precifica é a equipe, sobre o Quote
 * em rascunho que este formulário cria.
 */

const CAMINHO = "/orcamento";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Pedir orçamento" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Pedir orçamento",
  descricao:
    "Descreva o que a sua clínica precisa — equipamento, serviço técnico ou plano de manutenção — e receba uma proposta da equipe da JB.",
  caminho: CAMINHO,
});

const TIPOS: TipoPedido[] = ["compra", "servico", "plano"];

export default async function OrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; item?: string }>;
}) {
  const [parametros, s, cliente] = await Promise.all([
    searchParams,
    getSettings(),
    sessaoCliente(),
  ]);

  const dadosDoCliente = cliente
    ? await prisma.customer.findUnique({
        where: { id: cliente.id },
        select: { name: true, email: true, phone: true },
      })
    : null;

  const tipoInicial = TIPOS.includes(parametros.tipo as TipoPedido)
    ? (parametros.tipo as TipoPedido)
    : "compra";

  const itemInicial = (parametros.item ?? "").trim().slice(0, 120);

  const whatsapp = whatsappHref(
    s.whatsapp,
    "Olá! Quero um orçamento para a minha clínica.",
  );

  return (
    <div className="container-jb py-8 lg:py-12">
      <JsonLd dados={trilhaJsonLd(TRILHA)} />
      <Trilha itens={TRILHA} className="mb-6" />

      <header className="max-w-2xl">
        <h1 className="text-display leading-tight">Pedir orçamento</h1>
        <p className="mt-4 text-base leading-relaxed text-graf-600">
          Conte o que a clínica precisa. A equipe da JB monta a proposta com os itens
          separados — equipamento, serviço e deslocamento — para você ver de onde vem cada
          número antes de decidir.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <Cartao className="p-6 lg:p-8">
          <FormularioOrcamento
            /* Carimbado no servidor para não divergir na hidratação. */
            inicio={Date.now()}
            cliente={
              dadosDoCliente
                ? {
                    nome: dadosDoCliente.name,
                    email: dadosDoCliente.email,
                    telefone: dadosDoCliente.phone,
                  }
                : null
            }
            telefone={s.telefone}
            tipoInicial={tipoInicial}
            itemInicial={itemInicial}
          />
        </Cartao>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Cartao className="p-5">
            <h2 className="text-sm font-bold text-graf-950">O que acontece depois</h2>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                {
                  icone: ScrollText,
                  texto:
                    "Seu pedido vira uma proposta numerada no sistema da JB, ainda em rascunho.",
                },
                {
                  icone: Timer,
                  texto:
                    "A equipe comercial confere disponibilidade e prazo antes de precificar.",
                },
                {
                  icone: FileCheck2,
                  texto:
                    "Você recebe a proposta com item a item detalhado e um prazo de validade claro.",
                },
              ].map((passo, indice) => (
                <li key={passo.texto} className="flex gap-3">
                  <passo.icone className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                  <span className="leading-relaxed text-graf-600">
                    <span className="sr-only">Passo {indice + 1}: </span>
                    {passo.texto}
                  </span>
                </li>
              ))}
            </ol>
          </Cartao>

          <Cartao className="p-5">
            <h2 className="text-sm font-bold text-graf-950">Equipamento com defeito?</h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">
              Para conserto, o caminho certo é o chamado de assistência: ele já nasce com
              número e linha do tempo, e o orçamento sai depois do diagnóstico.
            </p>
            <Link
              href="/assistencia-tecnica/solicitar"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
            >
              Abrir chamado técnico
            </Link>
          </Cartao>

          <Cartao className="p-5">
            <h2 className="text-sm font-bold text-graf-950">Prefere conversar?</h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">{s.horario}</p>
            <div className="mt-4 space-y-3 text-sm">
              {s.telefone ? (
                <a
                  href={telHref(s.telefone)}
                  className="flex min-h-11 items-center gap-3 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <Phone className="size-4 shrink-0 text-jb-600" aria-hidden />
                  {s.telefone}
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-3 font-semibold text-graf-900 hover:text-jb-700"
                >
                  <MessageCircle className="size-4 shrink-0 text-jb-600" aria-hidden />
                  {s.whatsapp}
                </a>
              ) : null}
            </div>
          </Cartao>
        </aside>
      </div>
    </div>
  );
}
