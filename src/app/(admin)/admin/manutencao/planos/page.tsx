import type { Metadata } from "next";
import type { MaintenancePlan } from "@prisma/client";
import { Plus, Sparkles } from "lucide-react";

import {
  CabecalhoPagina,
  Dado,
  Dados,
  SUBNAV_SERVICO,
  SubNavegacao,
} from "@/components/admin/servico/cabecalho";
import { AreaAcao, CampoAcao, MoedaAcao } from "@/components/admin/servico/campos";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { Confirmar } from "@/components/ui/confirmar";
import { CabecalhoCartao, Cartao, Etiqueta, Vazio } from "@/components/ui/data";
import { Marcador } from "@/components/ui/form";
import {
  excluirPlanoDeManutencao,
  salvarPlanoDeManutencao,
} from "@/app/acoes/admin-servico";
import { formatarPreco, plural } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Planos de manutenção",
};

/**
 * Planos de manutenção preventiva.
 *
 * O plano define preço, vigência e quantas visitas estão incluídas — e é
 * dessas duas últimas que sai a periodicidade das visitas do contrato
 * (`periodMonths / visitsIncluded`). Por isso o formulário explica a conta em
 * vez de pedir "intervalo" num campo que o banco não tem.
 *
 * Benefícios são cadastrados aqui, um por linha. Nada é sugerido pelo código:
 * o que a JB não escrever, o site não promete.
 */

function CamposDoPlano({ plano }: { plano?: MaintenancePlan }) {
  return (
    <>
      {plano ? <Oculto nome="planoId" valor={plano.id} /> : null}

      <CampoAcao
        rotulo="Nome do plano"
        name="nome"
        required
        maxLength={120}
        defaultValue={plano?.name ?? ""}
        placeholder="Ex.: Preventiva Essencial"
      />

      <AreaAcao
        rotulo="Descrição"
        name="descricao"
        rows={3}
        defaultValue={plano?.description ?? ""}
        ajuda="Uma explicação curta do que o plano cobre."
      />

      <AreaAcao
        rotulo="Benefícios"
        name="beneficios"
        rows={4}
        defaultValue={(plano?.benefits ?? []).join("\n")}
        ajuda="Um benefício por linha, até 20. É o que aparece na página pública do plano."
        placeholder={"Duas visitas preventivas por ano\nAtendimento prioritário\n10% de desconto em peças"}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MoedaAcao
          rotulo="Preço"
          nome="precoCents"
          valorInicialCents={plano?.priceCents ?? undefined}
          ajuda="Deixe zerado para o plano ficar “sob orçamento”."
        />
        <CampoAcao
          rotulo="Vigência (meses)"
          name="periodoMeses"
          type="number"
          min={1}
          max={120}
          step={1}
          inputMode="numeric"
          defaultValue={plano?.periodMonths ?? 12}
        />
        <CampoAcao
          rotulo="Visitas incluídas"
          name="visitasIncluidas"
          type="number"
          min={0}
          max={60}
          step={1}
          inputMode="numeric"
          defaultValue={plano?.visitsIncluded ?? 0}
          ajuda="A vigência dividida pelas visitas define de quantos em quantos meses o técnico vai."
        />
        <CampoAcao
          rotulo="Desconto em peças (%)"
          name="descontoPecas"
          type="number"
          min={0}
          max={100}
          step={1}
          inputMode="numeric"
          defaultValue={plano?.partsDiscountPercent ?? 0}
        />
      </div>

      <CampoAcao
        rotulo="Ordem de exibição"
        name="ordem"
        type="number"
        step={1}
        inputMode="numeric"
        defaultValue={plano?.order ?? 0}
        ajuda="Menor aparece primeiro na página pública."
      />

      <Marcador
        name="publicado"
        defaultChecked={plano?.published ?? true}
        rotulo="Publicado no site"
        ajuda="Desmarcado, o plano continua valendo nos contratos existentes mas some da vitrine."
      />
    </>
  );
}

export default async function PaginaPlanos() {
  const usuario = await exigirArea("manutencao");
  const editar = podeEditar(usuario, "manutencao");

  const planos = await prisma.maintenancePlan.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { contracts: true } } },
  });

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Planos de manutenção"
        descricao="O que a JB oferece em preventiva: preço, vigência e visitas incluídas."
        acoes={
          editar ? (
            <PainelAcao
              rotulo="Novo plano"
              icone={<Plus className="size-4" aria-hidden />}
              variante="primario"
              tamanho="md"
              titulo="Novo plano de manutenção"
              acao={salvarPlanoDeManutencao}
              rotuloConfirmar="Criar plano"
              tamanhoPainel="lg"
            >
              <CamposDoPlano />
            </PainelAcao>
          ) : null
        }
      />

      <SubNavegacao itens={SUBNAV_SERVICO} atual="/admin/manutencao/planos" />

      {planos.length === 0 ? (
        <Vazio
          icone={Sparkles}
          titulo="Nenhum plano cadastrado"
          descricao="Cadastre o primeiro plano para poder vincular contratos e gerar a agenda de visitas preventivas."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {planos.map((plano) => {
            const intervalo =
              plano.visitsIncluded > 0
                ? Math.max(1, Math.round(plano.periodMonths / plano.visitsIncluded))
                : null;

            return (
              <li key={plano.id}>
                <Cartao className="h-full">
                  <CabecalhoCartao
                    titulo={plano.name}
                    descricao={plano.description || undefined}
                    acao={
                      <Etiqueta tom={plano.published ? "ok" : "neutro"}>
                        {plano.published ? "Publicado" : "Rascunho"}
                      </Etiqueta>
                    }
                  />

                  <div className="space-y-5 px-5 py-5">
                    <Dados>
                      <Dado rotulo="Preço">
                        {plano.priceCents === null ? (
                          <span className="text-graf-500">Sob orçamento</span>
                        ) : (
                          <span className="tabular font-semibold">
                            {formatarPreco(plano.priceCents)}
                          </span>
                        )}
                      </Dado>
                      <Dado rotulo="Vigência">
                        {plural(plano.periodMonths, "mês", "meses")}
                      </Dado>
                      <Dado rotulo="Visitas incluídas">
                        {plano.visitsIncluded > 0
                          ? `${plural(plano.visitsIncluded, "visita", "visitas")}${
                              intervalo ? ` · uma a cada ${plural(intervalo, "mês", "meses")}` : ""
                            }`
                          : null}
                      </Dado>
                      <Dado rotulo="Desconto em peças">
                        {plano.partsDiscountPercent > 0
                          ? `${plano.partsDiscountPercent}%`
                          : null}
                      </Dado>
                      <Dado rotulo="Contratos vinculados">
                        {plano._count.contracts > 0 ? plano._count.contracts : null}
                      </Dado>
                    </Dados>

                    {plano.benefits.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                          Benefícios
                        </p>
                        <ul className="mt-1.5 space-y-1 text-sm text-graf-700">
                          {plano.benefits.map((beneficio) => (
                            <li key={beneficio} className="flex gap-2">
                              <span aria-hidden className="text-jb-500">
                                •
                              </span>
                              {beneficio}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {editar ? (
                      <div className="flex flex-wrap items-center gap-2 border-t border-graf-200 pt-4">
                        <PainelAcao
                          rotulo="Editar"
                          titulo={`Editar ${plano.name}`}
                          acao={salvarPlanoDeManutencao}
                          rotuloConfirmar="Salvar alterações"
                          tamanhoPainel="lg"
                        >
                          <CamposDoPlano plano={plano} />
                        </PainelAcao>

                        <FormularioAcao
                          acao={excluirPlanoDeManutencao}
                          esconderBotao
                          className="space-y-0"
                        >
                          <Oculto nome="planoId" valor={plano.id} />
                          <Confirmar
                            rotulo="Excluir"
                            tamanho="sm"
                            pergunta={`Excluir o plano "${plano.name}"?`}
                            detalhe={
                              plano._count.contracts > 0
                                ? "Este plano tem contratos vinculados e a exclusão será recusada. Despublique-o para tirá-lo da vitrine sem apagar o histórico."
                                : "O plano some da vitrine e do formulário de contrato. Esta ação não pode ser desfeita."
                            }
                            rotuloConfirmar="Excluir plano"
                          />
                        </FormularioAcao>
                      </div>
                    ) : null}
                  </div>
                </Cartao>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
