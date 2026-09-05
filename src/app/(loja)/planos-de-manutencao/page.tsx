import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, ClipboardList, ShieldCheck } from "lucide-react";

import { CartaoPlano, type PlanoPublico } from "@/components/assistencia/cartao-plano";
import { FormularioPlano } from "@/components/assistencia/formulario-plano";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, servicoJsonLd, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/**
 * Planos de manutenção publicados.
 *
 * Cada cartão é o registro do banco, sem enfeite: preço, vigência, visitas
 * incluídas, desconto em peças e a lista de benefícios que o painel cadastrou.
 * Plano sem preço aparece como "sob consulta"; nenhum valor é estimado aqui.
 *
 * O formulário no fim gera Lead e avisa a equipe — não contrata nada. O
 * contrato depende de saber quais equipamentos entram na cobertura, e isso é
 * conversa, não campo de formulário.
 */

const CAMINHO = "/planos-de-manutencao";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Planos de manutenção" },
];

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return metadataDePagina({
    titulo: "Planos de manutenção para clínicas odontológicas",
    descricao: `Cobertura contínua de manutenção preventiva para os equipamentos da clínica em ${s.endereco_cidade} e região, com visitas programadas e histórico por aparelho.`,
    caminho: CAMINHO,
  });
}

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const [{ plano: planoPedido }, s, cliente, planos] = await Promise.all([
    searchParams,
    getSettings(),
    sessaoCliente(),
    prisma.maintenancePlan.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        benefits: true,
        priceCents: true,
        periodMonths: true,
        visitsIncluded: true,
        partsDiscountPercent: true,
      },
    }),
  ]);

  const dadosDoCliente = cliente
    ? await prisma.customer.findUnique({
        where: { id: cliente.id },
        select: { name: true, email: true, phone: true },
      })
    : null;

  const lista: PlanoPublico[] = planos.map((plano) => ({
    slug: plano.slug,
    nome: plano.name,
    descricao: plano.description,
    beneficios: plano.benefits,
    precoCents: plano.priceCents,
    mesesDeVigencia: plano.periodMonths,
    visitasIncluidas: plano.visitsIncluded,
    descontoEmPecas: plano.partsDiscountPercent,
  }));

  // O "mais completo" é o de mais visitas, e só quando há mais de um plano
  // para comparar. Sem plano de referência, ninguém ganha selo.
  const maisVisitas = lista.reduce(
    (maior, plano) => Math.max(maior, plano.visitasIncluidas),
    0,
  );
  const slugDestaque =
    lista.length > 1 && maisVisitas > 0
      ? (lista.find((plano) => plano.visitasIncluidas === maisVisitas)?.slug ?? null)
      : null;

  const escolhido = lista.some((plano) => plano.slug === planoPedido)
    ? planoPedido
    : undefined;

  return (
    <div className="container-jb py-8 lg:py-12">
      <JsonLd
        dados={[
          servicoJsonLd({
            nome: "Planos de manutenção para clínicas odontológicas",
            caminho: CAMINHO,
            descricao:
              "Cobertura contínua de manutenção preventiva com visitas programadas, registro por equipamento e desconto em peças.",
            prestador: s.empresa_nome,
            area: s.endereco_cidade,
            tipo: "Plano de manutenção",
          }),
          trilhaJsonLd(TRILHA),
        ]}
      />

      <Trilha itens={TRILHA} className="mb-6" />

      <header className="max-w-2xl">
        <h1 className="text-display leading-tight">Planos de manutenção</h1>
        <p className="mt-4 text-base leading-relaxed text-graf-600">
          Cobertura contínua para os equipamentos da clínica: visitas programadas, agenda
          gerada de uma vez e o que foi feito registrado na ficha de cada aparelho. O plano
          escolhido define o ritmo; a equipe define o roteiro por equipamento.
        </p>
      </header>

      {/* ------------------------------------------------------------ planos */}
      {lista.length === 0 ? (
        <Vazio
          icone={CalendarCheck}
          titulo="Nenhum plano publicado no momento"
          descricao="A JB monta a cobertura sob medida quando não há plano publicado. Descreva os equipamentos da clínica e a equipe volta com a proposta."
          acao={<LinkBotao href="/orcamento?tipo=plano">Falar sobre cobertura</LinkBotao>}
          className="mt-10"
        />
      ) : (
        <>
          <ul className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((plano) => (
              <li key={plano.slug} id={plano.slug} className="scroll-mt-24">
                <CartaoPlano
                  plano={plano}
                  destaque={plano.slug === slugDestaque}
                  acao={
                    <LinkBotao
                      /* leva o plano no endereço: a página já lê ?plano= e
                         pré-seleciona no formulário. Só a âncora rolava até lá
                         com o campo mostrando outro plano. */
                      href={`?plano=${plano.slug}#interesse`}
                      variante={plano.slug === slugDestaque ? "primario" : "secundario"}
                      larguraTotal
                    >
                      Quero este plano
                    </LinkBotao>
                  }
                />
              </li>
            ))}
          </ul>

          {/* ---------------------------------------------- vale para todos */}
          <section className="mt-12" aria-labelledby="comum-a-todos">
            <h2 id="comum-a-todos" className="text-title leading-tight">
              Vale para qualquer plano
            </h2>

            <ul className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  icone: CalendarCheck,
                  titulo: "Agenda gerada na assinatura",
                  texto:
                    "As visitas do período inteiro nascem junto com o contrato, e a equipe avisa antes de cada uma.",
                },
                {
                  icone: ClipboardList,
                  titulo: "Registro por equipamento",
                  texto:
                    "Cada visita fecha com o que foi verificado gravado no histórico do aparelho, disponível na sua conta.",
                },
                {
                  icone: ShieldCheck,
                  titulo: "Orçamento antes de trocar peça",
                  texto:
                    "Se a revisão encontrar algo a reparar, vira orçamento à parte — nada é substituído sem sua aprovação.",
                },
              ].map((item) => (
                <li key={item.titulo}>
                  <Cartao className="h-full p-5">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-jb-50 text-jb-600 ring-1 ring-inset ring-jb-100">
                      <item.icone className="size-5" aria-hidden />
                    </span>
                    <p className="mt-4 text-sm font-bold text-graf-950">{item.titulo}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-graf-600">
                      {item.texto}
                    </p>
                  </Cartao>
                </li>
              ))}
            </ul>

            <p className="mt-6 text-sm leading-relaxed text-graf-600">
              Ainda em dúvida se compensa?{" "}
              <Link
                href="/manutencao-preventiva"
                className="font-semibold text-jb-700 underline underline-offset-2"
              >
                Faça a conta do custo de parada
              </Link>{" "}
              com os números da sua clínica.
            </p>
          </section>
        </>
      )}

      {/* -------------------------------------------------------- interesse */}
      {lista.length > 0 ? (
        <section id="interesse" className="mt-16 scroll-mt-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-14">
            <TituloSecao
              sobretitulo="Sem compromisso"
              titulo="Fale com a equipe sobre a cobertura"
              descricao="O valor final depende de quantos equipamentos entram e de onde eles estão. Conte a situação da clínica e a JB volta com a proposta — sem contratação automática por aqui."
              acao={
                <LinkBotao href="/orcamento?tipo=plano" variante="texto">
                  Prefiro descrever tudo em um orçamento
                  <ArrowRight className="size-4" aria-hidden />
                </LinkBotao>
              }
            />

            <Cartao className="p-6 lg:p-8">
              <FormularioPlano
                /* Carimbado no servidor para não divergir na hidratação. */
                inicio={Date.now()}
                planos={lista.map((plano) => ({ slug: plano.slug, nome: plano.nome }))}
                planoInicial={escolhido ?? slugDestaque ?? lista[0]?.slug}
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
              />
            </Cartao>
          </div>
        </section>
      ) : null}
    </div>
  );
}
