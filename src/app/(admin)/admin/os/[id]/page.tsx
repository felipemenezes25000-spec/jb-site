import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { WorkOrderStatus } from "@prisma/client";
import { MonitorCog, ShieldCheck, Stethoscope } from "lucide-react";

import { CabecalhoPagina, Dado, Dados } from "@/components/admin/servico/cabecalho";
import { ChecklistDaOS } from "@/components/admin/servico/checklist-os";
import { ConcluirOS } from "@/components/admin/servico/conclusao-os";
import { EtiquetaOS } from "@/components/admin/servico/etiquetas";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { ItensDaOS } from "@/components/admin/servico/itens-os";
import { MidiasDaOS } from "@/components/admin/servico/midias-os";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { LinkBotao } from "@/components/ui/button";
import { CabecalhoCartao, Cartao, LinhaDoTempo } from "@/components/ui/data";
import { Marcador } from "@/components/ui/form";
import {
  mudarStatusDaOS,
  salvarLaudoDaOS,
} from "@/app/acoes/admin-servico";
import { formatarData, formatarDataHora, plural } from "@/lib/format";
import { ROTULO_OS, passosDaOS } from "@/lib/os";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

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

/**
 * Ficha da ordem de serviço.
 *
 * Sobre "tempo gasto": `WorkOrder` não tem coluna de horas. O que existe de
 * verdade são duas medidas, e as duas aparecem porque significam coisas
 * diferentes — o tempo que a OS passou aberta (do `openedAt` ao fechamento) e
 * as horas de mão de obra lançadas como itens de serviço, que são as que o
 * cliente paga. Inventar um terceiro número seria inventar dado.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ordem = await prisma.workOrder.findUnique({ where: { id }, select: { number: true } });
  return { title: ordem ? `OS ${ordem.number}` : "Ordem de serviço" };
}

/** "3 dias e 5 h" — arredondado, porque é referência e não faturamento. */
function duracaoLegivel(de: Date, ate: Date) {
  const minutos = Math.max(0, Math.round((ate.getTime() - de.getTime()) / 60_000));
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  if (dias > 0) return `${plural(dias, "dia", "dias")}${horas > 0 ? ` e ${horas} h` : ""}`;
  if (horas > 0) return `${horas} h${minutos % 60 > 0 ? ` e ${minutos % 60} min` : ""}`;
  return `${minutos} min`;
}

export default async function PaginaOrdem({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirArea("os");
  const { id } = await params;

  const ordem = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      technician: { select: { id: true, user: { select: { name: true } } } },
      equipment: {
        select: {
          id: true,
          name: true,
          brandName: true,
          modelName: true,
          serialNumber: true,
          customer: { select: { id: true, name: true } },
        },
      },
      request: {
        select: { id: true, number: true, status: true, description: true },
      },
      items: { orderBy: { order: "asc" } },
      checklist: { orderBy: { order: "asc" } },
      media: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          phase: true,
          media: { select: { url: true, alt: true, mime: true, filename: true } },
        },
      },
      events: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" }, select: { id: true, title: true, kind: true, createdAt: true } },
    },
  });

  if (!ordem) notFound();

  const editar = podeEditar(usuario, "os");

  const [tecnicos, autores] = await Promise.all([
    prisma.technician.findMany({
      where: { active: true },
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: {
        id: {
          in: [...new Set(ordem.events.flatMap((evento) => (evento.userId ? [evento.userId] : [])))],
        },
      },
      select: { id: true, name: true },
    }),
  ]);

  const nomeDoAutor = new Map(autores.map((autor) => [autor.id, autor.name]));

  const horasDeServico = ordem.items
    .filter((item) => item.kind === "servico")
    .reduce((soma, item) => soma + item.quantity, 0);

  const fechada = ordem.status === "concluida" || ordem.status === "cancelada";
  const tempoEmAberto = duracaoLegivel(ordem.openedAt, ordem.closedAt ?? new Date());

  const statusDisponiveis = (Object.keys(ROTULO_OS) as WorkOrderStatus[]).filter(
    (status) => status !== "concluida",
  );

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Ordens de serviço", href: "/admin/os" },
          { rotulo: ordem.number },
        ]}
        titulo={`OS ${ordem.number}`}
        descricao={`Aberta em ${formatarDataHora(ordem.openedAt)}${
          ordem.closedAt ? ` · encerrada em ${formatarDataHora(ordem.closedAt)}` : ""
        }`}
        etiquetas={<EtiquetaOS status={ordem.status} />}
        acoes={
          <>
            <LinkBotao href={`/admin/os/${ordem.id}/imprimir`} variante="secundario" tamanho="md">
              Via para impressão
            </LinkBotao>

            {editar ? (
              <PainelAcao
                rotulo="Mudar status"
                variante="secundario"
                tamanho="md"
                titulo="Mudar o status da OS"
                descricao="Para concluir, use “Concluir OS”: o fechamento precisa do aceite."
                acao={mudarStatusDaOS}
                rotuloConfirmar="Gravar status"
              >
                <>
                  <Oculto nome="ordemId" valor={ordem.id} />
                  <SelecaoAcao
                    rotulo="Novo status"
                    name="status"
                    defaultValue={fechada ? "aberta" : ordem.status}
                    required
                  >
                    {statusDisponiveis.map((status) => (
                      <option key={status} value={status}>
                        {ROTULO_OS[status]}
                      </option>
                    ))}
                  </SelecaoAcao>
                  <AreaAcao rotulo="Observação" name="nota" rows={3} />
                  <Marcador
                    name="visivel"
                    defaultChecked
                    rotulo="Mostrar ao cliente"
                    ajuda="Desmarque para registrar sem expor no acompanhamento."
                  />
                </>
              </PainelAcao>
            ) : null}

            {editar && !fechada ? (
              <ConcluirOS
                ordemId={ordem.id}
                numero={ordem.number}
                diagnostico={ordem.diagnosis}
                servicoExecutado={ordem.workDone}
                testeFinal={ordem.finalTest}
                garantiaDias={ordem.serviceWarrantyDays}
                temChamado={Boolean(ordem.requestId)}
                temItens={ordem.items.length > 0}
              />
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ------------------------------------------------ identificação */}
          <Cartao>
            <CabecalhoCartao titulo="Identificação" descricao="Quem, o quê e de onde veio" />
            <div className="px-5 py-5">
              <Dados>
                <Dado rotulo="Cliente">
                  {ordem.equipment?.customer ? (
                    <Link
                      href={`/admin/clientes/${ordem.equipment.customer.id}`}
                      className="font-medium text-jb-700 hover:text-jb-500"
                    >
                      {ordem.equipment.customer.name}
                    </Link>
                  ) : (
                    ordem.customerName
                  )}
                </Dado>

                <Dado rotulo="Chamado de origem">
                  {ordem.request ? (
                    <Link
                      href={`/admin/assistencia/${ordem.request.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-jb-700 hover:text-jb-500"
                    >
                      <Stethoscope className="size-4" aria-hidden />
                      {ordem.request.number}
                    </Link>
                  ) : (
                    <span className="text-graf-500">OS avulsa</span>
                  )}
                </Dado>

                <Dado rotulo="Equipamento">
                  {ordem.equipment ? (
                    <Link
                      href={`/admin/equipamentos/${ordem.equipment.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-jb-700 hover:text-jb-500"
                    >
                      <MonitorCog className="size-4" aria-hidden />
                      {ordem.equipment.name}
                    </Link>
                  ) : null}
                </Dado>

                <Dado rotulo="Número de série">{ordem.equipment?.serialNumber}</Dado>
                <Dado rotulo="Técnico">{ordem.technician?.user.name}</Dado>

                <Dado rotulo="Garantia do serviço">
                  {ordem.serviceWarrantyDays
                    ? `${plural(ordem.serviceWarrantyDays, "dia", "dias")} a partir da conclusão`
                    : null}
                </Dado>

                <Dado rotulo={fechada ? "Tempo até o encerramento" : "Aberta há"}>
                  {tempoEmAberto}
                </Dado>

                {horasDeServico > 0 ? (
                  <Dado rotulo="Mão de obra lançada">
                    {`${plural(horasDeServico, "hora", "horas")} em itens de serviço`}
                  </Dado>
                ) : null}
              </Dados>

              {ordem.acceptedAt ? (
                <p className="mt-5 flex flex-wrap items-center gap-2 rounded-lg bg-ok-50 px-4 py-3 text-sm text-ok-700 ring-1 ring-inset ring-ok-500/20">
                  <ShieldCheck className="size-4 shrink-0" aria-hidden />
                  Recebido por <strong className="font-bold">{ordem.acceptedByName}</strong> em{" "}
                  {formatarData(ordem.acceptedAt)}
                  {ordem.acceptedIp ? " · aceite registrado pela Área da Clínica" : ""}
                </p>
              ) : null}
            </div>
          </Cartao>

          {/* ------------------------------------------------------ laudo */}
          <Cartao>
            <CabecalhoCartao
              titulo="Laudo técnico"
              descricao="Vai para a via impressa e para o acompanhamento do cliente"
            />
            <div className="px-5 py-5">
              {editar ? (
                <FormularioAcao acao={salvarLaudoDaOS} rotulo="Salvar laudo">
                  <>
                    <Oculto nome="ordemId" valor={ordem.id} />

                    <SelecaoAcao
                      rotulo="Técnico responsável"
                      name="tecnicoId"
                      defaultValue={ordem.technicianId ?? ""}
                    >
                      <option value="">Sem técnico definido</option>
                      {tecnicos.map((tecnico) => (
                        <option key={tecnico.id} value={tecnico.id}>
                          {tecnico.user.name}
                        </option>
                      ))}
                    </SelecaoAcao>

                    <AreaAcao
                      rotulo="Defeito relatado"
                      name="defeitoRelatado"
                      rows={2}
                      defaultValue={ordem.reportedIssue}
                      ajuda="O que o cliente descreveu."
                    />
                    <AreaAcao
                      rotulo="Diagnóstico"
                      name="diagnostico"
                      rows={3}
                      defaultValue={ordem.diagnosis}
                      ajuda="Causa encontrada pelo técnico."
                    />
                    <AreaAcao
                      rotulo="Serviço executado"
                      name="servicoExecutado"
                      rows={3}
                      defaultValue={ordem.workDone}
                    />
                    <AreaAcao
                      rotulo="Teste final"
                      name="testeFinal"
                      rows={2}
                      defaultValue={ordem.finalTest}
                    />
                    <AreaAcao
                      rotulo="Observações internas"
                      name="observacoes"
                      rows={2}
                      defaultValue={ordem.notes}
                      ajuda="Não sai na via do cliente."
                    />
                    <CampoAcao
                      rotulo="Garantia do serviço (dias)"
                      name="garantiaDias"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      defaultValue={ordem.serviceWarrantyDays ?? ""}
                    />
                  </>
                </FormularioAcao>
              ) : (
                <Dados colunas={1}>
                  <Dado rotulo="Defeito relatado">{ordem.reportedIssue}</Dado>
                  <Dado rotulo="Diagnóstico">{ordem.diagnosis}</Dado>
                  <Dado rotulo="Serviço executado">{ordem.workDone}</Dado>
                  <Dado rotulo="Teste final">{ordem.finalTest}</Dado>
                </Dados>
              )}
            </div>
          </Cartao>

          {/* ------------------------------------------------------ itens */}
          <Cartao>
            <CabecalhoCartao
              titulo="Peças, serviços e deslocamento"
              descricao="O total da OS é a soma destes itens menos o desconto"
            />
            <div className="px-5 py-5">
              <ItensDaOS
                ordemId={ordem.id}
                itens={ordem.items}
                totais={{
                  partsCents: ordem.partsCents,
                  laborCents: ordem.laborCents,
                  travelCents: ordem.travelCents,
                  discountCents: ordem.discountCents,
                  totalCents: ordem.totalCents,
                }}
                podeEditar={editar && !fechada}
              />
            </div>
          </Cartao>

          {/* -------------------------------------------------- checklist */}
          <Cartao>
            <CabecalhoCartao
              titulo="Checklist de execução"
              descricao="O que precisa ser conferido antes de devolver o equipamento"
            />
            <div className="px-5 py-5">
              <ChecklistDaOS
                ordemId={ordem.id}
                itens={ordem.checklist}
                podeEditar={editar && !fechada}
              />
            </div>
          </Cartao>

          {/* ------------------------------------------------------ fotos */}
          <Cartao>
            <CabecalhoCartao
              titulo="Registro fotográfico"
              descricao="Antes e depois do reparo"
            />
            <div className="px-5 py-5">
              <MidiasDaOS
                ordemId={ordem.id}
                midias={ordem.media.map((anexo) => ({
                  id: anexo.id,
                  phase: anexo.phase,
                  url: anexo.media.url,
                  alt: anexo.media.alt,
                  mime: anexo.media.mime,
                  nome: anexo.media.filename,
                }))}
                podeEditar={editar}
              />
            </div>
          </Cartao>
        </div>

        {/* ------------------------------------------------------- coluna */}
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Andamento" />
            <div className="px-5 py-5">
              <LinhaDoTempo passos={passosDaOS(ordem)} />
            </div>
          </Cartao>

          {ordem.documents.length > 0 ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Documentos"
                descricao="Arquivos gerados por esta OS"
              />
              <ul className="divide-y divide-graf-100 px-5 py-2">
                {ordem.documents.map((documento) => (
                  <li key={documento.id} className="py-2.5">
                    <p className="text-sm font-medium text-graf-900">{documento.title}</p>
                    <p className="text-apoio text-graf-500">
                      {formatarDataHora(documento.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao titulo="Histórico" descricao="Registro de tudo que mudou" />
            <div className="px-5 py-5">
              {ordem.events.length === 0 ? (
                <p className="text-sm text-graf-500">
                  Cada mudança de situação e cada anotação da equipe entram aqui.
                </p>
              ) : (
                <ol className="space-y-4">
                  {ordem.events.map((evento) => (
                    <li key={evento.id} className="flex gap-3">
                      <span
                        aria-hidden
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          evento.visibleToCustomer ? "bg-jb-500" : "bg-graf-300"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-graf-900">{evento.title}</p>
                        {evento.message ? (
                          <p className="mt-0.5 whitespace-pre-line text-sm text-graf-700">
                            {evento.message}
                          </p>
                        ) : null}
                        <p className="mt-1 text-apoio text-graf-500">
                          {formatarDataHora(evento.createdAt)}
                          {evento.userId && nomeDoAutor.get(evento.userId)
                            ? ` · ${nomeDoAutor.get(evento.userId)}`
                            : ""}
                          {evento.visibleToCustomer ? "" : " · interno"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
