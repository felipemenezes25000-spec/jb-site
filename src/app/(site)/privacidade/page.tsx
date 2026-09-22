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

   Este texto é genérico. Ele descreve o que o site faz desde 22/09/2026,
   quando a JB passou a ser só assistência técnica: contato pelo WhatsApp e
   pelo formulário, registro do atendimento no painel da equipe, medição com
   consentimento e registros de acesso do painel. Não há mais conta de
   cliente, carrinho nem pedido. NÃO é parecer jurídico.

   Antes de ir a produção, um advogado precisa revisar, em especial:
     · a indicação formal do controlador (razão social e CNPJ da JB);
     · o nome e o contato do encarregado pelo tratamento de dados (DPO);
     · os prazos de retenção por finalidade;
     · a lista de operadores/terceiros com quem os dados são compartilhados;
     · a política de cookies e de medição de anúncios, se a JB ligar pixel de
       campanha (Meta, Google Ads).

   Depois de revisado, o texto deve ser gravado na página "privacidade" do
   CMS: havendo registro com corpo preenchido, ele substitui estas seções.
   ============================================================================ */

const SLUG = "privacidade";
const CAMINHO = "/privacidade";

/* `.prose-jb` não estiliza <code>, e o nome do cookie sem moldura some no meio
   do parágrafo. Aqui ele ganha o mesmo rótulo técnico usado em SKU e número
   de série. */
const CLASSE_COOKIE = "label-mono rounded bg-graf-100 px-1.5 py-0.5 text-graf-800";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const pagina = await carregarPaginaCms(SLUG);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Política de privacidade",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      "Quais dados pessoais a JB recebe pelo site e pelo WhatsApp, para que servem, com quem são compartilhados e como exercer seus direitos previstos na LGPD.",
    caminho: CAMINHO,
  });
}

export default async function PrivacidadePage() {
  await connection();
  const [pagina, s] = await Promise.all([carregarPaginaCms(SLUG), getSettings()]);
  const temCms = temTexto(pagina?.body);
  const endereco = enderecoCompleto(s);

  const secoes: SecaoLegal[] = [
    {
      id: "quem-trata",
      titulo: "Quem trata os seus dados",
      conteudo: (
        <>
          <p>
            Os dados pessoais recebidos por este site e pelos canais de atendimento são
            tratados pela {s.empresa_nome}
            {endereco ? `, estabelecida em ${endereco}` : ""}, na condição de controladora,
            nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).
          </p>
          {s.email ? (
            <p>
              Canal oficial para assuntos de privacidade:{" "}
              <a href={`mailto:${s.email}`}>{s.email}</a>. Pedidos relacionados a dados
              pessoais recebidos por esse endereço são encaminhados a quem responde pelo
              tema na JB.
            </p>
          ) : null}
        </>
      ),
    },
    {
      id: "dados-coletados",
      titulo: "Quais dados são coletados",
      conteudo: (
        <>
          <p>Só o necessário para atender o seu equipamento:</p>
          <ul>
            <li>
              <strong>Conversa no WhatsApp:</strong> o seu nome e número, a mensagem que
              você manda e as fotos ou vídeos do equipamento que decidir enviar. O botão do
              site só abre o WhatsApp com um texto sugerido; quem envia é você.
            </li>
            <li>
              <strong>Formulário de contato:</strong> nome, WhatsApp ou telefone, cidade,
              e-mail quando informado e a descrição do problema, além do endereço de IP e do
              navegador usados no envio, guardados para conter abuso e envio automatizado.
            </li>
            <li>
              <strong>Atendimento técnico:</strong> equipamento, marca, modelo, número de
              série, endereço do atendimento, chamados, ordens de serviço, orçamentos e
              laudos, registrados pela equipe no painel interno.
            </li>
            <li>
              <strong>Medição de visitas:</strong> só se você aceitar no aviso de cookies.
              São contagens de páginas vistas e de cliques em botões, sem nome, telefone ou
              texto que você digitou.
            </li>
            <li>
              <strong>Acessos da equipe:</strong> registros de login e de auditoria das
              ações feitas no painel interno da JB.
            </li>
          </ul>
          <p>
            A JB não pede e não usa dados sensíveis de pacientes da sua clínica. Se você
            enviar esse tipo de informação por engano em uma mensagem ou foto, avise a
            equipe para que o conteúdo seja apagado.
          </p>
        </>
      ),
    },
    {
      id: "finalidades",
      titulo: "Para que os dados são usados",
      conteudo: (
        <>
          <ul>
            <li>
              <strong>Atender o que você pediu:</strong> responder o contato, fazer a
              triagem, combinar a visita ou o envio à bancada, emitir orçamento e ordem de
              serviço, controlar garantia do serviço e manutenção preventiva.
            </li>
            <li>
              <strong>Cumprir obrigação legal:</strong> emissão de documentos fiscais e
              guarda dos registros exigidos pela legislação.
            </li>
            <li>
              <strong>Legítimo interesse:</strong> segurança do painel, prevenção a abuso de
              formulários e melhoria do próprio atendimento, como saber qual página traz
              mais contatos.
            </li>
            <li>
              <strong>Consentimento:</strong> medição de visitas e cliques, quando você
              aceita no aviso de cookies. Recusar não muda nada no uso do site.
            </li>
          </ul>
          <p>
            Os dados não são vendidos, alugados nem cedidos para uso publicitário de
            terceiros.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      titulo: "Cookies e tecnologias parecidas",
      conteudo: (
        <>
          <p>
            Quem visita o site não precisa de conta nem de login, então não há cookie de
            sessão para o visitante. Os que existem são:
          </p>
          <ul>
            <li>
              a sua escolha no aviso de medição, guardada no próprio navegador para o aviso
              não aparecer de novo;
            </li>
            <li>
              os cookies da ferramenta de medição, apenas se você aceitar;
            </li>
            <li>
              <code className={CLASSE_COOKIE}>jb_staff</code>, a sessão da equipe da JB no
              painel interno.
            </li>
          </ul>
          <p>
            O botão do WhatsApp leva para um serviço da Meta. A partir daí vale a política de
            privacidade do WhatsApp, que não é controlada pela JB.
          </p>
        </>
      ),
    },
    {
      id: "compartilhamento",
      titulo: "Com quem os dados são compartilhados",
      conteudo: (
        <>
          <p>
            Apenas com quem é indispensável para atender o seu equipamento, e sempre no
            limite da finalidade:
          </p>
          <ul>
            <li>WhatsApp (Meta), por onde a conversa acontece quando você escolhe esse canal;</li>
            <li>
              técnicos responsáveis pelo atendimento, que acessam o chamado e o endereço da
              visita;
            </li>
            <li>provedor de hospedagem, de e-mail e de armazenamento dos arquivos;</li>
            <li>
              contabilidade e autoridades públicas, quando houver obrigação legal ou ordem
              judicial.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "retencao",
      titulo: "Por quanto tempo os dados ficam guardados",
      conteudo: (
        <>
          <p>
            Pelo tempo do atendimento e, depois dele, pelo prazo necessário para cumprir
            obrigações legais, fiscais e de garantia do serviço, ou para defesa em eventual
            processo.
          </p>
          <p>
            O histórico técnico do equipamento (ordens de serviço, laudos e manutenções) é
            mantido enquanto for útil ao atendimento daquele equipamento, porque é ele que
            permite saber o que já foi feito antes.
          </p>
        </>
      ),
    },
    {
      id: "direitos",
      titulo: "Seus direitos",
      conteudo: (
        <>
          <p>
            O artigo 18 da LGPD garante a você, a qualquer momento e sem custo, o direito
            de pedir:
          </p>
          <ul>
            <li>confirmação de que existe tratamento dos seus dados;</li>
            <li>acesso aos dados que a JB tem sobre você;</li>
            <li>correção de dado incompleto, inexato ou desatualizado;</li>
            <li>
              anonimização, bloqueio ou eliminação de dado desnecessário, excessivo ou
              tratado fora da lei;
            </li>
            <li>portabilidade dos dados a outro fornecedor;</li>
            <li>
              eliminação dos dados tratados com base no consentimento, salvo quando a lei
              obrigar a guarda;
            </li>
            <li>informação sobre com quem os dados foram compartilhados;</li>
            <li>revogação do consentimento.</li>
          </ul>
          <p>
            Os pedidos podem ser feitos pelo WhatsApp da equipe
            {s.email ? (
              <>
                {" "}
                ou por <a href={`mailto:${s.email}`}>{s.email}</a>
              </>
            ) : null}
            . A JB pode pedir informações para confirmar a sua identidade antes de responder:
            é o que impede que outra pessoa peça seus dados no seu lugar.
          </p>
        </>
      ),
    },
    {
      id: "seguranca",
      titulo: "Segurança",
      conteudo: (
        <>
          <p>
            O acesso ao painel interno é limitado por perfil de permissão, as senhas da
            equipe são guardadas com hash e as ações relevantes ficam registradas em log de
            auditoria. Fotos e documentos do atendimento só são abertos por quem está logado
            no painel.
          </p>
          <p>
            Nenhum sistema é infalível. Se acontecer um incidente com risco relevante aos
            titulares, a JB comunicará os afetados e a Autoridade Nacional de Proteção de
            Dados, como manda a lei.
          </p>
        </>
      ),
    },
    {
      id: "criancas",
      titulo: "Público a que o site se destina",
      conteudo: (
        <p>
          Este site atende profissionais e empresas do setor odontológico. Ele não é
          direcionado a crianças e adolescentes, e não há coleta intencional de dados desse
          público.
        </p>
      ),
    },
    {
      id: "alteracoes",
      titulo: "Alterações desta política",
      conteudo: (
        <p>
          Esta política pode mudar para acompanhar a lei ou o próprio serviço. A data de
          atualização aparece no topo da página; mudanças relevantes são comunicadas pelos
          canais de atendimento.
        </p>
      ),
    },
  ];

  return (
    <>
      <JsonLd
        dados={trilhaJsonLd([
          { rotulo: "Início", href: "/" },
          { rotulo: "Política de privacidade", href: CAMINHO },
        ])}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Privacidade" }]}
        sobretitulo="Políticas"
        titulo={pagina?.title || "Política de privacidade"}
        resumo={
          pagina?.lead ||
          "O que a JB recebe pelo site e pelo WhatsApp, por que recebe, com quem compartilha e como você exerce seus direitos."
        }
        atualizadoEm={pagina?.updatedAt ?? null}
        lateral={
          <div className="space-y-5">
            {temCms ? null : <IndiceLegal secoes={secoes} />}
            <CaixaDeAjuda
              s={s}
              titulo="Pedido sobre seus dados"
              descricao="Fale com a JB para acessar, corrigir ou eliminar dados pessoais."
            />
          </div>
        }
      >
        {temCms ? (
          <CorpoCms html={pagina?.body ?? ""} className="max-w-3xl" />
        ) : (
          <CorpoLegal secoes={secoes} />
        )}

        <NotaDeRevisao>
          Ao usar este site você também concorda com os{" "}
          <Link
            href="/termos"
            className="font-semibold text-graf-700 underline underline-offset-4 hover:text-jb-700"
          >
            termos de uso
          </Link>
          .
        </NotaDeRevisao>
      </MolduraInstitucional>
    </>
  );
}
