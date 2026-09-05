import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin, MonitorCog, PhoneCall } from "lucide-react";

import { CabecalhoPagina } from "@/components/admin/servico/cabecalho";
import {
  EditarUnidade,
  ExcluirUnidade,
  NovaUnidade,
  type EnderecoDoCliente,
} from "@/components/admin/vendas/formulario-cliente-unidade";
import { CabecalhoCartao, Cartao, Vazio } from "@/components/ui/data";
import { formatarCep, plural } from "@/lib/format";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

/**
 * Unidades (clínicas) do cliente.
 *
 * `CustomerLocation` já existia no schema e é para onde o equipamento aponta,
 * mas nenhuma tela cadastrava uma: as unidades só nasciam por importação. O
 * resultado era o parque instalado inteiro sem lugar, e o técnico saindo para
 * o endereço de cobrança.
 *
 * A guarda é de escrita porque a tela inteira é de cadastro. Quem só consulta
 * cliente vê as unidades na ficha, não aqui.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cliente = await prisma.customer.findUnique({
    where: { id },
    select: { name: true, companyName: true },
  });
  if (!cliente) return { title: "Cliente não encontrado" };
  return { title: `Unidades de ${cliente.companyName || cliente.name}` };
}

export default async function PaginaUnidades({ params }: Props) {
  await exigirEdicao("clientes");
  const { id } = await params;

  const cliente = await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      companyName: true,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          label: true,
          street: true,
          number: true,
          district: true,
          city: true,
          state: true,
          zip: true,
        },
      },
      locations: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          notes: true,
          addressId: true,
          address: {
            select: {
              label: true,
              street: true,
              number: true,
              complement: true,
              district: true,
              city: true,
              state: true,
              zip: true,
              reference: true,
            },
          },
          _count: { select: { equipments: true } },
        },
      },
    },
  });

  if (!cliente) notFound();

  const nomeExibido = cliente.companyName || cliente.name;

  const enderecos: EnderecoDoCliente[] = cliente.addresses.map((endereco) => ({
    id: endereco.id,
    rotulo: endereco.label,
    resumo: [
      [endereco.street, endereco.number].filter(Boolean).join(", "),
      [endereco.city, endereco.state].filter(Boolean).join("/"),
    ]
      .filter(Boolean)
      .join(" · "),
  }));

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Clientes", href: "/admin/clientes" },
          { rotulo: nomeExibido, href: `/admin/clientes/${cliente.id}` },
          { rotulo: "Unidades" },
        ]}
        titulo={`Unidades de ${nomeExibido}`}
        descricao="Consultórios do cliente. É a unidade que diz onde o equipamento está e para onde o técnico vai."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Cartao>
            <CabecalhoCartao
              titulo="Unidades cadastradas"
              descricao={plural(
                cliente.locations.length,
                "unidade cadastrada",
                "unidades cadastradas",
              )}
            />
            <div className="p-5">
              {cliente.locations.length === 0 ? (
                <Vazio
                  icone={Building2}
                  titulo="Nenhuma unidade cadastrada"
                  descricao="Sem unidade, o equipamento fica sem lugar e o técnico sai para o endereço de cobrança. Cadastre pelo menos a clínica principal no formulário ao lado."
                  className="border-graf-200 bg-transparent py-10"
                />
              ) : (
                <ul className="space-y-4">
                  {cliente.locations.map((unidade) => (
                    <li
                      key={unidade.id}
                      className="rounded-lg border border-graf-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-graf-900">
                            {unidade.name}
                          </p>

                          {unidade.address ? (
                            <address className="mt-1 text-sm not-italic leading-relaxed text-graf-700">
                              {[unidade.address.street, unidade.address.number]
                                .filter(Boolean)
                                .join(", ")}
                              {unidade.address.complement
                                ? ` — ${unidade.address.complement}`
                                : ""}
                              <span className="block">
                                {[
                                  unidade.address.district,
                                  `${unidade.address.city}/${unidade.address.state}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                              <span className="tabular block text-graf-500">
                                CEP {formatarCep(unidade.address.zip)}
                              </span>
                              {unidade.address.reference ? (
                                <span className="block text-graf-500">
                                  Ref.: {unidade.address.reference}
                                </span>
                              ) : null}
                            </address>
                          ) : (
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-graf-500">
                              <MapPin className="size-4 shrink-0" aria-hidden />
                              Sem endereço vinculado — o chamado cai no endereço padrão do
                              cliente.
                            </p>
                          )}

                          {unidade.notes ? (
                            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-graf-500">
                              {unidade.notes}
                            </p>
                          ) : null}

                          <p className="mt-2 flex items-center gap-1.5 text-xs text-graf-500">
                            <MonitorCog className="size-3.5 shrink-0" aria-hidden />
                            {plural(
                              unidade._count.equipments,
                              "equipamento nesta unidade",
                              "equipamentos nesta unidade",
                            )}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <EditarUnidade
                            clienteId={cliente.id}
                            enderecos={enderecos}
                            unidade={{
                              id: unidade.id,
                              nome: unidade.name,
                              enderecoId: unidade.addressId,
                              notas: unidade.notes,
                            }}
                          />
                          <ExcluirUnidade
                            clienteId={cliente.id}
                            unidade={{ id: unidade.id, nome: unidade.name }}
                            equipamentos={unidade._count.equipments}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          <NovaUnidade clienteId={cliente.id} enderecos={enderecos} />

          <Cartao>
            <CabecalhoCartao titulo="Endereços do cliente" />
            <div className="p-5">
              {enderecos.length === 0 ? (
                <p className="text-sm text-graf-500">
                  Este cliente ainda não tem endereço cadastrado. Use “Cadastrar um endereço
                  novo” no formulário ao lado — ele passa a valer também para entrega.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-graf-700">
                  {enderecos.map((endereco) => (
                    <li key={endereco.id}>
                      <span className="font-medium text-graf-900">{endereco.rotulo}</span>
                      <span className="block text-xs text-graf-500">{endereco.resumo}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-xs leading-relaxed text-graf-500">
                O endereço da unidade é o mesmo registro usado na entrega. Corrigir a rua
                aqui conserta pedido e visita técnica de uma vez.
              </p>
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Atalhos" />
            <div className="flex flex-col gap-3 p-5">
              <Link
                href={`/admin/assistencia/novo?cliente=${cliente.id}`}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <PhoneCall className="size-4 shrink-0" aria-hidden />
                Abrir chamado para este cliente
              </Link>
              <Link
                href={`/admin/clientes/${cliente.id}`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                Voltar para {nomeExibido}
              </Link>
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
