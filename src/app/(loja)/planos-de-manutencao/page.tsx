import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardList,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { CabecalhoAssistencia } from "@/components/assistencia/apoio";
import { CartaoPlano, periodicidade } from "@/components/assistencia/cartao-plano";
import { FormularioPlano } from "@/components/assistencia/formulario-plano";
import {
  escoposComparaveis,
  paraPlanoPublico,
  precoDoPlano,
  regraDoPlano,
  SELECAO_PLANO_PUBLICO,
  type PlanoPublico,
} from "@/lib/plano";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta, TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { Grade, colunasParaTotal } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { sessaoCliente } from "@/lib/auth-cliente";
import { formatarPreco, plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, servicoJsonLd, trilhaJsonLd } from "@/lib/seo";
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
 * Planos de manutenção publicados.
 *
 * Cada cartão é o registro do banco, sem enfeite: preço, vigência, visitas
 * incluídas, desconto em peças e a lista de benefícios que o painel cadastrou.
 * Plano sem preço aparece como "sob consulta"; nenhum valor é estimado aqui.
 *
 * O formulário no fim avisa a equipe — não contrata nada. O contrato depende
 * de saber quais equipamentos entram na cobertura, e isso é conversa, não
 * campo de formulário.
 */

const CAMINHO = "/planos-de-manutencao";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Planos de manutenção" },
];

/** O que não muda de um plano para o outro — inclusive o que fica de fora. */
const COMUM = [
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
      "Cada visita fecha com o que foi verificado gravado no histórico do aparelho, disponível na Área da Clínica.",
  },
  {
    icone: ShieldCheck,
    titulo: "Orçamento antes de trocar peça",
    texto:
      "Se a revisão encontrar algo a reparar, vira orçamento à parte — nada é substituído sem sua aprovação.",
  },
  {
    icone: Stethoscope,
    titulo: "Cobertura fechada por equipamento",
    texto:
      "A lista de aparelhos cobertos é definida com você antes de assinar. O que ficar de fora continua sendo atendido por chamado avulso.",
  },
];

/**
 * As linhas do comparativo. Só o que está cadastrado no plano. Campo sem valor
 * vira a condição real ("sob consulta", "a combinar"), nunca um traço solto.
 *
 * A linha "Cobrança" vem logo abaixo do valor, e é a mais importante da
 * tabela. Sem ela, uma coluna com R$ 890 ao lado de outra com R$ 2.890 leva o
 * leitor a concluir que um plano é três vezes mais caro — quando os dois
 * podem estar cobrando por coisas diferentes. Preço só se compara depois de a
 * unidade estar na mesma linha de visão.
 */
const LINHAS_COMPARATIVO: {
  rotulo: string;
  valor: (plano: PlanoPublico) => string;
}[] = [
  {
    rotulo: "Valor",
    valor: (plano) => {
      const preco = precoDoPlano({
        priceCents: plano.precoCents,
        periodMonths: plano.mesesDeVigencia,
        billingBasis: plano.baseDeCobranca,
        coveredEquipment: plano.equipamentosCobertos,
      });
      if (preco.tipo !== "valor") return "Sob consulta";
      return preco.aPartirDe
        ? `A partir de ${formatarPreco(preco.centavos)}`
        : formatarPreco(preco.centavos);
    },
  },
  {
    rotulo: "Cobrança",
    valor: (plano) => {
      const preco = precoDoPlano({
        priceCents: plano.precoCents,
        periodMonths: plano.mesesDeVigencia,
        billingBasis: plano.baseDeCobranca,
        coveredEquipment: plano.equipamentosCobertos,
      });
      return preco.tipo === "valor" ? preco.unidade : "A definir com a equipe";
    },
  },
  {
    rotulo: "Vigência",
    valor: (plano) => plural(plano.mesesDeVigencia, "mês", "meses"),
  },
  {
    rotulo: "Visitas incluídas",
    valor: (plano) =>
      plano.visitasIncluidas > 0
        ? plural(plano.visitasIncluidas, "visita", "visitas")
        : "A combinar",
  },
  {
    rotulo: "Periodicidade",
    valor: (plano) => periodicidade(plano) ?? "Definida no diagnóstico",
  },
  {
    rotulo: "Peças",
    valor: (plano) =>
      regraDoPlano(plano, plano.politicaDePecas, /pe[çc]a/i) ||
      (plano.descontoEmPecas > 0 ? `${plano.descontoEmPecas}% de desconto` : "Orçadas à parte"),
  },
  {
    /* `regraDoPlano` antes do "A combinar": com o campo próprio vazio, a
       linha contradizia o benefício que o cartão logo acima anunciava. Ver o
       comentário em `src/lib/plano.ts`. */
    rotulo: "Deslocamento",
    valor: (plano) =>
      regraDoPlano(plano, plano.politicaDeDeslocamento, /desloca|visita t[ée]cnica|regi[ãa]o/i) ||
      "A combinar",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return metadataDePagina({
    titulo: "Planos de manutenção para clínicas",
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
      select: SELECAO_PLANO_PUBLICO,
    }),
  ]);

  const dadosDoCliente = cliente
    ? await prisma.customer.findUnique({
        where: { id: cliente.id },
        select: { name: true, email: true, phone: true },
      })
    : null;

  const lista: PlanoPublico[] = planos.map(paraPlanoPublico);

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

  /* Todos os planos publicados cobram pela mesma unidade e pelo mesmo prazo?
     A resposta decide se o comparativo pode ser lido como comparação de preço
     ou precisa avisar que não é. */
  const escoposHomogeneos = lista.every((plano) =>
    escoposComparaveis(
      {
        priceCents: plano.precoCents,
        periodMonths: plano.mesesDeVigencia,
        billingBasis: plano.baseDeCobranca,
        coveredEquipment: plano.equipamentosCobertos,
      },
      {
        priceCents: lista[0].precoCents,
        periodMonths: lista[0].mesesDeVigencia,
        billingBasis: lista[0].baseDeCobranca,
        coveredEquipment: lista[0].equipamentosCobertos,
      },
    ),
  );

  const escolhido = lista.some((plano) => plano.slug === planoPedido)
    ? planoPedido
    : undefined;

  return (
    <>
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

      <CabecalhoAssistencia
        trilha={<Trilha itens={TRILHA} />}
        sobretitulo="Cobertura contínua"
        titulo="Planos de manutenção"
        resumo="Visitas programadas, agenda gerada de uma vez e o que foi feito registrado na ficha de cada aparelho. O plano escolhido define o ritmo; a equipe define o roteiro por equipamento."
      />

      {/* ------------------------------------------------------------ planos */}
      <Secao espaco="md">
        {lista.length === 0 ? (
          <Vazio
            icone={CalendarCheck}
            titulo="Nenhum plano publicado no momento"
            descricao="A JB monta a cobertura sob medida quando não há plano publicado. Descreva os equipamentos da clínica e a equipe volta com a proposta."
            acao={<LinkBotao href="/orcamento?tipo=plano">Falar sobre cobertura</LinkBotao>}
          />
        ) : (
          <>
            {/* A contagem escolhe a grade: dois planos não viram uma fileira de
                três com um buraco do lado. */}
            <Grade como="ul" colunas={colunasParaTotal(lista.length)} espaco="md">
              {lista.map((plano) => (
                <li key={plano.slug} id={plano.slug} className="scroll-mt-28">
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
            </Grade>

            {/* ------------------------------------------------- lado a lado */}
            {/* Cartão explica um plano; tabela compara os três. Com um plano
                só publicado não há o que comparar, e a tabela não aparece. */}
            {lista.length > 1 ? (
              <section className="mt-16" aria-labelledby="comparar-planos">
                <h2 id="comparar-planos" className="text-title texto-forte">
                  Lado a lado
                </h2>
                <p className="mt-3 max-w-2xl text-corpo leading-relaxed text-graf-600">
                  Os mesmos números dos cartões acima, um do lado do outro. Plano sem
                  valor publicado sai como sob consulta — o preço fecha na proposta,
                  depois de saber quantos equipamentos entram.
                </p>

                {/* Aviso de escopo.
                    Uma tabela põe números na mesma coluna e, com isso, afirma
                    que eles são comparáveis. Quando as bases de cobrança ou as
                    vigências diferem, essa afirmação é falsa e a leitura rápida
                    conclui o contrário do que os dados dizem. O aviso é dado
                    ANTES da tabela, não num rodapé — depois da conclusão, a
                    ressalva chega tarde. */}
                {!escoposHomogeneos ? (
                  <Aviso tom="atencao" titulo="Estes planos não cobram pela mesma coisa">
                    A base de cobrança ou a vigência muda de um plano para o outro, então
                    os valores da linha “Valor” não são diretamente comparáveis. Confira a
                    linha “Cobrança” antes de concluir qual sai mais em conta.
                  </Aviso>
                ) : null}

                {/* A tabela rola sozinha em tela estreita; a página não. Como
                    a rolagem é a única forma de ver a última coluna, a área
                    recebe foco e nome — quem navega por teclado alcança. */}
                <div
                  role="region"
                  aria-label="Comparativo dos planos de manutenção"
                  tabIndex={0}
                  className="-mx-4 mt-7 overflow-x-auto px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 sm:mx-0 sm:px-0"
                >
                  <table className="w-full min-w-[36rem] border-collapse text-left">
                    <caption className="sr-only">
                      Comparação entre os planos de manutenção publicados
                    </caption>
                    <thead>
                      <tr className="border-b border-graf-300">
                        <th
                          scope="col"
                          className="w-40 py-4 pr-5 align-bottom text-apoio font-bold uppercase tracking-wider text-graf-500"
                        >
                          Plano
                        </th>
                        {lista.map((plano) => (
                          <th
                            key={plano.slug}
                            scope="col"
                            className="px-5 py-4 align-bottom"
                          >
                            <a
                              href={`#${plano.slug}`}
                              /* volta ao cartão do plano; 44px de alvo, que
                                 no celular esta é a linha que se toca. */
                              className="inline-flex min-h-11 min-w-11 items-center justify-center text-base font-bold text-graf-950 underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                            >
                              {plano.nome}
                            </a>
                            {plano.slug === slugDestaque ? (
                              <Etiqueta tom="marca" className="mt-2 flex w-max">
                                Mais completo
                              </Etiqueta>
                            ) : null}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {LINHAS_COMPARATIVO.map((linha) => (
                        <tr key={linha.rotulo} className="border-b border-graf-200">
                          <th
                            scope="row"
                            className="py-4 pr-5 align-top text-sm font-semibold text-graf-600"
                          >
                            {linha.rotulo}
                          </th>
                          {lista.map((plano) => (
                            <td
                              key={plano.slug}
                              className="tabular px-5 py-4 align-top text-corpo font-semibold text-graf-900"
                            >
                              {linha.valor(plano)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {/* ---------------------------------------------- vale para todos */}
            <section className="mt-16" aria-labelledby="comum-a-todos">
              <h2 id="comum-a-todos" className="text-title texto-forte">
                Vale para qualquer plano
              </h2>

              <Grade
                como="ul"
                colunas={{ base: 1, sm: 2, lg: 4 }}
                espaco="md"
                className="mt-7"
              >
                {COMUM.map((item) => (
                  <li key={item.titulo}>
                    <Cartao className="h-full p-5">
                      {/* Chip neutro: o vermelho da página fica nos botões e no
                          selo do plano mais completo, não em quatro quadrados. */}
                      <span className="flex size-10 items-center justify-center rounded-lg bg-graf-100 text-graf-700">
                        <item.icone className="size-5" aria-hidden />
                      </span>
                      <p className="mt-4 text-corpo font-bold text-graf-950">
                        {item.titulo}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-graf-600">
                        {item.texto}
                      </p>
                    </Cartao>
                  </li>
                ))}
              </Grade>

              <p className="mt-7 text-corpo leading-relaxed text-graf-600">
                Ainda em dúvida se compensa?{" "}
                <Link
                  href="/manutencao-preventiva"
                  className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-800"
                >
                  Faça a conta do custo de parada
                </Link>{" "}
                com os números da sua clínica.
              </p>
            </section>
          </>
        )}
      </Secao>

      {/* -------------------------------------------------------- interesse */}
      {lista.length > 0 ? (
        <Secao
          id="interesse"
          fundo="clara"
          espaco="lg"
          separador
          className="scroll-mt-24"
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
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
              className="lg:sticky lg:top-24 lg:h-max"
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
        </Secao>
      ) : null}
    </>
  );
}
