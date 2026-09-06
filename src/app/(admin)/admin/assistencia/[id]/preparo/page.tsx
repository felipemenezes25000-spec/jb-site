import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckSquare,
  ClipboardList,
  FileText,
  Image as ImagemIcone,
  MapPin,
  ShieldCheck,
} from "lucide-react";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { Cartao, Etiqueta } from "@/components/ui/data";
import { ROTULO_URGENCIA } from "@/lib/assistencia";
import { formatarData, formatarDataHora } from "@/lib/format";
import { exigirArea } from "@/lib/permissoes";
import {
  apresentarSugestao,
  checklistDaVisita,
  conflitosComOHistorico,
} from "@/lib/preparo-da-visita";
import { prisma } from "@/lib/prisma";
import { ROTULO_EQUIPAMENTO } from "@/lib/rotulos-equipamento";

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

export const metadata: Metadata = {
  title: "Preparo da visita",
  robots: { index: false, follow: false },
};

/* ============================================================================
   Preparo da visita

   A tela que o técnico abre no celular antes de sair. Tudo aqui vem de
   registro — chamado, prontuário, OS anteriores — e nada é gerado por resumo
   automático.

   O bloco de conflito com o histórico é o que justifica a página existir. Um
   chamado que se parece com o atendimento de dois meses atrás precisa ser
   olhado com essa informação à vista; sem ela, o técnico repete o reparo e o
   equipamento volta.
   ============================================================================ */

type Props = { params: Promise<{ id: string }> };

function Bloco({
  titulo,
  icone: Icone,
  children,
}: {
  titulo: string;
  icone: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <Cartao className="p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-graf-950">
        <Icone className="size-4 shrink-0 text-graf-400" aria-hidden />
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </Cartao>
  );
}

export default async function PaginaPreparo({ params }: Props) {
  /* Área de assistência: o técnico tem acesso de leitura, e o escopo pede que
     a autorização seja de papel e não só de existência de sessão staff. */
  await exigirArea("assistencia");
  const { id } = await params;

  const chamado = await prisma.serviceRequest.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      status: true,
      urgency: true,
      description: true,
      problemKind: true,
      createdAt: true,
      availability: true,
      contactName: true,
      contactPhone: true,
      brandName: true,
      modelName: true,
      serialNumber: true,
      addressStreet: true,
      addressNumber: true,
      addressComplement: true,
      addressDistrict: true,
      addressCity: true,
      addressState: true,
      customer: { select: { name: true } },
      _count: { select: { media: true } },
      equipment: {
        select: {
          id: true,
          name: true,
          brandName: true,
          modelName: true,
          serialNumber: true,
          status: true,
          room: true,
          warrantyUntil: true,
          lastMaintenanceAt: true,
          location: { select: { name: true } },
          _count: { select: { documents: true } },
        },
      },
      workOrders: {
        orderBy: { openedAt: "desc" },
        take: 5,
        select: {
          number: true,
          openedAt: true,
          closedAt: true,
          diagnosis: true,
          items: { select: { description: true, kind: true } },
        },
      },
    },
  });

  if (!chamado) notFound();

  const equipamento = chamado.equipment;
  const garantiaVigente = Boolean(
    equipamento?.warrantyUntil && equipamento.warrantyUntil.getTime() > Date.now(),
  );

  /* Peças já registradas em OS anterior deste chamado. Não é palpite: é o que
     a equipe efetivamente lançou. */
  const pecas = chamado.workOrders
    .flatMap((ordem) => ordem.items)
    .filter((item) => item.kind === "peca")
    .map((item) => item.description)
    .filter(Boolean);

  const chamados12Meses = equipamento
    ? await prisma.serviceRequest.count({
        where: {
          equipmentId: equipamento.id,
          createdAt: { gte: new Date(Date.now() - 365 * 86_400_000) },
        },
      })
    : 0;

  const checklist = checklistDaVisita({
    situacao: equipamento?.status ?? "operacional",
    garantiaVigente,
    pecasSelecionadas: [...new Set(pecas)],
    chamados12Meses,
    temMidia: chamado._count.media > 0,
    temSerial: Boolean(equipamento?.serialNumber || chamado.serialNumber),
  });

  const conflitos = conflitosComOHistorico(
    chamado.description,
    chamado.workOrders
      .filter((ordem) => ordem.closedAt && ordem.diagnosis)
      .map((ordem) => ({
        numero: ordem.number,
        quando: ordem.closedAt as Date,
        diagnostico: ordem.diagnosis,
      })),
  );

  /* Nenhuma sugestão automatizada é gerada neste projeto. A chamada existe
     para a porta ficar visível: o dia em que alguém acrescentar uma, ela passa
     por aqui e sai marcada como interna, a confirmar. */
  const sugestao = apresentarSugestao(null);

  const endereco = [
    [chamado.addressStreet, chamado.addressNumber].filter(Boolean).join(", "),
    chamado.addressComplement,
    chamado.addressDistrict,
    [chamado.addressCity, chamado.addressState].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Assistência", href: "/admin/assistencia" },
          { rotulo: chamado.number, href: `/admin/assistencia/${chamado.id}` },
          { rotulo: "Preparo" },
        ]}
        titulo={`Preparo da visita · ${chamado.number}`}
        descricao={`Aberto em ${formatarDataHora(chamado.createdAt)}`}
        etiqueta={
          <Etiqueta
            tom={
              /* "parado" e "alta" pedem destaque; o resto não. Urgência
                 desenhada toda igual não prioriza nada. */
              chamado.urgency === "parado" || chamado.urgency === "alta" ? "alerta" : "neutro"
            }
          >
            {ROTULO_URGENCIA[chamado.urgency]}
          </Etiqueta>
        }
        acoes={
          <Link
            href={`/admin/assistencia/${chamado.id}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-graf-300 bg-white px-3.5 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Chamado completo
          </Link>
        }
      />

      {/* ------------------------------------------------ conflito --- */}
      {conflitos.length > 0 ? (
        <Aviso tom="atencao" titulo="O relato se parece com um atendimento recente">
          <ul className="mt-1 space-y-2">
            {conflitos.map((conflito) => (
              <li key={conflito.anterior.numero} className="leading-relaxed">
                {conflito.texto}
                <span className="mt-0.5 block text-[0.8125rem] text-graf-600">
                  {conflito.anterior.numero}, {formatarData(conflito.anterior.quando)}:{" "}
                  {conflito.anterior.diagnostico}
                </span>
              </li>
            ))}
          </ul>
        </Aviso>
      ) : null}

      {/* ------------------------------------------------ onde é --- */}
      <Bloco titulo="Onde é" icone={MapPin}>
        <dl className="space-y-2 text-[0.9375rem]">
          <Par rotulo="Cliente" valor={chamado.customer?.name ?? chamado.contactName} />
          <Par rotulo="Contato" valor={chamado.contactPhone || "não informado"} />
          <Par rotulo="Endereço" valor={endereco || "não informado"} />
          <Par
            rotulo="Unidade e sala"
            valor={
              [equipamento?.location?.name, equipamento?.room].filter(Boolean).join(" · ") ||
              "não informado"
            }
          />
          {chamado.availability ? (
            <Par rotulo="Disponibilidade" valor={chamado.availability} />
          ) : null}
        </dl>
      </Bloco>

      {/* ------------------------------------------ o equipamento --- */}
      <Bloco titulo="O equipamento" icone={ClipboardList}>
        {equipamento ? (
          <dl className="space-y-2 text-[0.9375rem]">
            <Par rotulo="Aparelho" valor={equipamento.name} />
            <Par
              rotulo="Marca e modelo"
              valor={
                [equipamento.brandName, equipamento.modelName].filter(Boolean).join(" ") ||
                "não cadastrados"
              }
            />
            <Par rotulo="Série" valor={equipamento.serialNumber || "a atribuir"} />
            <Par rotulo="Situação" valor={ROTULO_EQUIPAMENTO[equipamento.status]} />
            <Par
              rotulo="Última manutenção"
              valor={
                equipamento.lastMaintenanceAt
                  ? formatarData(equipamento.lastMaintenanceAt)
                  : "sem registro"
              }
            />
            <Par
              rotulo="Documentos no prontuário"
              valor={`${equipamento._count.documents}`}
            />
          </dl>
        ) : (
          /* Chamado sem equipamento cadastrado usa o que o cliente informou —
             e diz que é isso, para o técnico não confundir com prontuário. */
          <>
            <p className="text-[0.875rem] leading-relaxed text-graf-600">
              Este chamado não está vinculado a um equipamento do prontuário. Abaixo, o que o
              cliente informou.
            </p>
            <dl className="mt-3 space-y-2 text-[0.9375rem]">
              <Par rotulo="Marca" valor={chamado.brandName || "não informada"} />
              <Par rotulo="Modelo" valor={chamado.modelName || "não informado"} />
              <Par rotulo="Série" valor={chamado.serialNumber || "não informada"} />
            </dl>
          </>
        )}

        {garantiaVigente && equipamento?.warrantyUntil ? (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-ok-500/25 bg-ok-50 px-3 py-2 text-[0.8125rem] font-semibold text-ok-700">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            Garantia vigente até {formatarData(equipamento.warrantyUntil)}
          </p>
        ) : null}
      </Bloco>

      {/* ---------------------------------------------- o relato --- */}
      <Bloco titulo="O que o cliente relatou" icone={FileText}>
        {/* Texto do cliente é dado, e é exibido como texto. Nada aqui o
            interpreta como instrução nem deixa que ele altere a tela. */}
        <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-graf-800">
          {chamado.description}
        </p>
        {chamado._count.media > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-graf-600">
            <ImagemIcone className="size-4 shrink-0 text-graf-400" aria-hidden />
            {chamado._count.media}{" "}
            {chamado._count.media === 1 ? "arquivo anexado" : "arquivos anexados"} — veja no
            chamado completo antes de sair.
          </p>
        ) : null}
      </Bloco>

      {/* -------------------------------------------- checklist --- */}
      <Bloco titulo="Antes de sair" icone={CheckSquare}>
        <ul className="space-y-3">
          {checklist.map((item) => (
            <li key={item.texto}>
              <p className="text-[0.9375rem] font-semibold text-graf-900">{item.texto}</p>
              {/* Por que este item está aqui. Uma lista genérica é ignorada
                  na terceira visita; uma que muda com o caso é lida. */}
              <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-graf-600">
                {item.porque}
              </p>
            </li>
          ))}
        </ul>
      </Bloco>

      {/* -------------------------------------- últimas intervenções --- */}
      {chamado.workOrders.length > 0 ? (
        <Bloco titulo="Últimas intervenções neste chamado" icone={ClipboardList}>
          <ul className="space-y-3">
            {chamado.workOrders.map((ordem) => (
              <li key={ordem.number} className="border-b border-graf-100 pb-3 last:border-0">
                <p className="text-[0.9375rem] font-semibold text-graf-900">
                  {ordem.number}
                  <span className="ml-2 text-[0.8125rem] font-normal text-graf-500">
                    {ordem.closedAt
                      ? `concluída em ${formatarData(ordem.closedAt)}`
                      : `aberta em ${formatarData(ordem.openedAt)}`}
                  </span>
                </p>
                {ordem.diagnosis ? (
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-graf-700">
                    {ordem.diagnosis}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.8125rem] text-graf-500">
            O histórico completo está no chamado e no prontuário do equipamento — nada foi
            resumido de forma a esconder o resto.
          </p>
        </Bloco>
      ) : null}

      {/* ------------------------------------------- sugestão --- */}
      {sugestao.mostrar ? (
        <Aviso tom="info" titulo="Sugestão interna">
          {sugestao.sugestao.texto}
          <span className="mt-2 block text-[0.8125rem]">{sugestao.aviso}</span>
        </Aviso>
      ) : (
        <p className="flex gap-2 text-[0.8125rem] leading-relaxed text-graf-500">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-graf-400" aria-hidden />
          <span>
            Este preparo é montado a partir dos registros, sem resumo automático. {sugestao.mostrar ? "" : sugestao.motivo}
          </span>
        </p>
      )}
    </div>
  );
}

function Par({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="text-graf-500">{rotulo}</dt>
      <dd className="font-semibold text-graf-900">{valor}</dd>
    </div>
  );
}
