import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotaoImprimir } from "@/components/admin/servico/botao-imprimir";
import { formatarData, formatarDataHora, formatarPreco, plural } from "@/lib/format";
import { ROTULO_OS } from "@/lib/os";
import { exigirArea } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { enderecoCompleto, getSettings } from "@/lib/settings";

/**
 * Via da OS para impressão.
 *
 * É uma rota própria em vez de um `@media print` na tela cheia de botões: a
 * pessoa abre, confere e imprime — ou salva em PDF pelo próprio diálogo do
 * navegador. Na hora de imprimir, a folha de estilo abaixo apaga a casca do
 * painel (menu lateral, cabeçalho) escondendo tudo e revelando só este bloco.
 * Esconder por `visibility` em vez de `display` preserva o fluxo do documento,
 * que é o que faz a quebra de página se comportar.
 *
 * O conteúdo é só o que existe: nada de campo em branco com linha pontilhada
 * fingindo dado. O aceite aparece preenchido quando foi colhido no sistema e,
 * quando não foi, vira linha de assinatura no papel — que é o que a via
 * impressa serve para resolver.
 */

const ESTILO_IMPRESSAO = `
@media print {
  body * { visibility: hidden !important; }
  #os-impressao, #os-impressao * { visibility: visible !important; }
  #os-impressao {
    position: absolute;
    inset: 0 auto auto 0;
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    box-shadow: none;
    background: #fff;
  }
  .sem-impressao { display: none !important; }
  #os-impressao .quebra-evitar { break-inside: avoid; }
}
@page { margin: 14mm; }
`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ordem = await prisma.workOrder.findUnique({ where: { id }, select: { number: true } });
  return { title: ordem ? `OS ${ordem.number} — impressão` : "Impressão" };
}

export default async function PaginaImpressaoOS({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirArea("os");
  const { id } = await params;

  const [ordem, config] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id },
      include: {
        technician: { select: { user: { select: { name: true } } } },
        equipment: {
          select: {
            name: true,
            brandName: true,
            modelName: true,
            serialNumber: true,
            voltage: true,
            room: true,
            location: { select: { name: true } },
            customer: {
              select: { name: true, email: true, phone: true, document: true },
            },
          },
        },
        request: { select: { number: true, addressStreet: true, addressNumber: true, addressDistrict: true, addressCity: true, addressState: true } },
        items: { orderBy: { order: "asc" } },
        checklist: { orderBy: { order: "asc" } },
      },
    }),
    getSettings(),
  ]);

  if (!ordem) notFound();

  const cliente = ordem.equipment?.customer;
  const enderecoDoChamado = ordem.request
    ? [
        [ordem.request.addressStreet, ordem.request.addressNumber].filter(Boolean).join(", "),
        ordem.request.addressDistrict,
        [ordem.request.addressCity, ordem.request.addressState].filter(Boolean).join("/"),
      ]
        .filter(Boolean)
        .join(" — ")
    : "";

  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_IMPRESSAO }} />

      <div className="sem-impressao flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/os/${ordem.id}`}
          className="text-sm font-semibold text-jb-700 hover:text-jb-500"
        >
          ← Voltar para a OS {ordem.number}
        </Link>
        <BotaoImprimir rotulo="Imprimir ou salvar em PDF" />
      </div>

      <article
        id="os-impressao"
        className="mx-auto max-w-[210mm] rounded-xl border border-graf-200 bg-white p-8 text-graf-900 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        {/* -------------------------------------------------- cabeçalho */}
        <header className="quebra-evitar flex flex-wrap items-start justify-between gap-4 border-b-2 border-graf-900 pb-4">
          <div>
            <p className="text-lg font-bold">{config.empresa_nome}</p>
            <p className="mt-1 text-xs leading-relaxed text-graf-600">
              {enderecoCompleto(config)}
              {config.endereco_cep ? ` — CEP ${config.endereco_cep}` : ""}
            </p>
            <p className="text-xs text-graf-600">
              {config.telefone}
              {config.email ? ` · ${config.email}` : ""}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-graf-500">
              Ordem de serviço
            </p>
            <p className="label-mono text-xl font-bold">{ordem.number}</p>
            <p className="text-xs text-graf-600">
              Aberta em {formatarDataHora(ordem.openedAt)}
            </p>
            <p className="text-xs text-graf-600">Situação: {ROTULO_OS[ordem.status]}</p>
          </div>
        </header>

        {/* ----------------------------------------------------- cliente */}
        <section className="quebra-evitar mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Bloco rotulo="Cliente" valor={cliente?.name || ordem.customerName} />
          <Bloco rotulo="Documento" valor={cliente?.document} />
          <Bloco rotulo="E-mail" valor={cliente?.email} />
          <Bloco rotulo="Telefone" valor={cliente?.phone} />
          <Bloco
            rotulo="Local do atendimento"
            valor={
              enderecoDoChamado ||
              [ordem.equipment?.location?.name, ordem.equipment?.room].filter(Boolean).join(" — ")
            }
            largo
          />
        </section>

        {/* ------------------------------------------------- equipamento */}
        <section className="quebra-evitar mt-5 border-t border-graf-200 pt-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-graf-500">
            Equipamento
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Bloco rotulo="Descrição" valor={ordem.equipment?.name} />
            <Bloco
              rotulo="Marca / modelo"
              valor={[ordem.equipment?.brandName, ordem.equipment?.modelName]
                .filter(Boolean)
                .join(" ")}
            />
            <Bloco rotulo="Número de série" valor={ordem.equipment?.serialNumber} />
            <Bloco rotulo="Tensão" valor={ordem.equipment?.voltage} />
            {ordem.request ? (
              <Bloco rotulo="Chamado de origem" valor={ordem.request.number} />
            ) : null}
            <Bloco rotulo="Técnico responsável" valor={ordem.technician?.user.name} />
          </div>
        </section>

        {/* ------------------------------------------------------- laudo */}
        <section className="mt-5 space-y-3 border-t border-graf-200 pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-graf-500">
            Laudo técnico
          </h2>
          <Paragrafo rotulo="Defeito relatado" texto={ordem.reportedIssue} />
          <Paragrafo rotulo="Diagnóstico" texto={ordem.diagnosis} />
          <Paragrafo rotulo="Serviço executado" texto={ordem.workDone} />
          <Paragrafo rotulo="Teste final" texto={ordem.finalTest} />
        </section>

        {/* ------------------------------------------------------- itens */}
        {ordem.items.length > 0 ? (
          <section className="mt-5 border-t border-graf-200 pt-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-graf-500">
              Peças, serviços e deslocamento
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-graf-300 text-left text-xs uppercase tracking-wide text-graf-500">
                  <th scope="col" className="py-1.5 pr-2 font-semibold">
                    Descrição
                  </th>
                  <th scope="col" className="py-1.5 px-2 text-right font-semibold">
                    Qtd.
                  </th>
                  <th scope="col" className="py-1.5 px-2 text-right font-semibold">
                    Unitário
                  </th>
                  <th scope="col" className="py-1.5 pl-2 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {ordem.items.map((item) => (
                  <tr key={item.id} className="border-b border-graf-100">
                    <td className="py-1.5 pr-2">{item.description}</td>
                    <td className="tabular py-1.5 px-2 text-right">{item.quantity}</td>
                    <td className="tabular py-1.5 px-2 text-right">
                      {formatarPreco(item.unitPriceCents)}
                    </td>
                    <td className="tabular py-1.5 pl-2 text-right font-medium">
                      {formatarPreco(item.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="mt-3 ml-auto w-full max-w-xs space-y-1 text-sm">
              <Total rotulo="Peças" valor={ordem.partsCents} />
              <Total rotulo="Mão de obra" valor={ordem.laborCents} />
              <Total rotulo="Deslocamento" valor={ordem.travelCents} />
              {ordem.discountCents > 0 ? (
                <Total rotulo="Desconto" valor={-ordem.discountCents} />
              ) : null}
              <div className="flex items-center justify-between border-t border-graf-300 pt-1.5">
                <dt className="font-bold">Total</dt>
                <dd className="tabular text-base font-bold">{formatarPreco(ordem.totalCents)}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        {/* --------------------------------------------------- checklist */}
        {ordem.checklist.length > 0 ? (
          <section className="quebra-evitar mt-5 border-t border-graf-200 pt-4">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-graf-500">
              Checklist de conferência
            </h2>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {ordem.checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <span aria-hidden className="mt-px font-bold">
                    {item.done ? "[x]" : "[ ]"}
                  </span>
                  <span>
                    <span className="sr-only">{item.done ? "Conferido: " : "Não conferido: "}</span>
                    {item.label}
                    {item.note ? (
                      <span className="block text-xs text-graf-500">{item.note}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ---------------------------------------------------- garantia */}
        {ordem.serviceWarrantyDays ? (
          <p className="quebra-evitar mt-5 border-t border-graf-200 pt-4 text-sm">
            <strong className="font-bold">Garantia do serviço:</strong>{" "}
            {plural(ordem.serviceWarrantyDays, "dia", "dias")} a partir da conclusão
            {ordem.closedAt ? ` em ${formatarData(ordem.closedAt)}` : ""}.
          </p>
        ) : null}

        {/* ------------------------------------------------------ aceite */}
        <section className="quebra-evitar mt-8 border-t border-graf-300 pt-5">
          {ordem.acceptedAt ? (
            <p className="text-sm">
              <strong className="font-bold">Recebido por:</strong> {ordem.acceptedByName} —{" "}
              {formatarData(ordem.acceptedAt)}
              {ordem.acceptedIp ? ` (registro eletrônico, IP ${ordem.acceptedIp})` : ""}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs text-graf-600">
              <p className="border-t border-graf-500 pt-1.5">
                Assinatura do responsável pelo equipamento
              </p>
              <p className="border-t border-graf-500 pt-1.5">
                {ordem.technician?.user.name ?? "Assinatura do técnico"}
              </p>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-[11px] text-graf-500">
          {config.empresa_nome} · OS {ordem.number} · via emitida em{" "}
          {formatarDataHora(new Date())}
        </p>
      </article>
    </div>
  );
}

function Bloco({
  rotulo,
  valor,
  largo,
}: {
  rotulo: string;
  valor?: string | null;
  largo?: boolean;
}) {
  if (!valor) return null;
  return (
    <div className={largo ? "col-span-2" : undefined}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-graf-500">{rotulo}</p>
      <p className="mt-0.5">{valor}</p>
    </div>
  );
}

function Paragrafo({ rotulo, texto }: { rotulo: string; texto: string }) {
  if (!texto.trim()) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-graf-500">{rotulo}</p>
      <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed">{texto}</p>
    </div>
  );
}

function Total({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-graf-600">{rotulo}</dt>
      <dd className="tabular">{formatarPreco(valor)}</dd>
    </div>
  );
}
