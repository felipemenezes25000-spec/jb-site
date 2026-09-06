import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { BotaoImprimir } from "@/components/conta/mj-imprimir";
import { Aviso } from "@/components/ui/aviso";
import { Vazio } from "@/components/ui/data";
import { frasedaVerificacao } from "@/lib/certificacao";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { svgDoQr } from "@/lib/qr";
import { urlAbsoluta } from "@/lib/seo";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export const metadata: Metadata = { title: "Etiquetas de certificação" };

/* ============================================================================
   Etiquetas do Seminovo JB Certificado

   O outro QR do projeto, e ele não tem nada a ver com o do prontuário:

   - vai para `/verificar/<código público>`, que é página pública;
   - mostra só o que a certificação autoriza — checklist, versão, técnico;
   - **não** carrega número de série, id de unidade, token de chamado nem
     link de documento.

   O código público já é opaco por construção (`gerarCodigoPublico`), e é ele
   que viaja no QR. Reaproveitar aqui um link de prontuário seria colar, num
   equipamento à venda, o endereço da ficha privada de alguém.
   ============================================================================ */

export default async function PaginaEtiquetasDeCertificacao() {
  await exigirArea("estoque");

  /* Só certificação PUBLICADA ganha etiqueta. Uma inspeção em preparação
     impressa e colada na caixa afirmaria ao comprador algo que ninguém
     liberou — e o selo não é retroativo. */
  const certificacoes = await prisma.unitCertification.findMany({
    where: { status: "publicada" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      publicCode: true,
      checklistVersion: true,
      itemsTotal: true,
      itemsApproved: true,
      itemsNotApplicable: true,
      publishedAt: true,
      unit: {
        select: {
          serialNumber: true,
          product: { select: { name: true, brand: { select: { name: true } } } },
        },
      },
    },
  });

  const etiquetas = await Promise.all(
    certificacoes.map(async (certificacao) => ({
      ...certificacao,
      qr: await svgDoQr(urlAbsoluta(`/verificar/${certificacao.publicCode}`)),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <CabecalhoDeSecao
          trilha={[{ rotulo: "Estoque", href: "/admin/estoque" }, { rotulo: "Etiquetas" }]}
          titulo="Etiquetas de certificação"
          descricao="Uma etiqueta por unidade com certificação publicada. Cole na embalagem ou no equipamento à venda."
          acoes={etiquetas.length > 0 ? <BotaoImprimir /> : undefined}
        />

        <Aviso tom="info" titulo="O que este QR mostra — e o que não mostra" className="mt-4">
          Ele abre a página pública de verificação daquela unidade: itens conferidos, versão do
          checklist e quem inspecionou. <strong>Não</strong> leva ao prontuário de ninguém, não
          carrega o número de série e não abre documento privado. É outro QR, com outro
          propósito, e os dois nunca se misturam.
        </Aviso>
      </div>

      {etiquetas.length === 0 ? (
        <Vazio
          icone={ShieldCheck}
          titulo="Nenhuma certificação publicada"
          descricao="A etiqueta só existe para unidade com inspeção concluída e publicada. Em preparação ou revogada não gera etiqueta."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
          {etiquetas.map((etiqueta) => (
            <li
              key={etiqueta.id}
              className="flex break-inside-avoid flex-col items-center gap-2 rounded-lg border border-graf-300 bg-white p-3 text-center print:border-graf-400"
            >
              <p className="label-mono text-xs uppercase tracking-wide print:text-[0.625rem] text-jb-700">
                Seminovo JB Certificado
              </p>

              <div
                className="size-[132px] shrink-0"
                aria-hidden
                dangerouslySetInnerHTML={{ __html: etiqueta.qr }}
              />

              <p className="text-[0.8125rem] font-bold leading-tight text-graf-950">
                {etiqueta.unit.product.name}
              </p>
              {etiqueta.unit.product.brand ? (
                <p className="text-xs text-graf-600 print:text-[0.6875rem]">
                  {etiqueta.unit.product.brand.name}
                </p>
              ) : null}

              <p className="text-xs leading-tight text-graf-500 print:text-[0.625rem]">
                {/* Publicada não tem pendente por definição — `podePublicar`
                    recusa checklist pela metade. Os números vieram gravados no
                    fechamento, e recontar aqui daria outro resultado se o
                    checklist tivesse mudado de versão desde então. */}
                {frasedaVerificacao({
                  total: etiqueta.itemsTotal,
                  aprovados: etiqueta.itemsApproved,
                  naoAplicaveis: etiqueta.itemsNotApplicable,
                  pendentes: 0,
                })}
              </p>

              <p className="label-mono mt-auto text-xs tracking-wide text-graf-700 print:text-[0.6875rem]">
                {etiqueta.publicCode}
              </p>

              <Link
                href={`/verificar/${etiqueta.publicCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-jb-700 underline print:text-[0.6875rem] underline-offset-2 print:hidden"
              >
                Conferir
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
