import type { Metadata } from "next";
import Link from "next/link";

import { CaixaDeAjuda } from "@/components/institucional/canais";
import {
  CorpoLegal,
  IndiceLegal,
  NotaDeRevisao,
  type SecaoLegal,
} from "@/components/institucional/documento-legal";
import { MolduraInstitucional } from "@/components/institucional/moldura";
import { CorpoCms, carregarPaginaCms, temTexto } from "@/components/institucional/pagina-cms";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { enderecoCompleto, getSettings } from "@/lib/settings";

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

/* ============================================================================
   AVISO JURÍDICO — LEIA ANTES DE PUBLICAR

   Texto genérico, escrito para descrever com honestidade como esta plataforma
   funciona (conta, pedido, pagamento, entrega, garantia e assistência) e para
   apoiar-se no Código de Defesa do Consumidor e no Marco Civil da Internet.
   NÃO é parecer jurídico.

   Pontos que exigem revisão de advogado antes de produção:
     · qualificação completa da empresa (razão social e CNPJ);
     · limitação de responsabilidade e cláusula de foro, que precisam respeitar
       o CDC quando a outra parte for consumidora;
     · condições de garantia contratual por linha de equipamento;
     · regras de cancelamento de pedido por erro de preço ou de estoque.

   Revisado, o texto deve ser gravado na página "termos" do CMS: havendo
   registro com corpo preenchido, ele substitui integralmente estas seções.
   ============================================================================ */

const SLUG = "termos";
const CAMINHO = "/termos";

export async function generateMetadata(): Promise<Metadata> {
  const pagina = await carregarPaginaCms(SLUG);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Termos de uso",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      "As regras de uso deste site: conta, pedidos, preços, entrega, garantia e assistência técnica.",
    caminho: CAMINHO,
  });
}

export default async function TermosPage() {
  const [pagina, s] = await Promise.all([carregarPaginaCms(SLUG), getSettings()]);
  const temCms = temTexto(pagina?.body);
  const endereco = enderecoCompleto(s);

  const secoes: SecaoLegal[] = [
    {
      id: "aceitacao",
      titulo: "Aceitação",
      conteudo: (
        <p>
          Este site é operado pela {s.empresa_nome}
          {endereco ? `, estabelecida em ${endereco}` : ""}. Ao navegar, criar conta ou
          comprar aqui, você concorda com estes termos e com a{" "}
          <Link href="/privacidade">política de privacidade</Link>. Se não concordar com
          algum ponto, não use o site — fale com a equipe pelos canais de atendimento.
        </p>
      ),
    },
    {
      id: "conta",
      titulo: "Conta e cadastro",
      conteudo: (
        <>
          <p>
            A conta é pessoal. Os dados informados no cadastro devem ser verdadeiros e
            atualizados, porque são eles que vão para a nota fiscal, para a entrega e para
            o atendimento técnico.
          </p>
          <p>
            A senha é de guarda exclusiva de quem a criou. Movimentações feitas com a sua
            senha são consideradas suas; se desconfiar de acesso indevido, troque a senha e
            avise a JB imediatamente.
          </p>
          <p>
            A JB pode suspender contas com dados falsos, uso fraudulento ou tentativa de
            burlar as regras do site.
          </p>
        </>
      ),
    },
    {
      id: "produtos-e-precos",
      titulo: "Produtos, preços e disponibilidade",
      conteudo: (
        <>
          <p>
            Todos os preços estão em reais e valem para as compras feitas neste site. Preço
            e disponibilidade podem mudar a qualquer momento, sem aviso; o que vale para o
            seu pedido é o preço vigente no momento em que ele é registrado.
          </p>
          <p>
            Equipamentos usados, seminovos e recondicionados são unidades únicas: a ficha e
            as fotos exibidas correspondem à unidade que você recebe. Em produtos novos, as
            imagens são ilustrativas e podem trazer acessórios que não fazem parte do que
            está sendo vendido — o que acompanha o produto está descrito na ficha.
          </p>
          <p>
            Havendo erro evidente de cadastro (preço manifestamente incompatível com o
            produto, por exemplo) ou falta de estoque confirmada depois do pedido, a JB
            comunica você e pode cancelar o pedido, devolvendo integralmente qualquer valor
            já pago.
          </p>
        </>
      ),
    },
    {
      id: "pedido-e-pagamento",
      titulo: "Pedido e pagamento",
      conteudo: (
        <>
          <p>
            O pedido só é considerado confirmado depois da confirmação do pagamento junto
            ao provedor. Antes disso ele fica aguardando, e o item pode continuar
            disponível para outros clientes.
          </p>
          <p>
            O valor total, incluindo serviços contratados e frete, é sempre reconferido
            pela JB no momento do fechamento, antes de qualquer cobrança.
          </p>
          <p>
            A JB pode recusar ou cancelar pedidos com indício de fraude, divergência
            cadastral ou impossibilidade de entrega no endereço informado.
          </p>
        </>
      ),
    },
    {
      id: "entrega",
      titulo: "Entrega, retirada e instalação",
      conteudo: (
        <p>
          As condições de envio, retirada, prazo e conferência no recebimento estão
          descritas na página de <Link href="/entrega">entrega e retirada</Link>, que faz
          parte destes termos. Instalação e orientação de uso são serviços contratados à
          parte, quando disponíveis para o item.
        </p>
      ),
    },
    {
      id: "trocas",
      titulo: "Desistência, troca e devolução",
      conteudo: (
        <p>
          Os prazos e as condições estão na página de{" "}
          <Link href="/trocas-e-devolucoes">trocas e devoluções</Link>, que também faz
          parte destes termos e reproduz direitos garantidos pelo Código de Defesa do
          Consumidor.
        </p>
      ),
    },
    {
      id: "garantia",
      titulo: "Garantia",
      conteudo: (
        <>
          <p>
            A garantia legal de bem durável é de 90 dias, contados do recebimento. Quando o
            produto tiver garantia contratual do fabricante ou da JB, o prazo é informado na
            ficha técnica e soma-se à garantia legal.
          </p>
          <p>
            A garantia pressupõe uso conforme o manual, instalação feita ou autorizada pela
            JB, infraestrutura elétrica e hidráulica dentro da especificação do equipamento
            e a realização das manutenções preventivas indicadas pelo fabricante.
          </p>
        </>
      ),
    },
    {
      id: "assistencia",
      titulo: "Assistência técnica",
      conteudo: (
        <>
          <p>
            Chamados abertos no site geram registro com número próprio e acompanhamento na
            Área da Clínica. Nenhuma peça é substituída sem aprovação prévia do orçamento pelo
            cliente.
          </p>
          <p>
            Visita técnica, diagnóstico e deslocamento podem ser cobrados mesmo quando o
            equipamento não for reparado, conforme informado no orçamento antes da
            execução.
          </p>
          <p>
            Os prazos de atendimento dependem da agenda técnica, da disponibilidade de
            peças e da localização da clínica, e são informados no próprio chamado.
          </p>
        </>
      ),
    },
    {
      id: "uso-do-site",
      titulo: "Uso adequado do site",
      conteudo: (
        <>
          <p>Ao usar este site, você concorda em não:</p>
          <ul>
            <li>tentar obter acesso não autorizado a contas, dados ou sistemas;</li>
            <li>
              usar robôs, raspagem de conteúdo ou automação para extrair o catálogo em
              massa;
            </li>
            <li>enviar conteúdo ilegal, ofensivo ou que viole direito de terceiros;</li>
            <li>
              sobrecarregar a plataforma com envios repetidos de formulários ou requisições
              automatizadas.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "propriedade",
      titulo: "Conteúdo e propriedade intelectual",
      conteudo: (
        <p>
          Textos, fotos das unidades, fichas técnicas, marca e identidade visual da JB são
          protegidos e não podem ser copiados ou reutilizados sem autorização por escrito.
          Marcas de fabricantes citadas pertencem aos respectivos titulares e aparecem aqui
          apenas para identificar o equipamento vendido ou atendido.
        </p>
      ),
    },
    {
      id: "responsabilidade",
      titulo: "Responsabilidade",
      conteudo: (
        <>
          <p>
            A JB responde pelos produtos que vende e pelos serviços que executa, nos termos
            da lei. O funcionamento do site pode ser interrompido para manutenção ou por
            falha de terceiros (hospedagem, provedor de pagamento, transportadora), e a JB
            trabalha para restabelecê-lo o quanto antes.
          </p>
          <p>
            O conteúdo informativo do site não substitui o manual do fabricante nem a
            avaliação de um técnico sobre o seu equipamento.
          </p>
        </>
      ),
    },
    {
      id: "alteracoes",
      titulo: "Alterações e legislação aplicável",
      conteudo: (
        <p>
          Estes termos podem ser atualizados; a data de atualização aparece no topo da
          página, e vale para cada pedido a versão vigente no momento em que ele foi feito.
          As relações regidas por este documento seguem a legislação brasileira, em especial
          o Código de Defesa do Consumidor (Lei 8.078/1990), a Lei Geral de Proteção de
          Dados (Lei 13.709/2018) e o Marco Civil da Internet (Lei 12.965/2014).
        </p>
      ),
    },
  ];

  return (
    <>
      <JsonLd
        dados={trilhaJsonLd([
          { rotulo: "Início", href: "/" },
          { rotulo: "Termos de uso", href: CAMINHO },
        ])}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Termos de uso" }]}
        sobretitulo="Políticas"
        titulo={pagina?.title || "Termos de uso"}
        resumo={
          pagina?.lead ||
          "As regras de uso deste site e das compras feitas por ele, escritas sem letra miúda."
        }
        atualizadoEm={pagina?.updatedAt ?? null}
        lateral={
          <div className="space-y-5">
            {temCms ? null : <IndiceLegal secoes={secoes} />}
            <CaixaDeAjuda s={s} titulo="Dúvida sobre alguma regra?" />
          </div>
        }
      >
        {temCms ? <CorpoCms html={pagina?.body ?? ""} className="max-w-3xl" /> : <CorpoLegal secoes={secoes} />}

        <NotaDeRevisao>
          Estes termos convivem com a{" "}
          <Link
            href="/privacidade"
            className="font-semibold text-graf-700 underline underline-offset-4 hover:text-jb-700"
          >
            política de privacidade
          </Link>
          , com a página de{" "}
          <Link
            href="/entrega"
            className="font-semibold text-graf-700 underline underline-offset-4 hover:text-jb-700"
          >
            entrega
          </Link>{" "}
          e com a de{" "}
          <Link
            href="/trocas-e-devolucoes"
            className="font-semibold text-graf-700 underline underline-offset-4 hover:text-jb-700"
          >
            trocas e devoluções
          </Link>
          .
        </NotaDeRevisao>
      </MolduraInstitucional>
    </>
  );
}
