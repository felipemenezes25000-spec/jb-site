"use client";

import { useActionState, useState } from "react";

import { salvarServico, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import { CampoNomeESlug } from "@/components/admin/catalogo/campo-slug";
import { BarraSalvar, Bloco, Grade, RegiaoEstado } from "@/components/admin/catalogo/moldura-form";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campos-br";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";

/* ============================================================================
   Serviço vendável

   Preço zerado aqui não é "de graça": é "sob orçamento" — o botão de compra
   direta some e o cliente é levado a pedir uma proposta. Por isso o campo tem
   um marcador próprio em vez de depender de o valor ser zero por acidente.

   A duração combinada não tem coluna no banco; ela entra como primeira linha
   da descrição, em texto, e o servidor cuida de não duplicar a linha ao
   salvar de novo.
   ============================================================================ */

export type ServicoEditavel = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  description: string;
  priceCents: number | null;
  published: boolean;
  order: number;
};

const TIPOS = [
  { valor: "instalacao", rotulo: "Instalação" },
  { valor: "visita_tecnica", rotulo: "Visita técnica" },
  { valor: "manutencao_preventiva", rotulo: "Manutenção preventiva" },
  { valor: "manutencao_corretiva", rotulo: "Manutenção corretiva" },
  { valor: "treinamento", rotulo: "Treinamento" },
  { valor: "retirada_equipamento", rotulo: "Retirada de equipamento" },
  { valor: "outro", rotulo: "Outro" },
];

/** Lê "Duração estimada: 1h 30min" de volta para minutos, para o campo. */
function minutosDaDescricao(descricao: string) {
  const linha = /^Duração estimada:\s*(?:(\d+)h)?\s*(?:(\d+)\s*min)?/i.exec(descricao.trim());
  if (!linha) return "";
  const horas = Number(linha[1] ?? 0);
  const minutos = Number(linha[2] ?? 0);
  const total = horas * 60 + minutos;
  return total > 0 ? String(total) : "";
}

function descricaoSemDuracao(descricao: string) {
  return descricao.replace(/^Duração estimada:[^\n]*\n?/i, "").trim();
}

export function FormularioServico({
  servico,
  ordemSugerida,
  somenteLeitura,
}: {
  servico?: ServicoEditavel;
  ordemSugerida?: number;
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarServico, {});
  const [sobOrcamento, setSobOrcamento] = useState(
    servico ? servico.priceCents === null : false,
  );
  const [preco, setPreco] = useState(servico?.priceCents ?? 0);

  return (
    <Bloco
      titulo={servico ? "Editar serviço" : "Novo serviço"}
      descricao="Serviços podem ser vendidos sozinhos ou como adicional de um produto."
    >
      <form action={enviar} className="space-y-8">
        {servico ? <input type="hidden" name="id" value={servico.id} /> : null}
        <input type="hidden" name="priceCents" value={sobOrcamento ? "" : preco} />
        <RegiaoEstado estado={estado} />

        <fieldset disabled={somenteLeitura} className="space-y-8">
          <CampoNomeESlug
            nomeInicial={servico?.name}
            slugInicial={servico?.slug}
            rotuloNome="Nome do serviço"
            autoFocus={!servico}
            erroNome={estado.campo === "name" ? estado.erro : undefined}
            erroSlug={estado.campo === "slug" ? estado.erro : undefined}
          />

          <Grade>
            <Selecao rotulo="Tipo" name="kind" defaultValue={servico?.kind ?? "outro"}>
              {TIPOS.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </Selecao>
            <Campo
              rotulo="Duração estimada (minutos)"
              name="durationMinutes"
              type="number"
              inputMode="numeric"
              min={0}
              max={2880}
              defaultValue={servico ? minutosDaDescricao(servico.description) : ""}
              ajuda="Vira a primeira linha da descrição. Deixe vazio se variar demais."
            />
          </Grade>

          <div className="space-y-3">
            {sobOrcamento ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-graf-800">Preço base</p>
                <p className="flex h-11 items-center rounded-lg border border-graf-200 bg-graf-50 px-3.5 text-sm text-graf-600">
                  Sob orçamento — o cliente pede uma proposta.
                </p>
              </div>
            ) : (
              <CampoMoeda
                rotulo="Preço base"
                valorCents={preco}
                aoMudar={setPreco}
                erro={estado.campo === "priceCents" ? estado.erro : undefined}
                ajuda="Pode ser substituído produto a produto na aba Adicionais."
              />
            )}
            <Marcador
              rotulo="Sob orçamento"
              ajuda="Sem preço fixo: o serviço só é fechado depois de uma proposta."
              checked={sobOrcamento}
              onChange={(evento) => setSobOrcamento(evento.target.checked)}
            />
          </div>

          <Area
            rotulo="Descrição"
            name="description"
            defaultValue={servico ? descricaoSemDuracao(servico.description) : ""}
            rows={5}
            maxLength={1200}
            ajuda="O que está incluso, o que não está, e o que o cliente precisa preparar."
          />

          <Grade>
            <Campo
              rotulo="Ordem"
              name="order"
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              defaultValue={servico?.order ?? ordemSugerida ?? 0}
              ajuda="Menor aparece antes."
            />
            <div className="flex items-end pb-1">
              <Marcador
                name="published"
                value="on"
                defaultChecked={servico?.published ?? true}
                rotulo="Publicado"
                ajuda="Despublicado, deixa de ser oferecido no site."
              />
            </div>
          </Grade>
        </fieldset>

        {!somenteLeitura ? (
          <BarraSalvar>
            <LinkBotao href="/admin/servicos" variante="secundario">
              Voltar para a lista
            </LinkBotao>
            <Botao type="submit" carregando={enviando}>
              {servico ? "Salvar serviço" : "Criar serviço"}
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
