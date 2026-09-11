import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Urgency } from "@prisma/client";
import { PhoneCall, Search, UserPlus, Users } from "lucide-react";

import { CabecalhoPagina, Dado, Dados } from "@/components/admin/servico/cabecalho";
import {
  FormularioChamado,
  type ClienteDoChamado,
  type OpcaoSimples,
} from "@/components/admin/servico/formulario-chamado";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CabecalhoCartao, Cartao, Vazio } from "@/components/ui/data";
import { Campo } from "@/components/ui/form";
import { ROTULO_URGENCIA } from "@/lib/assistencia";
import {
  formatarDocumento,
  formatarTelefone,
  plural,
  somenteDigitos,
} from "@/lib/format";
import { exigirEdicao } from "@/lib/permissoes";
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

export const metadata: Metadata = {
  title: "Abrir chamado",
};

/**
 * Abertura de chamado pelo painel — o dentista que liga em vez de preencher o
 * site.
 *
 * A escolha do cliente é uma navegação de verdade (`?cliente=`), não estado no
 * navegador: a tela continua renderizada no servidor, a busca funciona sem
 * JavaScript, e o endereço pode ser colado para outra pessoa continuar o
 * atendimento. É o mesmo gesto de `/admin/manutencao/contratos/novo`.
 *
 * `?avulso=1` abre o chamado sem cliente. Existe porque `ServiceRequest.customerId`
 * é opcional no schema, e porque o telefone toca antes de o cadastro existir —
 * recusar o chamado até alguém preencher uma ficha é o caminho mais curto para
 * perder o atendimento.
 */

type Busca = { cliente?: string; q?: string; avulso?: string };

const LIMITE_BUSCA = 25;

const TRILHA = [
  { rotulo: "Painel", href: "/admin" },
  { rotulo: "Chamados", href: "/admin/assistencia" },
  { rotulo: "Novo" },
];

const URGENCIAS: OpcaoSimples[] = (
  ["baixa", "normal", "alta", "parado"] satisfies Urgency[]
).map((valor) => ({ valor, rotulo: ROTULO_URGENCIA[valor] }));

async function categoriasParaEscolha(): Promise<OpcaoSimples[]> {
  const categorias = await prisma.category.findMany({
    where: { published: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return categorias.map((categoria) => ({ valor: categoria.id, rotulo: categoria.name }));
}

export default async function PaginaNovoChamado({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  await exigirEdicao("assistencia");
  const { cliente: clienteId, q, avulso } = await searchParams;

  /* ------------------------------------------------ chamado sem cadastro */
  if (!clienteId && avulso === "1") {
    const categorias = await categoriasParaEscolha();

    return (
      <div className="space-y-6">
        <CabecalhoPagina
          trilha={TRILHA}
          titulo="Abrir chamado sem cadastro"
          descricao="Para quem ainda não é cliente. O chamado nasce com o contato informado e pode ser ligado a uma ficha depois."
          acoes={
            <LinkBotao href="/admin/assistencia/novo" variante="secundario" tamanho="sm">
              <Users className="size-4" aria-hidden />
              Escolher um cliente
            </LinkBotao>
          }
        />

        <div className="max-w-3xl">
          <FormularioChamado cliente={null} categorias={categorias} urgencias={URGENCIAS} />
        </div>
      </div>
    );
  }

  /* --------------------------------------------- passo 1: qual cliente é */
  if (!clienteId) {
    const busca = (q ?? "").trim();
    const digitos = somenteDigitos(busca);

    const clientes = busca
      ? await prisma.customer.findMany({
          where: {
            OR: [
              { name: { contains: busca, mode: "insensitive" } },
              { companyName: { contains: busca, mode: "insensitive" } },
              { tradeName: { contains: busca, mode: "insensitive" } },
              { email: { contains: busca, mode: "insensitive" } },
              ...(digitos.length >= 3 ? [{ document: { contains: digitos } }] : []),
              ...(digitos.length >= 3 ? [{ phone: { contains: digitos } }] : []),
            ],
          },
          orderBy: { name: "asc" },
          take: LIMITE_BUSCA,
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            document: true,
            _count: { select: { equipments: true } },
          },
        })
      : [];

    return (
      <div className="space-y-6">
        <CabecalhoPagina
          trilha={TRILHA}
          titulo="Abrir chamado"
          descricao="Passo 1 de 2 — encontre quem está ligando."
          acoes={
            <LinkBotao href="/admin/clientes/novo" variante="secundario" tamanho="sm">
              <UserPlus className="size-4" aria-hidden />
              Cadastrar cliente
            </LinkBotao>
          }
        />

        <Cartao>
          <CabecalhoCartao
            titulo="Quem está ligando"
            descricao="Busque por nome, empresa, e-mail, CPF/CNPJ ou telefone."
          />
          <form
            method="get"
            action="/admin/assistencia/novo"
            className="flex flex-wrap items-end gap-3 px-5 py-5"
          >
            <Campo
              rotulo="Buscar cliente"
              name="q"
              defaultValue={busca}
              autoFocus
              maxLength={120}
              className="min-w-0 flex-1 sm:max-w-md"
              placeholder="Ex.: Clínica Sorriso, 11 98888-7777"
            />
            <Botao type="submit">
              <Search className="size-4" aria-hidden />
              Buscar
            </Botao>
          </form>
        </Cartao>

        {busca && clientes.length === 0 ? (
          <Vazio
            icone={Users}
            titulo={`Nenhum cliente para “${busca}”`}
            descricao="Cadastre a pessoa agora ou abra o chamado sem cadastro — dá para ligar os dois depois."
            acao={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <LinkBotao href="/admin/clientes/novo">
                  <UserPlus className="size-4" aria-hidden />
                  Cadastrar cliente
                </LinkBotao>
                <LinkBotao href="/admin/assistencia/novo?avulso=1" variante="secundario">
                  <PhoneCall className="size-4" aria-hidden />
                  Abrir sem cadastro
                </LinkBotao>
              </div>
            }
          />
        ) : null}

        {clientes.length > 0 ? (
          <Cartao>
            <CabecalhoCartao
              titulo="Resultados"
              descricao={plural(clientes.length, "cliente encontrado", "clientes encontrados")}
            />
            <ul className="divide-y divide-graf-200">
              {clientes.map((pessoa) => (
                <li key={pessoa.id}>
                  <Link
                    href={`/admin/assistencia/novo?cliente=${pessoa.id}`}
                    className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-graf-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-graf-900">
                        {pessoa.companyName || pessoa.name}
                      </span>
                      <span className="block truncate text-apoio text-graf-500">
                        {pessoa.email}
                        {pessoa.phone ? ` · ${formatarTelefone(pessoa.phone)}` : ""}
                        {pessoa.document ? ` · ${formatarDocumento(pessoa.document)}` : ""}
                      </span>
                    </span>
                    <span className="text-apoio text-graf-500">
                      {plural(pessoa._count.equipments, "equipamento", "equipamentos")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Cartao>
        ) : null}

        {!busca ? (
          <Cartao>
            <CabecalhoCartao titulo="Ainda não é cliente?" />
            <div className="flex flex-wrap items-center gap-3 px-5 py-5">
              <LinkBotao href="/admin/clientes/novo" variante="secundario">
                <UserPlus className="size-4" aria-hidden />
                Cadastrar cliente
              </LinkBotao>
              <LinkBotao href="/admin/assistencia/novo?avulso=1" variante="secundario">
                <PhoneCall className="size-4" aria-hidden />
                Abrir chamado sem cadastro
              </LinkBotao>
            </div>
          </Cartao>
        ) : null}
      </div>
    );
  }

  /* ------------------------------------------- passo 2: o chamado em si */
  const [cliente, categorias] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: { street: true, number: true, district: true, city: true, state: true },
        },
        equipments: {
          // desativado não recebe chamado novo; o resto entra pela ordem do nome
          where: { status: { not: "desativado" } },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            brandName: true,
            modelName: true,
            serialNumber: true,
            room: true,
            location: { select: { name: true } },
          },
        },
        locations: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            address: {
              select: { street: true, number: true, district: true, city: true, state: true },
            },
          },
        },
      },
    }),
    categoriasParaEscolha(),
  ]);

  if (!cliente) notFound();

  const resumirEndereco = (
    endereco: {
      street: string;
      number: string;
      district: string;
      city: string;
      state: string;
    } | null,
  ) =>
    endereco
      ? [
          [endereco.street, endereco.number].filter(Boolean).join(", "),
          endereco.district,
          [endereco.city, endereco.state].filter(Boolean).join("/"),
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  const nomeExibido = cliente.companyName || cliente.name;

  const dadosDoCliente: ClienteDoChamado = {
    id: cliente.id,
    nome: nomeExibido,
    email: cliente.email,
    telefone: cliente.phone,
    enderecoPadrao: resumirEndereco(cliente.addresses[0] ?? null),
    equipamentos: cliente.equipments.map((equipamento) => ({
      id: equipamento.id,
      nome: equipamento.name,
      detalhe: [
        [equipamento.brandName, equipamento.modelName].filter(Boolean).join(" "),
        equipamento.serialNumber ? `série ${equipamento.serialNumber}` : "",
        [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · "),
      ]
        .filter(Boolean)
        .join(" — "),
    })),
    unidades: cliente.locations.map((unidade) => ({
      id: unidade.id,
      nome: unidade.name,
      endereco: resumirEndereco(unidade.address),
    })),
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={TRILHA}
        titulo={`Chamado para ${nomeExibido}`}
        descricao="Passo 2 de 2 — o que aconteceu, com qual equipamento e onde atender."
        acoes={
          <LinkBotao href="/admin/assistencia/novo" variante="secundario" tamanho="sm">
            <Users className="size-4" aria-hidden />
            Trocar de cliente
          </LinkBotao>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FormularioChamado
            cliente={dadosDoCliente}
            categorias={categorias}
            urgencias={URGENCIAS}
          />
        </div>

        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Cliente escolhido" />
            <div className="px-5 py-5">
              <Dados colunas={1}>
                <Dado rotulo="Nome">
                  <Link
                    href={`/admin/clientes/${cliente.id}`}
                    className="font-medium text-jb-700 hover:text-jb-500"
                  >
                    {nomeExibido}
                  </Link>
                </Dado>
                <Dado rotulo="E-mail">{cliente.email}</Dado>
                <Dado rotulo="Telefone">
                  {cliente.phone ? formatarTelefone(cliente.phone) : null}
                </Dado>
                <Dado rotulo="Endereço padrão">{dadosDoCliente.enderecoPadrao}</Dado>
                <Dado rotulo="Equipamentos no prontuário">
                  {plural(
                    dadosDoCliente.equipamentos.length,
                    "equipamento",
                    "equipamentos",
                  )}
                </Dado>
                <Dado rotulo="Unidades">
                  {dadosDoCliente.unidades.length > 0
                    ? dadosDoCliente.unidades.map((u) => u.nome).join(", ")
                    : null}
                </Dado>
              </Dados>

              <p className="mt-5 text-apoio leading-relaxed text-graf-500">
                Falta uma clínica na lista?{" "}
                <Link
                  href={`/admin/clientes/${cliente.id}/unidades`}
                  className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500"
                >
                  Cadastre a unidade
                </Link>{" "}
                para o técnico chegar no endereço certo.
              </p>
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
