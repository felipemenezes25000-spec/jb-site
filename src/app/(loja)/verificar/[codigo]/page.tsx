import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CircleSlash, FlaskConical } from "lucide-react";

import { MolduraInstitucional } from "@/components/institucional/moldura";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta } from "@/components/ui/data";
import {
  certificacaoPorCodigo,
  contarChecklist,
  frasedaVerificacao,
} from "@/lib/certificacao";
import { formatarData, plural } from "@/lib/format";
import { metadataDePagina } from "@/lib/seo";

/*
 * Rota dinâmica por natureza: o código vem da URL e a resposta é do banco.
 * Ver a nota de migração nas demais páginas da loja.
 */
export const instant = false;

/* ============================================================================
   Verificação pública de um Seminovo JB Certificado

   Esta página é a prova. O selo na página do produto afirma alguma coisa; aqui
   é onde a afirmação pode ser conferida por qualquer pessoa, sem conta, a
   partir do código impresso na etiqueta ou lido no QR.

   O que ela mostra, e o que ela deliberadamente NÃO mostra:

   MOSTRA   o que foi verificado, quantos itens de quantos, quais ficaram como
            não aplicáveis, quem inspecionou, quando, e a condição descrita.
   NÃO      número de série, comprador, endereço, ordem de serviço, documento
            restrito. O código é opaco justamente para não ser o serial: um
            verificador que fosse o serial exporia o aparelho de quem comprou.

   Certificação revogada NÃO vira 404. Quem guardou o link precisa poder
   descobrir que o selo caiu — sumir sem aviso é pior do que nunca ter tido.
   ============================================================================ */

type Props = { params: Promise<{ codigo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo } = await params;

  /* `noIndex` sempre. Uma página por unidade física vendida encheria o índice
     do buscador de páginas quase idênticas, e o que se quer indexado é a
     página do produto — não o comprovante dela. */
  return metadataDePagina({
    titulo: "Verificação de Seminovo JB Certificado",
    descricao: "Confira a inspeção registrada para esta unidade.",
    caminho: `/verificar/${codigo}`,
    noIndex: true,
  });
}

export default async function VerificarPage({ params }: Props) {
  const { codigo } = await params;
  const certificacao = await certificacaoPorCodigo(decodeURIComponent(codigo).trim());

  if (!certificacao) notFound();

  const { unit } = certificacao;
  const contagem = contarChecklist(unit.checklist);
  const revogada = certificacao.status === "revogada";
  const vendida = unit.status === "vendido";

  return (
    <MolduraInstitucional
      trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Verificação" }]}
      sobretitulo="Seminovo JB Certificado"
      titulo={unit.product.name}
      resumo={
        revogada
          ? "A certificação desta unidade foi suspensa. Os detalhes estão abaixo."
          : "Inspeção registrada pela equipe técnica da JB para esta unidade específica."
      }
    >
      <div className="space-y-8">
        {/* ------------------------------------------------------ estado */}
        <Cartao
          className={
            revogada ? "border-jb-200 bg-jb-50/40 p-5 sm:p-6" : "border-ok-500/25 p-5 sm:p-6"
          }
        >
          <div className="flex flex-wrap items-start gap-4">
            <span
              aria-hidden
              className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                revogada ? "bg-jb-100 text-jb-700" : "bg-ok-50 text-ok-700"
              }`}
            >
              {revogada ? <CircleSlash className="size-6" /> : <BadgeCheck className="size-6" />}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-title texto-forte">
                {revogada ? "Certificação suspensa" : "Certificação válida"}
              </p>

              {revogada ? (
                <>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-700">
                    {certificacao.revokedReason ||
                      "A JB retirou esta certificação. Fale com a equipe antes de considerar esta unidade."}
                  </p>
                  {certificacao.revokedAt ? (
                    <p className="mt-1 text-sm text-graf-500">
                      Suspensa em {formatarData(certificacao.revokedAt)}.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-700">
                  {frasedaVerificacao(contagem)}.
                  {certificacao.publishedAt
                    ? ` Publicada em ${formatarData(certificacao.publishedAt)}.`
                    : ""}
                </p>
              )}

              <p className="label-mono mt-4 text-[0.8125rem] text-graf-500">
                Código {certificacao.publicCode} · checklist {certificacao.checklistVersion}
              </p>
            </div>
          </div>
        </Cartao>

        {/* O selo é da JB, e a página diz isso. Nada aqui insinua certificação
            independente ou regulatória. */}
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-graf-600">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
          <span>
            <strong className="font-semibold text-graf-800">Seminovo JB Certificado</strong> é o
            programa de inspeção da própria JB. Não é certificação de órgão independente nem
            registro regulatório — é o que a equipe técnica da JB verificou nesta unidade, com
            responsável e data.
          </span>
        </p>

        {/* ----------------------------------------------------- a unidade */}
        <section aria-labelledby="dados-da-unidade">
          <h2 id="dados-da-unidade" className="text-title texto-forte">
            A unidade
          </h2>

          <dl className="mt-4 divide-y divide-graf-100 rounded-xl border border-graf-200 text-sm">
            <Linha rotulo="Equipamento" valor={unit.product.name} />
            {unit.manufactureYear ? (
              <Linha rotulo="Ano de fabricação" valor={String(unit.manufactureYear)} />
            ) : null}
            {unit.usageCycles ? (
              <Linha
                rotulo="Ciclos registrados"
                valor={unit.usageCycles.toLocaleString("pt-BR")}
              />
            ) : null}
            {unit.warrantyMonths ? (
              <Linha
                rotulo="Garantia da JB"
                valor={plural(unit.warrantyMonths, "mês", "meses")}
              />
            ) : null}
            {certificacao.technician?.name ? (
              <Linha rotulo="Inspeção conduzida por" valor={certificacao.technician.name} />
            ) : null}
            {certificacao.inspectedAt ? (
              <Linha rotulo="Data da inspeção" valor={formatarData(certificacao.inspectedAt)} />
            ) : null}
          </dl>

          {unit.conditionNotes ? (
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-graf-700">
              {unit.conditionNotes}
            </p>
          ) : null}
        </section>

        {/* --------------------------------------------------- o checklist */}
        {unit.checklist.length > 0 ? (
          <section aria-labelledby="itens-verificados">
            <h2 id="itens-verificados" className="text-title texto-forte">
              O que foi verificado
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-graf-600">
              {frasedaVerificacao(contagem)}. Item não aplicável é o que não existe neste
              modelo — ele não conta como verificação.
            </p>

            <ul className="mt-4 divide-y divide-graf-100 rounded-xl border border-graf-200">
              {unit.checklist.map((item) => (
                <li
                  key={item.label}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-graf-900">
                      {item.label}
                    </span>
                    {item.note ? (
                      <span className="block text-[0.8125rem] text-graf-500">{item.note}</span>
                    ) : null}
                  </span>
                  <ResultadoDoItem resultado={item.result} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ----------------------------------------------- disponibilidade */}
        <section className="rounded-xl border border-graf-200 bg-surface-muted p-5">
          <h2 className="text-base font-bold text-graf-950">Esta unidade está disponível?</h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
            {vendida
              ? "Esta unidade já foi vendida. A verificação continua no ar porque ela é o comprovante de quem comprou."
              : unit.product.status === "active"
                ? "A unidade está anunciada no catálogo."
                : "Esta unidade não está anunciada no momento. Fale com a equipe para saber da disponibilidade."}
          </p>

          {!vendida && unit.product.status === "active" ? (
            <LinkBotao href={`/loja/${unit.product.slug}`} className="mt-4" tamanho="sm">
              Ver no catálogo
            </LinkBotao>
          ) : (
            <Link
              href="/contato"
              className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline-offset-4 hover:underline"
            >
              Falar com a equipe
            </Link>
          )}
        </section>
      </div>
    </MolduraInstitucional>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
      <dt className="text-graf-500">{rotulo}</dt>
      <dd className="font-semibold text-graf-950">{valor}</dd>
    </div>
  );
}

/** Resultado de um item — com texto, nunca só cor. */
function ResultadoDoItem({ resultado }: { resultado: string }) {
  if (resultado === "nao_aplicavel") {
    return <Etiqueta tom="neutro">Não se aplica</Etiqueta>;
  }
  if (resultado === "substituido") return <Etiqueta tom="marca">Peça substituída</Etiqueta>;
  if (resultado === "reparado") return <Etiqueta tom="aguardando">Reparado</Etiqueta>;
  if (resultado === "verificado") return <Etiqueta tom="ok">Verificado</Etiqueta>;

  /* Estado que não deveria chegar ao público: uma certificação publicada não
     tem item pendente. Aparece como pendente em vez de sumir — esconder um
     item sem resultado faria a lista parecer completa. */
  return <Etiqueta tom="alerta">Sem resultado</Etiqueta>;
}
