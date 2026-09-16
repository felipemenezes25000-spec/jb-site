import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";

import { CabecalhoPagina, Dado, Dados } from "@/components/admin/servico/cabecalho";
import { AreaAcao, CampoAcao, MoedaAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { Botao } from "@/components/ui/button";
import { CabecalhoCartao, Cartao, Vazio } from "@/components/ui/data";
import { Selecao } from "@/components/ui/form";
import { criarContratoDeManutencao } from "@/app/acoes/admin-servico";
import { formatarPreco, paraInputDate, plural } from "@/lib/format";
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
  title: "Novo contrato de manutenção",
};

/**
 * Criação de contrato em dois passos.
 *
 * O primeiro passo escolhe o cliente e o segundo mostra os equipamentos dele
 * para marcar. É uma navegação de verdade (`?cliente=`), não estado no
 * navegador: assim a tela continua renderizada no servidor, funciona sem
 * JavaScript e o endereço pode ser colado para outra pessoa continuar.
 *
 * A periodicidade das visitas sai do plano (vigência ÷ visitas incluídas). O
 * campo "intervalo" existe para o caso de o contrato combinar outra frequência
 * — e, como `MaintenanceContract` não tem coluna para guardar isso, o valor
 * usado aparece escrito na ficha do contrato para quem for gerar visitas
 * depois saber qual repetir.
 */

type Busca = { cliente?: string };

export default async function PaginaNovoContrato({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  await exigirEdicao("manutencao");
  const { cliente: clienteId } = await searchParams;

  const trilha = [
    { rotulo: "Painel", href: "/admin" },
    { rotulo: "Manutenção", href: "/admin/manutencao" },
    { rotulo: "Contratos", href: "/admin/manutencao/contratos" },
    { rotulo: "Novo" },
  ];

  /* ------------------------------------------------- passo 1: o cliente */
  if (!clienteId) {
    const clientes = await prisma.customer.findMany({
      where: { equipments: { some: {} } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { equipments: true } },
      },
    });

    return (
      <div className="space-y-6">
        <CabecalhoPagina
          trilha={trilha}
          titulo="Novo contrato de manutenção"
          descricao="Passo 1 de 2 — escolha o cliente cujos equipamentos serão cobertos."
        />

        {clientes.length === 0 ? (
          <Vazio
            icone={Users}
            titulo="Nenhum cliente com equipamento cadastrado"
            descricao="O contrato cobre equipamentos do prontuário. Cadastre o parque instalado do cliente antes de contratar a preventiva."
          />
        ) : (
          <Cartao>
            <CabecalhoCartao titulo="Cliente" descricao="Só aparecem clientes com equipamento no prontuário" />
            <form
              method="get"
              action="/admin/manutencao/contratos/novo"
              className="flex flex-wrap items-end gap-3 px-5 py-5"
            >
              <Selecao
                rotulo="Cliente"
                name="cliente"
                required
                className="min-w-0 flex-1 sm:max-w-md"
              >
                <option value="">Selecione…</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.name} ({plural(cliente._count.equipments, "equipamento", "equipamentos")})
                  </option>
                ))}
              </Selecao>
              <Botao type="submit">Continuar</Botao>
            </form>
          </Cartao>
        )}
      </div>
    );
  }

  /* ---------------------------------------- passo 2: contrato e cobertura */
  const [cliente, planos] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        name: true,
        equipments: {
          orderBy: [{ status: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            brandName: true,
            modelName: true,
            serialNumber: true,
            maintenanceIntervalDays: true,
            location: { select: { name: true } },
            room: true,
          },
        },
      },
    }),
    prisma.maintenancePlan.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        priceCents: true,
        periodMonths: true,
        visitsIncluded: true,
        published: true,
      },
    }),
  ]);

  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={trilha}
        titulo={`Contrato para ${cliente.name}`}
        descricao="Passo 2 de 2 — escolha o plano, o período e os equipamentos cobertos."
      />

      {cliente.equipments.length === 0 ? (
        <Vazio
          titulo="Este cliente não tem equipamento no prontuário"
          descricao="Cadastre ao menos um equipamento para poder cobri-lo por contrato."
        />
      ) : (
        <Cartao>
          <CabecalhoCartao
            titulo="Dados do contrato"
            descricao="As visitas previstas são geradas assim que o contrato é criado"
          />
          <div className="px-5 py-5">
            <FormularioAcao acao={criarContratoDeManutencao} rotulo="Criar contrato e gerar visitas">
              <Oculto nome="customerId" valor={cliente.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <SelecaoAcao rotulo="Plano" name="planoId" ajuda="Define preço e periodicidade padrão.">
                  <option value="">Sem plano (contrato avulso)</option>
                  {planos.map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.name}
                      {plano.priceCents === null
                        ? " — sob orçamento"
                        : ` — ${formatarPreco(plano.priceCents)}`}
                      {plano.visitsIncluded > 0
                        ? ` · ${plural(plano.visitsIncluded, "visita", "visitas")} em ${plural(plano.periodMonths, "mês", "meses")}`
                        : ""}
                      {plano.published ? "" : " (não publicado)"}
                    </option>
                  ))}
                </SelecaoAcao>

                <MoedaAcao
                  rotulo="Valor do contrato"
                  nome="precoCents"
                  ajuda="Deixe zerado para herdar o preço do plano."
                />

                <CampoAcao
                  rotulo="Início da vigência"
                  name="inicio"
                  type="date"
                  defaultValue={paraInputDate(new Date())}
                />

                <CampoAcao
                  rotulo="Fim da vigência"
                  name="fim"
                  type="date"
                  ajuda="Em branco, usa a vigência do plano escolhido."
                />

                <CampoAcao
                  rotulo="Intervalo entre visitas (meses)"
                  name="intervaloMeses"
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  inputMode="numeric"
                  ajuda="Só preencha para fugir da periodicidade do plano."
                />
              </div>

              <fieldset>
                <legend className="mb-1 text-sm font-semibold text-graf-800">
                  Equipamentos cobertos
                </legend>
                <p className="mb-3 text-[0.8125rem] text-graf-500">
                  Marque o que entra na preventiva. Cada equipamento marcado ganha a própria
                  agenda de visitas.
                </p>

                <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                  {cliente.equipments.map((equipamento) => {
                    const id = `equipamento-${equipamento.id}`;
                    const detalhe = [
                      [equipamento.brandName, equipamento.modelName].filter(Boolean).join(" "),
                      equipamento.serialNumber ? `série ${equipamento.serialNumber}` : "",
                      [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · "),
                    ]
                      .filter(Boolean)
                      .join(" — ");

                    return (
                      <li key={equipamento.id}>
                        <label
                          htmlFor={id}
                          className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-3"
                        >
                          <input
                            id={id}
                            type="checkbox"
                            name="equipamentoIds"
                            value={equipamento.id}
                            className="mt-0.5 size-[18px] shrink-0 rounded border-graf-450 text-jb-500 focus:ring-2 focus:ring-jb-500/30"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-graf-900">
                              {equipamento.name}
                            </span>
                            {detalhe ? (
                              <span className="block text-[0.8125rem] text-graf-500">{detalhe}</span>
                            ) : null}
                            <span className="block text-[0.8125rem] text-graf-500">
                              {equipamento.maintenanceIntervalDays
                                ? `Intervalo próprio: ${plural(equipamento.maintenanceIntervalDays, "dia", "dias")}`
                                : "Sem intervalo próprio — depende do plano ou do campo acima"}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>

              <AreaAcao rotulo="Observações do contrato" name="notas" rows={3} />
            </FormularioAcao>
          </div>
        </Cartao>
      )}

      <Cartao>
        <CabecalhoCartao titulo="Cliente escolhido" />
        <div className="px-5 py-5">
          <Dados>
            <Dado rotulo="Nome">{cliente.name}</Dado>
            <Dado rotulo="Equipamentos no prontuário">
              {plural(cliente.equipments.length, "equipamento", "equipamentos")}
            </Dado>
          </Dados>
        </div>
      </Cartao>
    </div>
  );
}
