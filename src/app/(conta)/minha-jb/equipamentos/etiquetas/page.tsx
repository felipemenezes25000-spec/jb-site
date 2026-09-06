import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Printer, QrCode } from "lucide-react";

import { Topo } from "@/components/conta/mj-topo";
import { BotaoImprimir } from "@/components/conta/mj-imprimir";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { exigirCliente } from "@/lib/auth-cliente";
import { codigoLegivel, novoLocalizador } from "@/lib/etiqueta";
import { prisma } from "@/lib/prisma";
import { svgDoQr } from "@/lib/qr";
import { urlAbsoluta } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Etiquetas dos equipamentos",
  robots: { index: false, follow: false },
};

/* ============================================================================
   Folha de etiquetas

   Uma etiqueta por equipamento, com QR, nome e código legível. A folha é
   impressa pelo navegador — sem PDF, sem dependência a mais, e com a
   vantagem de a pessoa poder escolher a impressora e o papel que tem.

   Reimprimir NÃO duplica equipamento nem troca o localizador. O código é
   gerado uma vez e guardado; a segunda impressão sai igual à primeira, e a
   etiqueta que já está colada continua valendo. É a razão de o localizador ser
   coluna e não algo derivado da hora da impressão.
   ============================================================================ */

/**
 * Garante que cada equipamento da clínica tenha localizador.
 *
 * Gerar aqui, e não no cadastro, tem um motivo prático: equipamento
 * cadastrado antes desta funcionalidade existir não tem código, e criar um
 * para todos de uma vez encheria a coluna de valores que ninguém imprimiu.
 * Aqui, o código nasce quando a etiqueta vai existir de fato.
 */
async function garantirLocalizadores(customerId: string) {
  const semCodigo = await prisma.equipment.findMany({
    where: { customerId, locator: null },
    select: { id: true },
  });

  for (const equipamento of semCodigo) {
    /* Um a um, e não `updateMany`: cada linha precisa de um código próprio.
       A colisão é improvável (15 bytes), e o índice único do banco é quem
       decide de verdade — se ela acontecer, a escrita falha em vez de dois
       equipamentos passarem a compartilhar etiqueta. */
    await prisma.equipment.update({
      where: { id: equipamento.id },
      data: { locator: novoLocalizador() },
    });
  }
}

export default async function EtiquetasPage() {
  const cliente = await exigirCliente("/minha-jb/equipamentos/etiquetas");
  await garantirLocalizadores(cliente.id);

  const equipamentos = await prisma.equipment.findMany({
    where: { customerId: cliente.id, status: { not: "desativado" } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      brandName: true,
      modelName: true,
      serialNumber: true,
      locator: true,
      location: { select: { name: true } },
      room: true,
    },
  });

  const etiquetas = await Promise.all(
    equipamentos
      .filter((equipamento) => Boolean(equipamento.locator))
      .map(async (equipamento) => ({
        ...equipamento,
        locator: equipamento.locator as string,
        qr: await svgDoQr(urlAbsoluta(`/e/${equipamento.locator}`)),
      })),
  );

  return (
    <div>
      <div className="print:hidden">
        <Topo
          titulo="Etiquetas dos equipamentos"
          descricao="Uma etiqueta por equipamento, com QR e código. Cole no aparelho: quem apontar a câmera vai direto para a ficha dele — depois de entrar na conta."
          acoes={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/minha-jb/equipamentos"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-graf-300 bg-white px-3.5 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <ArrowLeft className="size-4" aria-hidden />
                Voltar
              </Link>
              <BotaoImprimir />
            </div>
          }
        />

        <Aviso tom="info" titulo="O QR não é senha" className="mb-6">
          Ele diz <em>de que equipamento se trata</em>, e nada mais. Quem apontar a câmera
          precisa entrar na conta da clínica para ver a ficha — e alguém de outra clínica não vê
          nada, mesmo com a etiqueta na mão. Reimprimir não muda o código: a etiqueta antiga
          continua valendo.
        </Aviso>
      </div>

      {etiquetas.length === 0 ? (
        <Vazio
          icone={QrCode}
          titulo="Nenhum equipamento para etiquetar"
          descricao="Cadastre um equipamento no prontuário e a etiqueta dele aparece aqui."
          acao={
            <LinkBotao href="/minha-jb/equipamentos/novo" tamanho="sm">
              Cadastrar equipamento
            </LinkBotao>
          }
        />
      ) : (
        /* Grade de impressão: três colunas em A4, quebrando por etiqueta.
           `break-inside-avoid` impede que uma etiqueta seja cortada ao meio na
           virada de página — o QR cortado não lê. */
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3 print:gap-2">
          {etiquetas.map((etiqueta) => (
            <li
              key={etiqueta.id}
              className="flex break-inside-avoid flex-col items-center gap-2 rounded-lg border border-graf-300 bg-white p-3 text-center print:border-graf-400"
            >
              <p className="label-mono text-[0.625rem] uppercase tracking-wide text-graf-500">
                JB · Prontuário Técnico
              </p>

              {/* O SVG vem de `qrcode`, gerado no servidor a partir de uma URL
                  que este arquivo monta. Não há entrada de usuário nele. */}
              <div
                className="size-[132px] shrink-0"
                aria-hidden
                dangerouslySetInnerHTML={{ __html: etiqueta.qr }}
              />

              <p className="text-[0.8125rem] font-bold leading-tight text-graf-950">
                {etiqueta.name}
              </p>
              <p className="text-[0.6875rem] leading-tight text-graf-600">
                {[etiqueta.brandName, etiqueta.modelName].filter(Boolean).join(" ") || "—"}
              </p>
              {etiqueta.serialNumber ? (
                <p className="label-mono text-[0.625rem] text-graf-500">
                  Série {etiqueta.serialNumber}
                </p>
              ) : null}

              <p className="label-mono mt-auto text-[0.6875rem] tracking-wide text-graf-700">
                {codigoLegivel(etiqueta.locator)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-[0.75rem] text-graf-400 print:mt-3">
        {etiquetas.length}{" "}
        {etiquetas.length === 1 ? "etiqueta" : "etiquetas"} ·{" "}
        <Printer className="inline size-3" aria-hidden /> imprima em papel branco, sem reduzir a
        escala
      </p>
    </div>
  );
}
