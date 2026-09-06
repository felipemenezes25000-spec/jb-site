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

   Este texto é genérico. Ele foi escrito para descrever com honestidade o que
   esta plataforma realmente coleta e guarda — conta do cliente, pedidos,
   chamados de assistência, equipamentos, cookies de sessão e registros de
   acesso — e para citar os direitos do titular previstos na LGPD
   (Lei 13.709/2018, artigo 18). NÃO é parecer jurídico.

   Antes de ir a produção, um advogado precisa revisar, em especial:
     · a indicação formal do controlador (razão social e CNPJ da JB);
     · o nome e o contato do encarregado pelo tratamento de dados (DPO);
     · os prazos de retenção por finalidade;
     · a lista de operadores/terceiros com quem os dados são compartilhados;
     · a política de cookies, caso a JB passe a usar analytics ou remarketing.

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
  const pagina = await carregarPaginaCms(SLUG);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Política de privacidade",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      "Quais dados pessoais este site coleta, para que servem, com quem são compartilhados e como exercer seus direitos previstos na LGPD.",
    caminho: CAMINHO,
  });
}

export default async function PrivacidadePage() {
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
            Os dados pessoais coletados neste site são tratados pela {s.empresa_nome}
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
          <p>Só o necessário para cada coisa que você faz no site:</p>
          <ul>
            <li>
              <strong>Conta e cadastro:</strong> nome, e-mail, telefone, tipo de pessoa,
              CPF ou CNPJ, razão social quando pessoa jurídica e a senha, guardada sempre
              em forma cifrada (hash) — nunca em texto legível.
            </li>
            <li>
              <strong>Endereços:</strong> os endereços de entrega e de atendimento que você
              cadastra, incluindo CEP, complemento e ponto de referência.
            </li>
            <li>
              <strong>Pedidos:</strong> itens comprados, valores, forma de entrega e o
              histórico de status. Dados de pagamento são processados pelo provedor
              contratado; a JB registra apenas a confirmação e os identificadores da
              transação, nunca o número completo do cartão.
            </li>
            <li>
              <strong>Assistência técnica:</strong> equipamento, marca, modelo, número de
              série, descrição do problema, fotos e vídeos enviados, endereço do
              atendimento, ordens de serviço, orçamentos e laudos.
            </li>
            <li>
              <strong>Equipamentos:</strong> o que você cadastra na Área da Clínica para
              acompanhar garantia, manutenções e documentos.
            </li>
            <li>
              <strong>Contato:</strong> nome, e-mail, telefone, cidade e a mensagem enviada
              pelo formulário, além do endereço de IP e do navegador usados no envio — dados
              guardados para conter abuso e envio automatizado.
            </li>
            <li>
              <strong>Acessos:</strong> registros de tentativa de login (e-mail informado,
              IP e horário) e registros de auditoria das ações feitas no painel interno.
            </li>
          </ul>
          <p>
            Este site não pede e não usa dados sensíveis de pacientes da sua clínica. Se
            você enviar esse tipo de informação por engano em uma mensagem ou foto, avise a
            JB para que o conteúdo seja apagado.
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
              <strong>Executar o contrato:</strong> processar pedidos, entregar, instalar,
              atender chamados, emitir orçamentos e ordens de serviço, controlar garantia e
              manutenção preventiva.
            </li>
            <li>
              <strong>Cumprir obrigação legal:</strong> emissão de documentos fiscais e
              guarda dos registros exigidos pela legislação.
            </li>
            <li>
              <strong>Legítimo interesse:</strong> segurança da conta, prevenção a fraude e
              a abuso de formulários, além da melhoria do próprio atendimento.
            </li>
            <li>
              <strong>Consentimento:</strong> envio de novidades e condições comerciais,
              quando você marca essa opção. Pode ser cancelado a qualquer momento, sem
              afetar o restante do atendimento.
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
          <p>Este site usa cookies estritamente necessários ao funcionamento:</p>
          <ul>
            <li>
              <code className={CLASSE_COOKIE}>jb_cliente</code> — mantém você conectado na
              Área da Clínica;
            </li>
            <li>
              <code className={CLASSE_COOKIE}>jb_carrinho</code> — guarda o carrinho de quem
              ainda não entrou na conta;
            </li>
            <li>
              <code className={CLASSE_COOKIE}>jb_staff</code> — sessão da equipe da JB no
              painel interno.
            </li>
          </ul>
          <p>
            Esses cookies são de sessão ou de curta duração, ficam restritos a este
            domínio e não alimentam publicidade. Apagar os cookies do navegador desconecta
            a conta e esvazia o carrinho de visitante.
          </p>
          <p>
            A página de contato exibe um mapa incorporado do Google. Ao carregar esse
            mapa, o Google pode registrar dados de acesso segundo a própria política de
            privacidade dele — o conteúdo do mapa não é controlado pela JB.
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
            Apenas com quem é indispensável para entregar o que você contratou, e sempre no
            limite da finalidade:
          </p>
          <ul>
            <li>provedor de pagamento, para processar e confirmar a cobrança;</li>
            <li>transportadora ou equipe de entrega, para levar o equipamento;</li>
            <li>
              técnicos responsáveis pelo atendimento, que acessam o chamado e o endereço da
              visita;
            </li>
            <li>provedor de hospedagem e de armazenamento dos arquivos enviados;</li>
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
            Enquanto a sua conta estiver ativa e, depois disso, pelo prazo necessário para
            cumprir obrigações legais, fiscais e de garantia, ou para defesa em eventual
            processo.
          </p>
          <p>
            O histórico técnico do equipamento — ordens de serviço, laudos e manutenções —
            é mantido enquanto for útil ao atendimento daquele equipamento, porque é ele que
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
            Boa parte disso está na própria{" "}
            <Link href="/minha-jb/perfil">Área da Clínica</Link>, onde você consulta e corrige
            cadastro, endereços e histórico. Os demais pedidos podem ser feitos
            {s.email ? (
              <>
                {" "}
                por <a href={`mailto:${s.email}`}>{s.email}</a>
              </>
            ) : (
              " pelos canais de atendimento"
            )}{" "}
            ou pelo <Link href="/contato">formulário de contato</Link>. A JB pode pedir
            informações para confirmar a sua identidade antes de responder — é o que impede
            que outra pessoa peça seus dados no seu lugar.
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
            Senhas são guardadas com hash, o acesso ao painel interno é limitado por perfil
            de permissão e as ações relevantes ficam registradas em log de auditoria.
            Tentativas de login são contadas e bloqueadas temporariamente após repetição,
            para conter ataque de força bruta.
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
          canais de atendimento ou dentro da Área da Clínica.
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
          "O que este site coleta, por que coleta, com quem compartilha e como você exerce seus direitos."
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
