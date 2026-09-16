import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  CalendarClock,
  FileText,
  MapPin,
  MonitorCog,
  Receipt,
  ShoppingCart,
  Stethoscope,
  Wallet,
} from "lucide-react";

import { Indicador, Indicadores } from "@/components/admin/indicador";
import {
  CabecalhoPagina,
  Dado,
  EtiquetaPedido,
  ListaDeDados,
  ROTULO_CONTRATO_CURTO,
  TOM_CONTRATO,
  TOM_ORCAMENTO,
} from "@/components/admin/vendas/comuns";
import {
  FormularioCliente,
  NotasDoCliente,
} from "@/components/admin/vendas/formulario-cliente";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, Trilha, Vazio } from "@/components/ui/data";
import { ROTULO_CHAMADO } from "@/lib/assistencia";
import { ROTULO_EQUIPAMENTO } from "@/lib/equipamento";
import {
  formatarCep,
  formatarData,
  formatarDataHora,
  formatarDocumento,
  formatarPreco,
  formatarTelefone,
  plural,
} from "@/lib/format";
import { ROTULO_ORCAMENTO } from "@/lib/orcamento";
import { ROTULO_STATUS } from "@/lib/pedido";
import { exigirArea } from "@/lib/permissoes";
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

type Props = { params: Promise<{ id: string }> };

/**
 * Ficha do cliente.
 *
 * Junta num lugar só o que hoje mora em cinco tabelas diferentes: compras,
 * propostas, parque instalado, chamados, contratos e documentos. É a tela que
 * responde "quem é essa pessoa do outro lado da linha" antes de a equipe
 * atender.
 *
 * As listas são recortes recentes, não o histórico inteiro — cada bloco diz
 * quantos registros existem no total e leva à lista completa filtrada.
 */

const LIMITE = 12;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cliente = await prisma.customer.findUnique({
    where: { id },
    select: { name: true, companyName: true },
  });
  if (!cliente) return { title: "Cliente não encontrado" };
  return { title: cliente.companyName || cliente.name };
}

export default async function ClientePage({ params }: Props) {
  await exigirArea("clientes");
  const { id } = await params;

  const cliente = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      orders: {
        orderBy: { placedAt: "desc" },
        take: LIMITE,
        select: {
          id: true,
          number: true,
          status: true,
          placedAt: true,
          totalCents: true,
          paidAt: true,
        },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        take: LIMITE,
        select: {
          id: true,
          number: true,
          status: true,
          kind: true,
          totalCents: true,
          createdAt: true,
          validUntil: true,
        },
      },
      equipments: {
        orderBy: { createdAt: "desc" },
        take: LIMITE,
        select: {
          id: true,
          name: true,
          brandName: true,
          modelName: true,
          serialNumber: true,
          status: true,
          warrantyUntil: true,
          nextMaintenanceAt: true,
        },
      },
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: LIMITE,
        select: {
          id: true,
          number: true,
          status: true,
          urgency: true,
          createdAt: true,
          description: true,
        },
      },
      contracts: {
        orderBy: { createdAt: "desc" },
        take: LIMITE,
        select: {
          id: true,
          number: true,
          status: true,
          startsAt: true,
          endsAt: true,
          priceCents: true,
          plan: { select: { name: true } },
          _count: { select: { items: true, visits: true } },
        },
      },
      // as unidades são o endereço para onde o técnico sai; a ficha mostra
      // quais existem e o cadastro fica na tela própria
      locations: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          address: { select: { city: true, state: true, district: true } },
          _count: { select: { equipments: true } },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        take: LIMITE,
        // sem `storageKey`: o endereço do arquivo não precisa chegar à tela
        select: { id: true, title: true, kind: true, createdAt: true },
      },
      _count: {
        select: {
          orders: true,
          quotes: true,
          equipments: true,
          serviceRequests: true,
          contracts: true,
          documents: true,
          addresses: true,
        },
      },
    },
  });

  if (!cliente) notFound();

  const compras = await prisma.order.aggregate({
    where: {
      customerId: cliente.id,
      paidAt: { not: null },
      status: { notIn: ["cancelado", "reembolsado"] },
    },
    _sum: { totalCents: true },
    _count: true,
  });

  // "último contato" é o fato mais recente em qualquer frente, não só a compra
  const marcos = [
    cliente.orders[0]?.placedAt,
    cliente.quotes[0]?.createdAt,
    cliente.serviceRequests[0]?.createdAt,
    cliente.lastLoginAt,
  ].filter((data): data is Date => Boolean(data));

  const ultimoContato = marcos.length
    ? new Date(Math.max(...marcos.map((data) => data.getTime())))
    : null;

  const totalComprado = compras._sum.totalCents ?? 0;
  const nomeExibido = cliente.companyName || cliente.name;

  return (
    <div className="space-y-6">
      <Trilha
        itens={[{ rotulo: "Clientes", href: "/admin/clientes" }, { rotulo: nomeExibido }]}
      />

      <CabecalhoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            {nomeExibido}
            {cliente.active ? (
              <Etiqueta tom="ok">Ativo</Etiqueta>
            ) : (
              <Etiqueta tom="neutro">Inativo</Etiqueta>
            )}
          </span>
        }
        apoio={
          <>
            {cliente.personType === "juridica" ? "Pessoa jurídica" : "Pessoa física"}
            {cliente.document ? ` · ${formatarDocumento(cliente.document)}` : ""} · cliente desde{" "}
            {formatarData(cliente.createdAt)}
          </>
        }
        acoes={
          <>
            <LinkBotao
              href={`/admin/orcamentos/novo?cliente=${cliente.id}`}
              variante="secundario"
              tamanho="sm"
            >
              <Receipt className="size-4" aria-hidden />
              Novo orçamento
            </LinkBotao>
            <LinkBotao
              href={`/admin/pedidos?q=${encodeURIComponent(cliente.email)}`}
              variante="secundario"
              tamanho="sm"
            >
              <ShoppingCart className="size-4" aria-hidden />
              Pedidos deste cliente
            </LinkBotao>
          </>
        }
      />

      <Indicadores>
        <Indicador
          rotulo="Total comprado"
          valor={formatarPreco(totalComprado)}
          icone={Wallet}
          tom="marca"
          detalhe={plural(compras._count, "pedido pago", "pedidos pagos")}
        />
        <Indicador
          rotulo="Pedidos"
          valor={cliente._count.orders}
          icone={ShoppingCart}
          detalhe={
            cliente.orders[0]
              ? `Último em ${formatarData(cliente.orders[0].placedAt)}`
              : "Nenhum pedido ainda"
          }
        />
        <Indicador
          rotulo="Equipamentos"
          valor={cliente._count.equipments}
          icone={MonitorCog}
          detalhe={`${plural(cliente._count.serviceRequests, "chamado aberto", "chamados abertos")} desde o cadastro`}
        />
        <Indicador
          rotulo="Último contato"
          valor={ultimoContato ? formatarData(ultimoContato) : "Nenhum"}
          icone={CalendarClock}
          detalhe={
            ultimoContato
              ? "Compra, orçamento, chamado ou acesso à conta"
              : "Este cliente ainda não comprou nem abriu chamado"
          }
        />
      </Indicadores>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-6">
          <FormularioCliente
            cliente={{
              id: cliente.id,
              nome: cliente.name,
              email: cliente.email,
              telefone: cliente.phone,
              tipoPessoa: cliente.personType,
              documento: cliente.document,
              razaoSocial: cliente.companyName,
              nomeFantasia: cliente.tradeName,
              inscricaoEstadual: cliente.stateRegistry,
              ativo: cliente.active,
              notas: cliente.notes,
            }}
          />

          {/* ------------------------------------------------------ pedidos */}
          <Cartao>
            <CabecalhoCartao
              titulo="Pedidos"
              descricao={`${plural(cliente._count.orders, "pedido registrado", "pedidos registrados")}.`}
            />
            <div className="p-5">
              {cliente.orders.length === 0 ? (
                <Vazio
                  icone={ShoppingCart}
                  titulo="Nenhuma compra ainda"
                  descricao="Quando este cliente fechar um pedido, ele aparece aqui com situação e valor."
                />
              ) : (
                <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                  {cliente.orders.map((pedido) => (
                    <li
                      key={pedido.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/admin/pedidos/${pedido.id}`}
                          className="tabular inline-flex min-h-11 items-center font-semibold text-graf-900 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          {pedido.number}
                        </Link>
                        <p className="text-[0.8125rem] text-graf-500">
                          {formatarData(pedido.placedAt)}
                          {pedido.paidAt ? ` · pago em ${formatarData(pedido.paidAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <EtiquetaPedido
                          status={pedido.status}
                          rotulo={ROTULO_STATUS[pedido.status]}
                        />
                        <span className="tabular font-semibold text-graf-900">
                          {formatarPreco(pedido.totalCents)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          {/* ---------------------------------------------------- orçamentos */}
          <Cartao>
            <CabecalhoCartao
              titulo="Orçamentos"
              descricao={`${plural(cliente._count.quotes, "proposta", "propostas")} para este cliente.`}
              acao={
                <LinkBotao
                  href={`/admin/orcamentos/novo?cliente=${cliente.id}`}
                  variante="texto"
                  tamanho="sm"
                >
                  Novo orçamento
                </LinkBotao>
              }
            />
            <div className="p-5">
              {cliente.quotes.length === 0 ? (
                <Vazio
                  icone={Receipt}
                  titulo="Nenhuma proposta"
                  descricao="Monte um orçamento com preço negociado e envie para aprovação."
                  acao={
                    <LinkBotao href={`/admin/orcamentos/novo?cliente=${cliente.id}`}>
                      Montar orçamento
                    </LinkBotao>
                  }
                />
              ) : (
                <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                  {cliente.quotes.map((orcamento) => (
                    <li
                      key={orcamento.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/admin/orcamentos/${orcamento.id}`}
                          className="tabular inline-flex min-h-11 items-center font-semibold text-graf-900 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          {orcamento.number}
                        </Link>
                        <p className="text-[0.8125rem] text-graf-500">
                          {orcamento.kind === "comercial" ? "Venda" : "Serviço técnico"} ·{" "}
                          {formatarData(orcamento.createdAt)}
                          {orcamento.validUntil
                            ? ` · vale até ${formatarData(orcamento.validUntil)}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Etiqueta tom={TOM_ORCAMENTO[orcamento.status]}>
                          {ROTULO_ORCAMENTO[orcamento.status]}
                        </Etiqueta>
                        <span className="tabular font-semibold text-graf-900">
                          {formatarPreco(orcamento.totalCents)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          {/* -------------------------------------------------- equipamentos */}
          <Cartao>
            <CabecalhoCartao
              titulo="Equipamentos"
              descricao="Parque instalado, com garantia e próxima manutenção."
            />
            <div className="p-5">
              {cliente.equipments.length === 0 ? (
                <Vazio
                  icone={MonitorCog}
                  titulo="Nenhum equipamento cadastrado"
                  descricao="Equipamentos comprados na JB entram sozinhos quando o pedido é pago."
                />
              ) : (
                <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                  {cliente.equipments.map((equipamento) => (
                    <li key={equipamento.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                          href={`/admin/equipamentos/${equipamento.id}`}
                          className="inline-flex min-h-11 items-center font-semibold text-graf-900 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          {equipamento.name}
                        </Link>
                        <Etiqueta
                          tom={
                            equipamento.status === "operacional"
                              ? "ok"
                              : equipamento.status === "inoperante"
                                ? "alerta"
                                : "aguardando"
                          }
                        >
                          {ROTULO_EQUIPAMENTO[equipamento.status]}
                        </Etiqueta>
                      </div>
                      <p className="text-[0.8125rem] text-graf-500">
                        {[
                          equipamento.brandName,
                          equipamento.modelName,
                          equipamento.serialNumber ? `Série ${equipamento.serialNumber}` : "",
                          equipamento.warrantyUntil
                            ? `Garantia até ${formatarData(equipamento.warrantyUntil)}`
                            : "",
                          equipamento.nextMaintenanceAt
                            ? `Revisão em ${formatarData(equipamento.nextMaintenanceAt)}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          {/* ------------------------------------------------------ chamados */}
          <Cartao>
            <CabecalhoCartao
              titulo="Chamados de assistência"
              descricao={`${plural(cliente._count.serviceRequests, "chamado", "chamados")} no histórico.`}
            />
            <div className="p-5">
              {cliente.serviceRequests.length === 0 ? (
                <Vazio
                  icone={Stethoscope}
                  titulo="Nenhum chamado aberto"
                  descricao="Solicitações de assistência técnica deste cliente aparecem aqui."
                />
              ) : (
                <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                  {cliente.serviceRequests.map((chamado) => (
                    <li key={chamado.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Link
                          href={`/admin/assistencia/${chamado.id}`}
                          className="tabular inline-flex min-h-11 items-center font-semibold text-graf-900 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          {chamado.number}
                        </Link>
                        <Etiqueta
                          tom={chamado.urgency === "parado" ? "alerta" : "andamento"}
                        >
                          {ROTULO_CHAMADO[chamado.status]}
                        </Etiqueta>
                      </div>
                      <p className="line-2 text-[0.8125rem] text-graf-500">
                        {formatarData(chamado.createdAt)} · {chamado.description}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          {/* ----------------------------------------------------- contratos */}
          {cliente.contracts.length > 0 ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Contratos de manutenção"
                descricao="Cobertura preventiva contratada."
              />
              <ul className="divide-y divide-graf-200">
                {cliente.contracts.map((contrato) => (
                  <li
                    key={contrato.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/manutencao/${contrato.id}`}
                        className="tabular inline-flex min-h-11 items-center font-semibold text-graf-900 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        {contrato.number}
                      </Link>
                      <p className="text-[0.8125rem] text-graf-500">
                        {[
                          contrato.plan?.name,
                          `${contrato._count.items} equipamento(s)`,
                          `${contrato._count.visits} visita(s)`,
                          contrato.startsAt ? `desde ${formatarData(contrato.startsAt)}` : "",
                          contrato.endsAt ? `até ${formatarData(contrato.endsAt)}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Etiqueta tom={TOM_CONTRATO[contrato.status]}>
                        {ROTULO_CONTRATO_CURTO[contrato.status]}
                      </Etiqueta>
                      <span className="tabular font-semibold text-graf-900">
                        {formatarPreco(contrato.priceCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          {/* ---------------------------------------------------- documentos */}
          <Cartao>
            <CabecalhoCartao
              titulo="Documentos"
              descricao="Notas fiscais, laudos e garantias visíveis ao cliente na Área da Clínica."
            />
            <div className="p-5">
              {cliente.documents.length === 0 ? (
                <Vazio
                  icone={FileText}
                  titulo="Nenhum documento"
                  descricao="Anexe a nota fiscal na tela do pedido para ela aparecer aqui e na conta do cliente."
                />
              ) : (
                <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                  {cliente.documents.map((documento) => (
                    <li key={documento.id} className="px-4 py-3">
                      {/* nunca o `storageKey`: o arquivo é privado e só sai pela
                          rota, que confere a sessão antes de ler os bytes */}
                      <a
                        href={`/admin/documentos/${documento.id}/baixar`}
                        className="inline-flex min-h-11 items-center gap-2 font-medium text-graf-900 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        <FileText className="size-4 shrink-0 text-graf-500" aria-hidden />
                        {documento.title}
                      </a>
                      <p className="text-[0.8125rem] text-graf-500">
                        {formatarData(documento.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>
        </div>

        {/* ------------------------------------------------------- coluna 2 */}
        <aside className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Contato" />
            <div className="p-5">
              <ListaDeDados className="sm:grid-cols-1">
                <Dado rotulo="E-mail">
                  <a
                    href={`mailto:${cliente.email}`}
                    className="break-all text-jb-700 underline-offset-2 hover:underline"
                  >
                    {cliente.email}
                  </a>
                </Dado>
                {cliente.phone ? (
                  <Dado rotulo="Telefone">{formatarTelefone(cliente.phone)}</Dado>
                ) : null}
                <Dado rotulo="E-mail confirmado">
                  {cliente.emailVerifiedAt ? formatarData(cliente.emailVerifiedAt) : "Ainda não"}
                </Dado>
                <Dado rotulo="Último acesso">
                  {cliente.lastLoginAt ? formatarDataHora(cliente.lastLoginAt) : "Nunca entrou"}
                </Dado>
              </ListaDeDados>
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Unidades"
              descricao={`${plural(cliente.locations.length, "clínica cadastrada", "clínicas cadastradas")}. É para elas que o equipamento aponta.`}
              acao={
                <LinkBotao
                  href={`/admin/clientes/${cliente.id}/unidades`}
                  variante="secundario"
                  tamanho="sm"
                >
                  Gerenciar
                </LinkBotao>
              }
            />
            <div className="p-5">
              {cliente.locations.length === 0 ? (
                <Vazio
                  icone={Building2}
                  titulo="Nenhuma unidade"
                  descricao="Sem unidade, o equipamento fica sem lugar e a visita sai para o endereço de cobrança."
                />
              ) : (
                <ul className="space-y-2">
                  {cliente.locations.map((unidade) => (
                    <li
                      key={unidade.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-graf-200 p-3"
                    >
                      <span className="text-sm font-semibold text-graf-900">{unidade.name}</span>
                      <span className="text-[0.8125rem] text-graf-500">
                        {unidade.address
                          ? `${[unidade.address.district, `${unidade.address.city}/${unidade.address.state}`]
                              .filter(Boolean)
                              .join(" · ")} · `
                          : "Sem endereço · "}
                        {plural(unidade._count.equipments, "equipamento", "equipamentos")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Endereços"
              descricao={`${plural(cliente._count.addresses, "endereço cadastrado", "endereços cadastrados")}.`}
            />
            <div className="p-5">
              {cliente.addresses.length === 0 ? (
                <Vazio
                  icone={MapPin}
                  titulo="Nenhum endereço"
                  descricao="O cliente cadastra os endereços dele na Área da Clínica, ao fechar o pedido."
                />
              ) : (
                <ul className="space-y-4">
                  {cliente.addresses.map((endereco) => (
                    <li key={endereco.id} className="rounded-lg border border-graf-200 p-4">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-graf-900">
                          {endereco.label}
                        </span>
                        {endereco.isDefault ? <Etiqueta tom="marca">Padrão</Etiqueta> : null}
                      </div>
                      <address className="text-sm not-italic leading-relaxed text-graf-700">
                        {[endereco.street, endereco.number].filter(Boolean).join(", ")}
                        {endereco.complement ? ` — ${endereco.complement}` : ""}
                        <span className="block">
                          {[endereco.district, `${endereco.city}/${endereco.state}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span className="tabular block text-graf-500">
                          CEP {formatarCep(endereco.zip)}
                        </span>
                        {endereco.reference ? (
                          <span className="block text-graf-500">Ref.: {endereco.reference}</span>
                        ) : null}
                      </address>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          <NotasDoCliente clienteId={cliente.id} notas={cliente.notes} />
        </aside>
      </div>
    </div>
  );
}
