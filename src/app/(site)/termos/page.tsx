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
import { connection } from "next/server";

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
/*
 * Renderizada a cada visita (`connection()` logo no começo). Até 22/09/2026
 * esta página vivia na casca da loja, que lia o cookie da conta e tornava tudo
 * dinâmico por tabela. A casca do site de assistência é estática, e sem esta
 * chamada o Next tentaria pré-renderizar a consulta ao banco e recusaria o
 * relógio que o Prisma lê durante a consulta.
 */
export const instant = false;

/* ============================================================================
   AVISO JURÍDICO — LEIA ANTES DE PUBLICAR

   Texto genérico, escrito para descrever como o site funciona desde que a JB
   passou a ser só assistência técnica (22/09/2026): contato, orçamento,
   execução e garantia do serviço. Apoia-se no Código de Defesa do Consumidor e
   no Marco Civil da Internet. NÃO é parecer jurídico.

   Pontos que exigem revisão de advogado antes de produção:
     · qualificação completa da empresa (razão social e CNPJ);
     · limitação de responsabilidade e cláusula de foro, que precisam respeitar
       o CDC quando a outra parte for consumidora;
     · prazo e condições da garantia do serviço e das peças trocadas;
     · cobrança de visita, diagnóstico e deslocamento quando não há reparo.

   Revisado, o texto deve ser gravado na página "termos" do CMS: havendo
   registro com corpo preenchido, ele substitui integralmente estas seções.
   ============================================================================ */

const SLUG = "termos";
const CAMINHO = "/termos";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const pagina = await carregarPaginaCms(SLUG);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Termos de uso",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      "As regras de uso deste site e da assistência técnica da JB: contato, orçamento, execução e garantia do serviço.",
    caminho: CAMINHO,
  });
}

export default async function TermosPage() {
  await connection();
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
          {endereco ? `, estabelecida em ${endereco}` : ""}. Ao navegar ou pedir
          atendimento por aqui, você concorda com estes termos e com a{" "}
          <Link href="/privacidade">política de privacidade</Link>. Se não concordar com
          algum ponto, fale com a equipe pelos canais de atendimento antes de seguir.
        </p>
      ),
    },
    {
      id: "o-que-o-site-faz",
      titulo: "O que este site faz",
      conteudo: (
        <>
          <p>
            O site apresenta a assistência técnica da JB para equipamentos odontológicos e
            leva você a falar com a equipe, pelo WhatsApp, por telefone ou pelo formulário.
            Não há venda de produtos, conta de cliente nem pagamento pelo site.
          </p>
          <p>
            O botão do WhatsApp abre a conversa com um texto sugerido. A mensagem só é
            enviada quando você a envia, e o clique não equivale a visita agendada nem a
            chamado aberto: isso é combinado com a equipe na triagem.
          </p>
        </>
      ),
    },
    {
      id: "assistencia",
      titulo: "Atendimento técnico",
      conteudo: (
        <>
          <p>
            Depois do primeiro contato, a equipe faz a triagem e combina o atendimento na
            clínica ou na bancada da JB. Cada atendimento é registrado com número próprio e
            histórico do equipamento.
          </p>
          <p>
            Nenhuma peça é substituída sem a aprovação prévia do orçamento pelo cliente.
            Visita técnica, diagnóstico e deslocamento podem ser cobrados mesmo quando o
            equipamento não for reparado, desde que informados antes da execução.
          </p>
          <p>
            Os prazos dependem da agenda técnica, da disponibilidade de peças e da
            localização da clínica, e são informados durante o atendimento.
          </p>
        </>
      ),
    },
    {
      id: "orcamento",
      titulo: "Orçamento",
      conteudo: (
        <p>
          O orçamento descreve cada item (peça, mão de obra, deslocamento), o valor e o prazo
          de validade. Ele pode ser aprovado ou recusado pelo WhatsApp, por telefone ou por
          e-mail; a equipe registra a sua decisão antes de executar o serviço.
        </p>
      ),
    },
    {
      id: "garantia",
      titulo: "Garantia do serviço",
      conteudo: (
        <>
          <p>
            O serviço executado tem a garantia legal prevista no Código de Defesa do
            Consumidor. Quando houver garantia contratual adicional, o prazo é informado no
            orçamento ou na ordem de serviço.
          </p>
          <p>
            A garantia pressupõe uso conforme o manual do fabricante, infraestrutura
            elétrica e hidráulica dentro da especificação do equipamento e a realização das
            manutenções preventivas indicadas.
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
            <li>tentar obter acesso não autorizado ao painel, a dados ou a sistemas;</li>
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
          Textos, fotos, marca e identidade visual da JB são protegidos e não podem ser
          copiados ou reutilizados sem autorização por escrito. Marcas de fabricantes
          citadas, como EVOXX, pertencem aos respectivos titulares e aparecem aqui para
          identificar os equipamentos atendidos.
        </p>
      ),
    },
    {
      id: "responsabilidade",
      titulo: "Responsabilidade",
      conteudo: (
        <>
          <p>
            A JB responde pelos serviços que executa, nos termos da lei. O funcionamento do
            site pode ser interrompido para manutenção ou por falha de terceiros
            (hospedagem, WhatsApp), e a JB trabalha para restabelecê-lo o quanto antes.
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
          página. As relações regidas por este documento seguem a legislação brasileira, em
          especial o Código de Defesa do Consumidor (Lei 8.078/1990), a Lei Geral de
          Proteção de Dados (Lei 13.709/2018) e o Marco Civil da Internet (Lei
          12.965/2014).
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
          "As regras de uso deste site e da assistência técnica da JB, escritas sem letra miúda."
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
          .
        </NotaDeRevisao>
      </MolduraInstitucional>
    </>
  );
}
