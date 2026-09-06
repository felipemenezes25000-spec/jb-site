import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, ScrollText, Timer } from "lucide-react";

import {
  CabecalhoAssistencia,
  CanaisDiretos,
  CartaoApoio,
  ListaDeApoio,
} from "@/components/assistencia/apoio";
import { FormularioOrcamento } from "@/components/assistencia/formulario-orcamento";
import type { TipoPedido } from "@/components/assistencia/rotulos";
import { Cartao, Trilha } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

/**
 * Pedido de orçamento geral.
 *
 * Serve às três portas de entrada da JB: comprar equipamento, contratar
 * serviço e falar sobre plano de manutenção. O tipo pode vir na URL
 * (`?tipo=servico`) e o primeiro item também (`?item=Instalação`), que é como
 * as páginas de serviço mandam a pessoa para cá já com a linha preenchida.
 *
 * A página não mostra preço nenhum: quem precifica é a equipe, sobre a
 * proposta em rascunho que este formulário cria.
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

/** O caminho da proposta, do envio à resposta. */
const DEPOIS = [
  {
    icone: ScrollText,
    texto: "Seu pedido vira uma proposta numerada e entra na fila da equipe comercial.",
  },
  {
    icone: Timer,
    texto: "A equipe confere disponibilidade e prazo antes de fechar qualquer valor.",
  },
  {
    icone: FileCheck2,
    texto:
      "Você recebe a proposta com cada linha separada — equipamento, serviço e entrega.",
  },
];

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

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <CabecalhoAssistencia
        trilha={<Trilha itens={TRILHA} />}
        sobretitulo="Proposta sob medida"
        titulo="Pedir orçamento"
        resumo="Conte o que a clínica precisa. A equipe da JB monta a proposta com os itens separados — equipamento, serviço e deslocamento — para você ver de onde vem cada número antes de decidir."
      />

      <div className="container-jb py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
          <Cartao className="p-6 sm:p-8 lg:p-10">
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

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <CartaoApoio titulo="O que acontece depois">
              <ListaDeApoio itens={DEPOIS} numerada />
            </CartaoApoio>

            <CartaoApoio
              titulo="Equipamento com defeito?"
              descricao="Para conserto, o caminho certo é o chamado de assistência: ele já nasce com número e histórico próprio, e o orçamento sai depois do diagnóstico."
            >
              <Link
                href="/assistencia-tecnica/solicitar"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
              >
                Abrir chamado técnico
              </Link>
            </CartaoApoio>

            <CartaoApoio titulo="Prefere conversar?" descricao={s.horario}>
              <CanaisDiretos
                telefone={s.telefone}
                whatsapp={s.whatsapp}
                mensagem="Olá! Quero um orçamento para a minha clínica."
              />
            </CartaoApoio>
          </aside>
        </div>
      </div>
    </>
  );
}
