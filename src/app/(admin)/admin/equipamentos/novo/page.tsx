import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CabecalhoPagina } from "@/components/admin/servico/cabecalho";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { Botao } from "@/components/ui/button";
import { CabecalhoCartao, Cartao, Vazio } from "@/components/ui/data";
import { Selecao } from "@/components/ui/form";
import { cadastrarEquipamentoNoAdmin } from "@/app/acoes/admin-servico";
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
  title: "Novo equipamento",
};

/**
 * Cadastro de equipamento pela equipe técnica.
 *
 * A origem gravada é sempre `cadastro_tecnico`. "Comprado na JB" é carimbo do
 * fluxo de pedido, quando o pagamento é confirmado — marcar isso na mão criaria
 * uma garantia que não existe no papel.
 *
 * A próxima preventiva é calculada a partir da instalação (ou da compra, ou de
 * hoje) somada ao intervalo. Sem intervalo, não há próxima data: campo vazio é
 * melhor que data inventada gerando cobrança indevida.
 */

type Busca = { cliente?: string };

export default async function PaginaNovoEquipamento({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}) {
  await exigirEdicao("equipamentos");
  const { cliente: clienteId } = await searchParams;

  const trilha = [
    { rotulo: "Painel", href: "/admin" },
    { rotulo: "Equipamentos", href: "/admin/equipamentos" },
    { rotulo: "Novo" },
  ];

  if (!clienteId) {
    const clientes = await prisma.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
      take: 1000,
    });

    return (
      <div className="space-y-6">
        <CabecalhoPagina
          trilha={trilha}
          titulo="Novo equipamento"
          descricao="Passo 1 de 2 — de quem é o equipamento."
        />

        {clientes.length === 0 ? (
          <Vazio
            titulo="Nenhum cliente ativo cadastrado"
            descricao="O equipamento vive na ficha de um cliente. Cadastre o cliente antes."
          />
        ) : (
          <Cartao>
            <CabecalhoCartao titulo="Cliente" />
            <form
              method="get"
              action="/admin/equipamentos/novo"
              className="flex flex-wrap items-end gap-3 px-5 py-5"
            >
              <Selecao rotulo="Cliente" name="cliente" required className="min-w-0 flex-1 sm:max-w-md">
                <option value="">Selecione…</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.name} — {cliente.email}
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

  const [cliente, categorias] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        name: true,
        locations: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      },
    }),
    prisma.category.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={trilha}
        titulo={`Equipamento de ${cliente.name}`}
        descricao="Passo 2 de 2 — identificação, local e periodicidade da preventiva."
      />

      <Cartao>
        <CabecalhoCartao
          titulo="Dados do equipamento"
          descricao="Só o que for verdade: campo em branco é melhor que dado chutado"
        />
        <div className="px-5 py-5">
          <FormularioAcao acao={cadastrarEquipamentoNoAdmin} rotulo="Cadastrar equipamento">
            <Oculto nome="customerId" valor={cliente.id} />

            <CampoAcao
              rotulo="Nome do equipamento"
              name="nome"
              required
              maxLength={180}
              placeholder="Ex.: Autoclave Vitale 21"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelecaoAcao rotulo="Categoria" name="categoriaId">
                <option value="">Sem categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.name}
                  </option>
                ))}
              </SelecaoAcao>

              <CampoAcao rotulo="Marca" name="marca" maxLength={120} />
              <CampoAcao rotulo="Modelo" name="modelo" maxLength={120} />
              <CampoAcao
                rotulo="Número de série"
                name="serie"
                maxLength={120}
                ajuda="É por ele que a assistência encontra o equipamento."
              />

              <SelecaoAcao rotulo="Tensão" name="voltagem">
                <option value="">Não informada</option>
                <option value="110">110 V</option>
                <option value="220">220 V</option>
                <option value="bivolt">Bivolt</option>
              </SelecaoAcao>

              <SelecaoAcao
                rotulo="Unidade do cliente"
                name="locationId"
                ajuda={
                  cliente.locations.length === 0
                    ? "Este cliente ainda não tem unidades cadastradas."
                    : undefined
                }
              >
                <option value="">Sem unidade definida</option>
                {cliente.locations.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.name}
                  </option>
                ))}
              </SelecaoAcao>

              <CampoAcao
                rotulo="Sala"
                name="sala"
                maxLength={120}
                placeholder="Ex.: Consultório 2"
              />

              <CampoAcao rotulo="Comprado em" name="compradoEm" type="date" />
              <CampoAcao rotulo="Instalado em" name="instaladoEm" type="date" />
              <CampoAcao rotulo="Garantia até" name="garantiaAte" type="date" />

              <CampoAcao
                rotulo="Intervalo de preventiva (dias)"
                name="intervaloDias"
                type="number"
                min={1}
                max={3650}
                step={1}
                inputMode="numeric"
                ajuda="Em branco, o equipamento fica sem próxima preventiva calculada."
              />
            </div>

            <AreaAcao
              rotulo="Observações"
              name="notas"
              rows={3}
              ajuda="Notas internas sobre o equipamento."
            />
          </FormularioAcao>
        </div>
      </Cartao>
    </div>
  );
}
