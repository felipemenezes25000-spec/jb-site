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
import { formatarTelefone } from "@/lib/format";
import { getSettings } from "@/lib/settings";

/* ============================================================================
   AVISO JURÍDICO — LEIA ANTES DE PUBLICAR

   O texto padrão desta página foi escrito a partir do Código de Defesa do
   Consumidor (Lei 8.078/1990), em especial os artigos 18, 26 e 49, e descreve
   apenas o que a plataforma de fato faz. Ele NÃO é parecer jurídico e precisa
   de revisão de um advogado antes de ir ao ar em produção — sobretudo nos
   pontos de prazo de análise, custo do frete de devolução e garantia de
   equipamento seminovo.

   Assim que a JB tiver a política revisada, o texto deve ser gravado na
   página "trocas-e-devolucoes" do CMS: havendo registro com corpo preenchido,
   ele substitui integralmente as seções abaixo.
   ============================================================================ */

const SLUG = "trocas-e-devolucoes";
const CAMINHO = "/trocas-e-devolucoes";

export async function generateMetadata(): Promise<Metadata> {
  const pagina = await carregarPaginaCms(SLUG);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Trocas e devoluções",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      "Prazos e condições para trocar, devolver ou acionar a garantia de um equipamento comprado na JB.",
    caminho: CAMINHO,
  });
}

export default async function TrocasPage() {
  const [pagina, s] = await Promise.all([carregarPaginaCms(SLUG), getSettings()]);
  const temCms = temTexto(pagina?.body);

  const secoes: SecaoLegal[] = [
    {
      id: "arrependimento",
      titulo: "Desistência em até 7 dias",
      conteudo: (
        <>
          <p>
            Compra feita pela internet dá direito a desistir em até <strong>7 dias
            corridos</strong>, contados do recebimento do produto, sem precisar justificar
            o motivo. É o artigo 49 do Código de Defesa do Consumidor.
          </p>
          <p>
            Para exercer esse direito, o equipamento precisa voltar sem uso, com todos os
            acessórios, manuais e a embalagem original. Equipamento já instalado ou já
            utilizado em atendimento não se enquadra na desistência — nesse caso a análise
            passa a ser de defeito, descrita abaixo.
          </p>
          <p>
            Confirmada a desistência, os valores pagos são devolvidos integralmente,
            incluindo o frete de ida. A coleta ou o envio de retorno é combinado com a JB.
          </p>
        </>
      ),
    },
    {
      id: "defeito",
      titulo: "Produto com defeito",
      conteudo: (
        <>
          <p>
            Equipamento odontológico é bem durável: o prazo legal para reclamar de vício
            aparente é de <strong>90 dias</strong> a partir do recebimento, e de 90 dias a
            partir da constatação quando o vício é oculto (artigo 26 do CDC).
          </p>
          <p>
            Reclamado o defeito, a JB tem até <strong>30 dias</strong> para sanar o
            problema. Não sendo sanado nesse prazo, você escolhe entre a substituição do
            produto, a devolução do valor pago com correção ou o abatimento proporcional do
            preço (artigo 18 do CDC).
          </p>
          <p>
            Muitos equipamentos têm ainda garantia contratual do fabricante ou da JB, com
            prazo próprio informado na ficha técnica do produto. Ela soma-se à garantia
            legal, nunca a substitui.
          </p>
        </>
      ),
    },
    {
      id: "avaria",
      titulo: "Avaria no transporte",
      conteudo: (
        <>
          <p>
            Embalagem amassada, furada ou molhada: recuse a entrega ou registre a ressalva
            no comprovante antes de assinar. Avise a JB no mesmo dia, com fotos da
            embalagem e do equipamento.
          </p>
          <p>
            Avaria percebida depois da abertura deve ser comunicada em até 7 dias corridos
            do recebimento, também com fotos. Esse registro é o que permite acionar a
            transportadora e trocar o item sem custo para a clínica.
          </p>
        </>
      ),
    },
    {
      id: "seminovos",
      titulo: "Seminovos, usados e recondicionados",
      conteudo: (
        <>
          <p>
            Unidade usada é vendida no estado descrito na própria página do produto, com o
            checklist de revisão e as fotos reais daquela unidade. Marca de uso, risco ou
            desgaste que estejam descritos no anúncio fazem parte do que foi comprado e não
            são tratados como defeito.
          </p>
          <p>
            O que não estava descrito, sim: se a unidade chegar diferente do que foi
            anunciado, vale tudo o que está na seção de produto com defeito, e a garantia
            informada para aquela unidade continua valendo.
          </p>
        </>
      ),
    },
    {
      id: "servicos",
      titulo: "Serviços já executados",
      conteudo: (
        <>
          <p>
            Instalação, visita técnica, manutenção e treinamento são serviços: uma vez
            executados, não cabe desistência. O que cabe é a garantia do serviço — refazer
            o que não ficou bom, sem custo adicional.
          </p>
          <p>
            Toda manutenção gera ordem de serviço com o que foi feito e as peças usadas.
            Havendo retorno do mesmo problema, abra o chamado citando o número da ordem de
            serviço original.
          </p>
        </>
      ),
    },
    {
      id: "nao-coberto",
      titulo: "O que não é coberto",
      conteudo: (
        <>
          <p>Estão fora da troca, da devolução e da garantia os casos de:</p>
          <ul>
            <li>uso fora das especificações do fabricante ou do manual do equipamento;</li>
            <li>instalação ou reparo feitos por terceiros sem autorização da JB;</li>
            <li>
              rede elétrica, aterramento, ar comprimido ou abastecimento de água fora da
              especificação exigida pelo equipamento;
            </li>
            <li>
              falta das manutenções preventivas indicadas pelo fabricante, quando elas
              forem condição da garantia;
            </li>
            <li>danos por queda, líquido, transporte feito pelo cliente ou mau uso;</li>
            <li>peças de desgaste natural, quando indicadas como tal na ficha do produto.</li>
          </ul>
        </>
      ),
    },
    {
      id: "como-solicitar",
      titulo: "Como solicitar",
      conteudo: (
        <>
          <p>
            O caminho mais rápido é pela <Link href="/minha-jb/pedidos">Área da Clínica</Link>,
            abrindo a solicitação a partir do próprio pedido — assim o histórico já vai
            junto. Também dá para pedir pelo{" "}
            <Link href="/contato">formulário de contato</Link>
            {s.telefone ? `, pelo telefone ${formatarTelefone(s.telefone)}` : ""} ou pelo
            WhatsApp.
          </p>
          <p>Tenha à mão, em qualquer canal:</p>
          <ul>
            <li>o número do pedido;</li>
            <li>o número de série do equipamento, quando houver;</li>
            <li>fotos ou vídeo do problema;</li>
            <li>uma descrição do que acontece e desde quando.</li>
          </ul>
          <p>
            A JB confirma o recebimento da solicitação e informa o próximo passo — coleta,
            visita técnica ou envio — junto com o prazo de cada etapa.
          </p>
        </>
      ),
    },
    {
      id: "estorno",
      titulo: "Devolução do valor pago",
      conteudo: (
        <p>
          Aprovada a devolução, o estorno é feito pelo mesmo meio de pagamento usado na
          compra. O prazo até o dinheiro aparecer depende do meio escolhido: no cartão de
          crédito, quem define é a administradora, e o crédito costuma aparecer na fatura
          seguinte; nas demais formas, a devolução é feita na conta de origem. A JB informa
          a data em que o estorno foi solicitado.
        </p>
      ),
    },
  ];

  return (
    <>
      <JsonLd
        dados={trilhaJsonLd([
          { rotulo: "Início", href: "/" },
          { rotulo: "Trocas e devoluções", href: CAMINHO },
        ])}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Trocas e devoluções" }]}
        sobretitulo="Políticas"
        titulo={pagina?.title || "Trocas e devoluções"}
        resumo={
          pagina?.lead ||
          "Prazos e condições para desistir da compra, trocar um equipamento ou acionar a garantia."
        }
        atualizadoEm={pagina?.updatedAt ?? null}
        lateral={
          <div className="space-y-5">
            {temCms ? null : <IndiceLegal secoes={secoes} />}
            <CaixaDeAjuda s={s} titulo="Precisa resolver agora?" />
          </div>
        }
      >
        {temCms ? <CorpoCms html={pagina?.body ?? ""} className="max-w-3xl" /> : <CorpoLegal secoes={secoes} />}

        <NotaDeRevisao>
          Esta página descreve as condições de compra neste site e reproduz direitos
          previstos no Código de Defesa do Consumidor, que valem independentemente do que
          esteja escrito aqui. Para prazos e formas de envio, veja{" "}
          <Link
            href="/entrega"
            className="font-semibold text-graf-700 underline underline-offset-4 hover:text-jb-700"
          >
            entrega e retirada
          </Link>
          .
        </NotaDeRevisao>
      </MolduraInstitucional>
    </>
  );
}
