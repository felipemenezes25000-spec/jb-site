"use client";

import { useActionState, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { salvarUnidade, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import { ListaEditavel } from "@/components/admin/catalogo/lista-editavel";
import {
  BarraSalvar,
  Bloco,
  Grade,
  RegiaoEstado,
  Secao,
} from "@/components/admin/catalogo/moldura-form";
import { Botao, LinkBotao } from "@/components/ui/button";
import { EnviarArquivo, type ArquivoEnviado } from "@/components/ui/enviar-arquivo";
import { Area, Campo, Selecao } from "@/components/ui/form";

/* ============================================================================
   Unidade de estoque

   Seminovo, usado e recondicionado não são "quantidade": são peças, cada uma
   com número de série, horas de uso e uma revisão própria. Esta tela é o
   prontuário dessa peça antes de ela virar equipamento na clínica do cliente.

   Situação e pedido andam juntos: uma unidade ligada a um item de pedido não
   pode voltar a "disponível" por aqui, senão a mesma peça seria vendida duas
   vezes. O servidor recusa; a tela explica.
   ============================================================================ */

export type UnidadeEditavel = {
  id: string;
  productId: string;
  serialNumber: string;
  status: string;
  manufactureYear: number | null;
  usageHours: number | null;
  usageCycles: number | null;
  warrantyMonths: number | null;
  acquiredFrom: string;
  conditionNotes: string;
  inspectionNotes: string;
  checklist: ItemChecklist[];
  fotos: FotoUnidade[];
  /** Preenchido quando a unidade já foi vendida. */
  pedido: { numero: string; id: string } | null;
};

export type ItemChecklist = { label: string; result: string; note: string };
export type FotoUnidade = { mediaId: string; url: string };

export type ProdutoDaUnidade = { id: string; nome: string; sku: string; condicao: string };

const RESULTADOS = [
  { valor: "verificado", rotulo: "Verificado" },
  { valor: "reparado", rotulo: "Reparado" },
  { valor: "substituido", rotulo: "Substituído" },
  { valor: "nao_aplicavel", rotulo: "Não se aplica" },
];

const SITUACOES = [
  { valor: "disponivel", rotulo: "Disponível" },
  { valor: "reservado", rotulo: "Reservado" },
  { valor: "vendido", rotulo: "Vendido" },
  { valor: "indisponivel", rotulo: "Indisponível" },
];

export function FormularioUnidade({
  unidade,
  produtos,
  produtoPreSelecionado,
  somenteLeitura,
}: {
  unidade?: UnidadeEditavel;
  produtos: ProdutoDaUnidade[];
  produtoPreSelecionado?: string;
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarUnidade, {});
  const [checklist, setChecklist] = useState<ItemChecklist[]>(unidade?.checklist ?? []);
  const [fotos, setFotos] = useState<FotoUnidade[]>(unidade?.fotos ?? []);
  const jaAdicionadas = useRef(new Set((unidade?.fotos ?? []).map((foto) => foto.url)));

  function receber(arquivos: ArquivoEnviado[]) {
    const novas: FotoUnidade[] = [];
    for (const arquivo of arquivos) {
      if (!arquivo.id || jaAdicionadas.current.has(arquivo.url)) continue;
      jaAdicionadas.current.add(arquivo.url);
      novas.push({ mediaId: arquivo.id, url: arquivo.url });
    }
    if (novas.length === 0) return;
    setFotos((atual) => [...atual, ...novas]);
  }

  const semRotulo = checklist.filter((item) => item.label.trim() === "").length;
  const travado = Boolean(unidade?.pedido);

  return (
    <Bloco
      titulo={unidade ? "Editar unidade" : "Nova unidade"}
      descricao="Peça identificada: número de série, estado real e o que foi revisado."
    >
      <form action={enviar} className="space-y-8">
        {unidade ? <input type="hidden" name="id" value={unidade.id} /> : null}
        <input
          type="hidden"
          name="checklist"
          value={JSON.stringify(
            checklist.map((item) => ({
              label: item.label.trim(),
              result: item.result,
              note: item.note.trim(),
            })),
          )}
        />
        <input
          type="hidden"
          name="midias"
          value={JSON.stringify(fotos.map((foto) => foto.mediaId))}
        />

        <RegiaoEstado estado={estado} />

        {travado ? (
          <p className="rounded-lg border border-info-500/30 bg-info-50 px-4 py-3 text-sm text-info-700">
            Esta unidade está vinculada ao pedido {unidade?.pedido?.numero}. A situação só muda com o
            pedido; os demais dados continuam editáveis.
          </p>
        ) : null}

        <fieldset disabled={somenteLeitura} className="space-y-8">
          <Secao titulo="Identificação">
            <Grade>
              <Selecao
                rotulo="Produto"
                name="productId"
                defaultValue={unidade?.productId ?? produtoPreSelecionado ?? ""}
                required
                erro={estado.campo === "productId" ? estado.erro : undefined}
                ajuda="A unidade herda nome, fotos e preço deste produto."
              >
                <option value="">Escolha o produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} — {produto.sku} ({produto.condicao})
                  </option>
                ))}
              </Selecao>
              <Campo
                rotulo="Número de série"
                name="serialNumber"
                defaultValue={unidade?.serialNumber ?? ""}
                maxLength={80}
                erro={estado.campo === "serialNumber" ? estado.erro : undefined}
                ajuda="Como está na plaqueta do equipamento. Deixe vazio se não houver."
              />
              <Selecao
                rotulo="Situação"
                name="status"
                defaultValue={unidade?.status ?? "disponivel"}
                disabled={travado}
                erro={estado.campo === "status" ? estado.erro : undefined}
              >
                {SITUACOES.map((situacao) => (
                  <option key={situacao.valor} value={situacao.valor}>
                    {situacao.rotulo}
                  </option>
                ))}
              </Selecao>
              <Campo
                rotulo="Origem"
                name="acquiredFrom"
                defaultValue={unidade?.acquiredFrom ?? ""}
                maxLength={160}
                ajuda="De quem veio: troca, recompra, leilão, fornecedor."
              />
            </Grade>
            {travado ? (
              <input type="hidden" name="status" value={unidade?.status ?? "vendido"} />
            ) : null}
          </Secao>

          <Secao titulo="Uso e garantia">
            <Grade colunas={3}>
              <Campo
                rotulo="Ano de fabricação"
                name="manufactureYear"
                type="number"
                inputMode="numeric"
                min={1950}
                max={2200}
                defaultValue={unidade?.manufactureYear ?? ""}
              />
              <Campo
                rotulo="Horas de uso"
                name="usageHours"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={unidade?.usageHours ?? ""}
              />
              <Campo
                rotulo="Ciclos"
                name="usageCycles"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={unidade?.usageCycles ?? ""}
                ajuda="Autoclaves e compressores costumam contar ciclos."
              />
              <Campo
                rotulo="Garantia da JB (meses)"
                name="warrantyMonths"
                type="number"
                inputMode="numeric"
                min={0}
                max={600}
                defaultValue={unidade?.warrantyMonths ?? ""}
                ajuda="Garantia desta peça, que pode ser diferente da do produto novo."
              />
            </Grade>
          </Secao>

          <Secao titulo="Estado e revisão">
            <Area
              rotulo="Estado de conservação"
              name="conditionNotes"
              defaultValue={unidade?.conditionNotes ?? ""}
              rows={4}
              maxLength={2000}
              ajuda="O que o cliente vai ver: riscos, desgaste, o que está impecável."
            />
            <Area
              rotulo="Notas técnicas da revisão"
              name="inspectionNotes"
              defaultValue={unidade?.inspectionNotes ?? ""}
              rows={4}
              maxLength={2000}
              ajuda="Uso interno da equipe técnica."
            />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-graf-800">Checklist de revisão</p>
              <ListaEditavel<ItemChecklist>
                itens={checklist}
                aoMudar={setChecklist}
                desabilitado={somenteLeitura}
                nomeDaLinha="item do checklist"
                rotuloAdicionar="Adicionar item revisado"
                vazio="Nenhum item registrado. Cada linha é uma peça ou função conferida."
                novoItem={() => ({ label: "", result: "verificado", note: "" })}
                renderizar={(item, _indice, atualizar) => (
                  <div className="grid gap-3 sm:grid-cols-[1fr_11rem_1fr]">
                    <Campo
                      rotulo="O que foi conferido"
                      value={item.label}
                      onChange={(evento) => atualizar({ label: evento.target.value })}
                      maxLength={160}
                      required
                      placeholder="Mangueira do sugador"
                    />
                    <Selecao
                      rotulo="Resultado"
                      value={item.result}
                      onChange={(evento) => atualizar({ result: evento.target.value })}
                    >
                      {RESULTADOS.map((resultado) => (
                        <option key={resultado.valor} value={resultado.valor}>
                          {resultado.rotulo}
                        </option>
                      ))}
                    </Selecao>
                    <Campo
                      rotulo="Observação"
                      value={item.note}
                      onChange={(evento) => atualizar({ note: evento.target.value })}
                      maxLength={400}
                    />
                  </div>
                )}
              />
            </div>
          </Secao>

          <Secao
            titulo="Fotos desta peça"
            descricao="Fotos reais da unidade, não do catálogo — é o que evita discussão na entrega."
          >
            {!somenteLeitura ? (
              <EnviarArquivo
                rotulo="Adicionar fotos da unidade"
                multiplo
                aceita={["image/jpeg", "image/png", "image/webp"]}
                aoEnviado={receber}
              />
            ) : null}

            {fotos.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {fotos.map((foto, indice) => (
                  <li key={foto.mediaId} className="relative">
                    <img
                      src={foto.url}
                      alt={`Foto ${indice + 1} desta unidade`}
                      className="aspect-square w-full rounded-lg border border-graf-200 bg-white object-cover"
                    />
                    {!somenteLeitura ? (
                      <button
                        type="button"
                        onClick={() => setFotos((atual) => atual.filter((_, i) => i !== indice))}
                        aria-label={`Remover foto ${indice + 1}`}
                        className="absolute right-1.5 top-1.5 inline-flex size-11 items-center justify-center rounded-lg bg-white/90 text-jb-700 shadow-card transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-graf-300 bg-graf-50/60 px-4 py-6 text-center text-sm text-graf-500">
                Nenhuma foto desta unidade ainda.
              </p>
            )}
          </Secao>
        </fieldset>

        {!somenteLeitura ? (
          <BarraSalvar
            ajuda={semRotulo > 0 ? `${semRotulo} item(ns) do checklist sem descrição.` : undefined}
          >
            <LinkBotao href="/admin/estoque/unidades" variante="secundario">
              Voltar para a lista
            </LinkBotao>
            <Botao type="submit" carregando={enviando} disabled={semRotulo > 0}>
              {unidade ? "Salvar unidade" : "Cadastrar unidade"}
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
