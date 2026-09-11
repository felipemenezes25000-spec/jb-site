import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { EquipmentStatus } from "@prisma/client";
import { ArrowRightLeft, ClipboardList, FileText, NotebookPen } from "lucide-react";

import { CabecalhoPagina, Dado, Dados } from "@/components/admin/servico/cabecalho";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import {
  EtiquetaChamado,
  EtiquetaContrato,
  EtiquetaEquipamento,
} from "@/components/admin/servico/etiquetas";
import { Oculto } from "@/components/admin/servico/formulario";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { CabecalhoCartao, Cartao, Etiqueta, Vazio } from "@/components/ui/data";
import {
  criarOrdemDeServico,
  mudarStatusDoEquipamento,
  registrarEventoDoEquipamento,
  transferirEquipamento,
} from "@/app/acoes/admin-servico";
import {
  ROTULO_EQUIPAMENTO,
  ROTULO_ORIGEM,
  historicoDoEquipamento,
  type TipoHistorico,
} from "@/lib/equipamento";
import { distanciaEmDias, formatarData, formatarDataHora, plural } from "@/lib/format";
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
 * Prontuário do equipamento.
 *
 * O histórico vem de `historicoDoEquipamento`, que junta cinco tabelas numa
 * linha do tempo só. Os endereços que ele devolve apontam para a área do
 * cliente (é lá que a função é usada com mais frequência); aqui no painel eles
 * são refeitos para as telas internas a partir do tipo e do id do item.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const equipamento = await prisma.equipment.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: equipamento ? equipamento.name : "Equipamento" };
}

/** O id do histórico vem como "chamado-<id>"; aqui vira endereço do painel. */
function hrefInterno(tipo: TipoHistorico, idComposto: string) {
  const id = idComposto.slice(tipo.length + 1);
  if (tipo === "chamado") return `/admin/assistencia/${id}`;
  if (tipo === "os") return `/admin/os/${id}`;
  if (tipo === "visita") return `/admin/manutencao/${id}`;
  return null;
}

const ROTULO_HISTORICO: Record<TipoHistorico, string> = {
  evento: "Anotação",
  chamado: "Chamado",
  os: "Ordem de serviço",
  visita: "Manutenção",
  documento: "Documento",
};

export default async function PaginaEquipamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("equipamentos");
  const { id } = await params;

  const equipamento = await prisma.equipment.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      category: { select: { name: true } },
      location: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, slug: true } },
      order: { select: { id: true, number: true } },
      media: {
        orderBy: { order: "asc" },
        select: { id: true, media: { select: { url: true, alt: true, mime: true } } },
      },
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, number: true, status: true, createdAt: true },
      },
      contractItems: {
        select: {
          id: true,
          contract: {
            select: { id: true, number: true, status: true, endsAt: true },
          },
        },
      },
    },
  });

  if (!equipamento) notFound();

  const editar = podeEditar(usuario, "equipamentos");
  const editarOS = podeEditar(usuario, "os");

  const [historico, clientes, unidades, tecnicos] = await Promise.all([
    historicoDoEquipamento(equipamento.id),
    editar
      ? prisma.customer.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
          take: 1000,
        })
      : Promise.resolve([]),
    editar
      ? prisma.customerLocation.findMany({
          orderBy: [{ customer: { name: "asc" } }, { name: "asc" }],
          select: { id: true, name: true, customer: { select: { id: true, name: true } } },
          take: 1000,
        })
      : Promise.resolve([]),
    editarOS
      ? prisma.technician.findMany({
          where: { active: true },
          orderBy: { user: { name: "asc" } },
          select: { id: true, user: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  // agrupa as unidades por cliente para o <optgroup> do formulário de transferência
  const unidadesPorCliente = new Map<string, { nome: string; itens: { id: string; name: string }[] }>();
  for (const unidade of unidades) {
    const atual = unidadesPorCliente.get(unidade.customer.id);
    if (atual) atual.itens.push({ id: unidade.id, name: unidade.name });
    else
      unidadesPorCliente.set(unidade.customer.id, {
        nome: unidade.customer.name,
        itens: [{ id: unidade.id, name: unidade.name }],
      });
  }

  const naGarantia =
    equipamento.warrantyUntil !== null && equipamento.warrantyUntil.getTime() > Date.now();

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Equipamentos", href: "/admin/equipamentos" },
          { rotulo: equipamento.name },
        ]}
        titulo={equipamento.name}
        descricao={`${equipamento.customer.name}${
          equipamento.serialNumber ? ` · série ${equipamento.serialNumber}` : ""
        }`}
        etiquetas={
          <>
            <EtiquetaEquipamento status={equipamento.status} />
            {naGarantia && equipamento.warrantyUntil ? (
              <Etiqueta tom="ok">Na garantia até {formatarData(equipamento.warrantyUntil)}</Etiqueta>
            ) : null}
          </>
        }
        acoes={
          <>
            {editar ? (
              <>
                <PainelAcao
                  rotulo="Registrar evento"
                  icone={<NotebookPen className="size-4" aria-hidden />}
                  variante="secundario"
                  tamanho="md"
                  titulo="Anotar no prontuário"
                  descricao="Fica na linha do tempo do equipamento, junto com chamados e OS."
                  acao={registrarEventoDoEquipamento}
                  rotuloConfirmar="Registrar"
                >
                  <Oculto nome="equipamentoId" valor={equipamento.id} />
                  <SelecaoAcao rotulo="Tipo" name="kind" defaultValue="nota" required>
                    <option value="nota">Anotação</option>
                    <option value="instalacao">Instalação</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="assistencia">Assistência</option>
                    <option value="compra">Compra</option>
                    <option value="status">Mudança de situação</option>
                  </SelecaoAcao>
                  <CampoAcao
                    rotulo="O que aconteceu"
                    name="titulo"
                    required
                    maxLength={180}
                    placeholder="Ex.: troca preventiva da vedação"
                  />
                  <AreaAcao rotulo="Detalhes" name="descricao" rows={3} />
                  <CampoAcao
                    rotulo="Quando"
                    name="quando"
                    type="date"
                    ajuda="Em branco, usa a data de hoje."
                  />
                </PainelAcao>

                <PainelAcao
                  rotulo="Mudar situação"
                  variante="secundario"
                  tamanho="md"
                  titulo="Situação do equipamento"
                  descricao="A mudança entra no prontuário com a data e o motivo."
                  acao={mudarStatusDoEquipamento}
                  rotuloConfirmar="Gravar"
                >
                  <Oculto nome="equipamentoId" valor={equipamento.id} />
                  <SelecaoAcao
                    rotulo="Situação"
                    name="status"
                    defaultValue={equipamento.status}
                    required
                  >
                    {(Object.keys(ROTULO_EQUIPAMENTO) as EquipmentStatus[]).map((status) => (
                      <option key={status} value={status}>
                        {ROTULO_EQUIPAMENTO[status]}
                      </option>
                    ))}
                  </SelecaoAcao>
                  <AreaAcao rotulo="Motivo" name="nota" rows={3} />
                </PainelAcao>

                <PainelAcao
                  rotulo="Transferir"
                  icone={<ArrowRightLeft className="size-4" aria-hidden />}
                  variante="secundario"
                  tamanho="md"
                  titulo="Transferir para outro cliente ou unidade"
                  descricao="Todo o histórico acompanha o equipamento. A transferência fica registrada no prontuário."
                  acao={transferirEquipamento}
                  rotuloConfirmar="Transferir"
                >
                  <Oculto nome="equipamentoId" valor={equipamento.id} />
                  <SelecaoAcao
                    rotulo="Cliente"
                    name="customerId"
                    defaultValue={equipamento.customerId}
                    required
                  >
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.name}
                      </option>
                    ))}
                  </SelecaoAcao>

                  <SelecaoAcao
                    rotulo="Unidade"
                    name="locationId"
                    defaultValue={equipamento.locationId ?? ""}
                    ajuda="A unidade precisa pertencer ao cliente escolhido acima."
                  >
                    <option value="">Sem unidade definida</option>
                    {[...unidadesPorCliente.entries()].map(([clienteId, grupo]) => (
                      <optgroup key={clienteId} label={grupo.nome}>
                        {grupo.itens.map((unidade) => (
                          <option key={unidade.id} value={unidade.id}>
                            {unidade.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </SelecaoAcao>

                  <CampoAcao
                    rotulo="Sala"
                    name="sala"
                    maxLength={120}
                    defaultValue={equipamento.room}
                  />
                  <AreaAcao rotulo="Motivo da transferência" name="motivo" rows={2} />
                </PainelAcao>
              </>
            ) : null}

            {editarOS ? (
              <PainelAcao
                rotulo="Abrir OS"
                icone={<ClipboardList className="size-4" aria-hidden />}
                variante="primario"
                tamanho="md"
                titulo="Abrir ordem de serviço para este equipamento"
                acao={criarOrdemDeServico}
                rotuloConfirmar="Abrir OS"
              >
                <Oculto nome="equipmentId" valor={equipamento.id} />
                <Oculto nome="nomeCliente" valor={equipamento.customer.name} />
                <SelecaoAcao rotulo="Técnico" name="tecnicoId">
                  <option value="">Definir depois</option>
                  {tecnicos.map((tecnico) => (
                    <option key={tecnico.id} value={tecnico.id}>
                      {tecnico.user.name}
                    </option>
                  ))}
                </SelecaoAcao>
                <AreaAcao
                  rotulo="Defeito relatado"
                  name="defeitoRelatado"
                  rows={3}
                  placeholder="O que precisa ser resolvido"
                />
                <CampoAcao
                  rotulo="Garantia do serviço (dias)"
                  name="garantiaDias"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                />
              </PainelAcao>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Cartao>
            <CabecalhoCartao titulo="Ficha" descricao="Identificação, local e ciclo de manutenção" />
            <div className="space-y-5 px-5 py-5">
              <Dados>
                <Dado rotulo="Cliente">
                  <Link
                    href={`/admin/clientes/${equipamento.customer.id}`}
                    className="font-medium text-jb-700 hover:text-jb-500"
                  >
                    {equipamento.customer.name}
                  </Link>
                </Dado>
                <Dado rotulo="Categoria">{equipamento.category?.name}</Dado>
                <Dado rotulo="Marca">{equipamento.brandName}</Dado>
                <Dado rotulo="Modelo">{equipamento.modelName}</Dado>
                <Dado rotulo="Número de série">
                  {equipamento.serialNumber ? (
                    <span className="label-mono">{equipamento.serialNumber}</span>
                  ) : null}
                </Dado>
                <Dado rotulo="Tensão">{equipamento.voltage}</Dado>
                <Dado rotulo="Unidade">{equipamento.location?.name}</Dado>
                <Dado rotulo="Sala">{equipamento.room}</Dado>
                <Dado rotulo="Origem">{ROTULO_ORIGEM[equipamento.origin]}</Dado>
                <Dado rotulo="Cadastrado em">{formatarData(equipamento.createdAt)}</Dado>
              </Dados>

              <Dados>
                <Dado rotulo="Fabricação">
                  {equipamento.manufacturedAt ? formatarData(equipamento.manufacturedAt) : null}
                </Dado>
                <Dado rotulo="Compra">
                  {equipamento.purchasedAt ? formatarData(equipamento.purchasedAt) : null}
                </Dado>
                <Dado rotulo="Instalação">
                  {equipamento.installedAt ? formatarData(equipamento.installedAt) : null}
                </Dado>
                <Dado rotulo="Garantia até">
                  {equipamento.warrantyUntil ? (
                    <>
                      {formatarData(equipamento.warrantyUntil)}{" "}
                      <span className="text-apoio text-graf-500">
                        ({distanciaEmDias(equipamento.warrantyUntil)})
                      </span>
                    </>
                  ) : null}
                </Dado>
                <Dado rotulo="Intervalo de preventiva">
                  {equipamento.maintenanceIntervalDays
                    ? plural(equipamento.maintenanceIntervalDays, "dia", "dias")
                    : null}
                </Dado>
                <Dado rotulo="Última manutenção">
                  {equipamento.lastMaintenanceAt
                    ? formatarData(equipamento.lastMaintenanceAt)
                    : null}
                </Dado>
                <Dado rotulo="Próxima preventiva">
                  {equipamento.nextMaintenanceAt ? (
                    <>
                      {formatarData(equipamento.nextMaintenanceAt)}{" "}
                      <span className="text-apoio text-graf-500">
                        ({distanciaEmDias(equipamento.nextMaintenanceAt)})
                      </span>
                    </>
                  ) : null}
                </Dado>
                <Dado rotulo="Pedido de origem">
                  {equipamento.order ? (
                    <Link
                      href={`/admin/pedidos/${equipamento.order.id}`}
                      className="label-mono text-jb-700 hover:text-jb-500"
                    >
                      {equipamento.order.number}
                    </Link>
                  ) : null}
                </Dado>
                <Dado rotulo="Produto do catálogo">
                  {equipamento.product ? (
                    <Link
                      href={`/admin/produtos/${equipamento.product.id}`}
                      className="text-jb-700 hover:text-jb-500"
                    >
                      {equipamento.product.name}
                    </Link>
                  ) : null}
                </Dado>
              </Dados>

              {equipamento.notes ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                    Observações internas
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-graf-800">
                    {equipamento.notes}
                  </p>
                </div>
              ) : null}

              {equipamento.media.length > 0 ? (
                <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {equipamento.media.map((anexo) => (
                    <li key={anexo.id}>
                      <a
                        href={anexo.media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border border-graf-200 bg-graf-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        {anexo.media.mime.startsWith("image/") ? (
                          <img
                            src={anexo.media.url}
                            alt={anexo.media.alt || `Foto de ${equipamento.name}`}
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <span className="flex aspect-square w-full items-center justify-center text-graf-500">
                            <FileText className="size-5" aria-hidden />
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Histórico"
              descricao="Chamados, ordens de serviço, manutenções, documentos e anotações"
            />
            <div className="px-5 py-5">
              {historico.length === 0 ? (
                <Vazio
                  titulo="Prontuário ainda vazio"
                  descricao="Assim que houver um chamado, uma OS ou uma anotação, tudo aparece aqui em ordem."
                  className="border-graf-200 bg-transparent py-8"
                />
              ) : (
                <ol className="space-y-4">
                  {historico.map((item) => {
                    const href = hrefInterno(item.tipo, item.id);
                    const titulo = (
                      <span className="text-sm font-semibold text-graf-900">{item.titulo}</span>
                    );

                    return (
                      <li key={item.id} className="flex gap-3">
                        <span
                          aria-hidden
                          className="mt-1.5 size-2 shrink-0 rounded-full bg-graf-300"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {href ? (
                              <Link
                                href={href}
                                className="text-sm font-semibold text-jb-700 hover:text-jb-500"
                              >
                                {item.titulo}
                              </Link>
                            ) : (
                              titulo
                            )}
                            <span className="rounded bg-graf-100 px-1.5 py-0.5 text-[11px] font-semibold text-graf-600">
                              {ROTULO_HISTORICO[item.tipo]}
                            </span>
                            {item.etiqueta ? (
                              <span className="text-apoio text-graf-500">{item.etiqueta}</span>
                            ) : null}
                          </p>
                          {item.descricao ? (
                            <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-graf-700">
                              {item.descricao}
                            </p>
                          ) : null}
                          <p className="mt-1 text-apoio text-graf-500">
                            {formatarDataHora(item.quando)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Chamados recentes" />
            <div className="px-5 py-5">
              {equipamento.serviceRequests.length === 0 ? (
                <p className="text-sm text-graf-500">Nenhum chamado registrado.</p>
              ) : (
                <ul className="space-y-2">
                  {equipamento.serviceRequests.map((chamado) => (
                    <li key={chamado.id}>
                      <Link
                        href={`/admin/assistencia/${chamado.id}`}
                        className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-graf-200 px-3 py-2.5 transition-colors hover:border-graf-300 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        <span className="label-mono text-graf-600">{chamado.number}</span>
                        <span className="min-w-0 flex-1 text-apoio text-graf-500">
                          {formatarData(chamado.createdAt)}
                        </span>
                        <EtiquetaChamado status={chamado.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Contratos de manutenção" />
            <div className="px-5 py-5">
              {equipamento.contractItems.length === 0 ? (
                <p className="text-sm text-graf-500">
                  Este equipamento não está coberto por nenhum contrato.
                </p>
              ) : (
                <ul className="space-y-2">
                  {equipamento.contractItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/admin/manutencao/contratos/${item.contract.id}`}
                        className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-graf-200 px-3 py-2.5 transition-colors hover:border-graf-300 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        <span className="label-mono text-graf-600">{item.contract.number}</span>
                        <span className="min-w-0 flex-1 text-apoio text-graf-500">
                          {item.contract.endsAt
                            ? `até ${formatarData(item.contract.endsAt)}`
                            : "sem fim definido"}
                        </span>
                        <EtiquetaContrato status={item.contract.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
