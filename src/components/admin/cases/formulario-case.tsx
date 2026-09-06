"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import {
  BarraDeSalvar,
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Selecao } from "@/components/ui/form";
import { gerarSlug } from "@/lib/format";

/* ============================================================================
   Formulário de um case técnico

   Os campos estão na ordem do atendimento — relato, diagnóstico, intervenção,
   teste —, e não na ordem que dá menos trabalho de preencher. Um case escrito
   fora dessa ordem tende a virar propaganda com data.

   O campo do diagnóstico se chama "confirmado na bancada" na tela, e não
   "diagnóstico". A palavra faz diferença: é ela que lembra que suspeita não
   entra aí.

   Não há campo de autorização aqui. Autorização é um ato com data e
   procedência, registrado por ação própria.
   ============================================================================ */

export type PessoaDaEquipe = { id: string; name: string };

export type DadosDoCase = {
  id: string;
  title: string;
  slug: string;
  symptom: string;
  equipmentLabel: string;
  modelLabel: string;
  diagnosis: string;
  intervention: string;
  parts: string[];
  finalTests: string;
  durationLabel: string;
  result: string;
  technicianId: string;
  reviewerId: string;
  workOrderId: string;
  pendingNote: string;
};

export type OrdemDeServico = { id: string; number: string; rotulo: string };

const VAZIO: EstadoAcao = {};

export function FormularioCase({
  acao,
  caso,
  equipe,
  ordens,
  somenteLeitura,
}: {
  acao: AcaoDeFormulario;
  caso?: DadosDoCase;
  equipe: PessoaDaEquipe[];
  ordens: OrdemDeServico[];
  somenteLeitura?: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);
  const criando = !caso;

  const [titulo, setTitulo] = useState(caso?.title ?? "");
  const [slug, setSlug] = useState(caso?.slug ?? "");
  const [slugManual, setSlugManual] = useState(Boolean(caso));

  const [tecnico, setTecnico] = useState(caso?.technicianId ?? "");
  const [revisor, setRevisor] = useState(caso?.reviewerId ?? "");
  const mesmaPessoa = Boolean(tecnico) && tecnico === revisor;

  return (
    <form action={executar} className="space-y-5">
      <MensagemDoFormulario estado={estado} />
      {caso ? <input type="hidden" name="id" value={caso.id} /> : null}

      <fieldset disabled={somenteLeitura} className="space-y-5">
        <Bloco titulo="Identificação">
          <Campo
            rotulo="Título"
            name="title"
            value={titulo}
            onChange={(evento) => {
              setTitulo(evento.target.value);
              if (!slugManual) setSlug(gerarSlug(evento.target.value));
            }}
            maxLength={160}
            required
            erro={erroDoCampo(estado, "title")}
          />
          <Campo
            rotulo="Endereço"
            name="slug"
            value={slug}
            onChange={(evento) => {
              setSlugManual(true);
              setSlug(evento.target.value);
            }}
            maxLength={80}
            erro={erroDoCampo(estado, "slug")}
            ajuda={criando ? "Acompanha o título até você mexer." : undefined}
          />
          <Campo
            rotulo="Família do equipamento"
            name="equipmentLabel"
            defaultValue={caso?.equipmentLabel ?? ""}
            maxLength={120}
            placeholder="Autoclave de bancada"
          />
          <Campo
            rotulo="Marca e modelo"
            name="modelLabel"
            defaultValue={caso?.modelLabel ?? ""}
            maxLength={120}
            ajuda="Só quando o cliente autorizar citar. Vazio some da página."
          />
        </Bloco>

        <Bloco
          titulo="O atendimento"
          descricao="Na ordem em que aconteceu. Diagnóstico é o que foi confirmado na bancada — suspeita não entra."
        >
          <Area
            rotulo="O que a clínica relatou"
            name="symptom"
            rows={3}
            maxLength={1000}
            defaultValue={caso?.symptom ?? ""}
            className="sm:col-span-2"
            ajuda="Com as palavras do cliente, não com a interpretação do técnico."
          />
          <Area
            rotulo="Diagnóstico confirmado na bancada"
            name="diagnosis"
            rows={4}
            maxLength={2000}
            defaultValue={caso?.diagnosis ?? ""}
            className="sm:col-span-2"
            ajuda="O que a medição mostrou. Se ainda não há confirmação, deixe vazio — o case não é publicado sem isso."
          />
          <Area
            rotulo="O que foi feito"
            name="intervention"
            rows={4}
            maxLength={2000}
            defaultValue={caso?.intervention ?? ""}
            className="sm:col-span-2"
          />
          <Area
            rotulo="Peças substituídas"
            name="parts"
            rows={3}
            defaultValue={(caso?.parts ?? []).join("\n")}
            className="sm:col-span-2"
            ajuda="Uma por linha. Diga se é original ou equivalente."
          />
          <Area
            rotulo="Testes finais"
            name="finalTests"
            rows={3}
            maxLength={1500}
            defaultValue={caso?.finalTests ?? ""}
            className="sm:col-span-2"
            ajuda="O que foi testado antes de o equipamento voltar. É o que sustenta a garantia do serviço."
          />
          <Campo
            rotulo="Tempo do atendimento"
            name="durationLabel"
            defaultValue={caso?.durationLabel ?? ""}
            maxLength={80}
            placeholder="2 dias úteis"
            ajuda="Só o tempo real. Vazio não vira 'rapidamente' na página — a linha some."
          />
          <Area
            rotulo="Resultado"
            name="result"
            rows={2}
            maxLength={1500}
            defaultValue={caso?.result ?? ""}
          />
        </Bloco>

        <Bloco
          titulo="Quem responde"
          descricao="Técnico e revisor precisam ser pessoas diferentes. Sem os dois, o case não é publicado."
        >
          <Selecao
            rotulo="Executado por"
            name="technicianId"
            value={tecnico}
            onChange={(evento) => setTecnico(evento.target.value)}
          >
            <option value="">Ainda não definido</option>
            {equipe.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.name}
              </option>
            ))}
          </Selecao>

          <Selecao
            rotulo="Revisor técnico"
            name="reviewerId"
            value={revisor}
            onChange={(evento) => setRevisor(evento.target.value)}
            erro={mesmaPessoa ? "O revisor precisa ser diferente de quem executou." : undefined}
          >
            <option value="">Ainda não definido</option>
            {equipe.map((pessoa) => (
              <option key={pessoa.id} value={pessoa.id}>
                {pessoa.name}
              </option>
            ))}
          </Selecao>

          {/* O vínculo com a OS é interno. A tela diz isso, porque quem
              preenche precisa saber que não está publicando o número. */}
          <Selecao
            rotulo="Ordem de serviço de origem"
            name="workOrderId"
            defaultValue={caso?.workOrderId ?? ""}
            className="sm:col-span-2"
            ajuda="Uso interno: serve para a JB comprovar o que publicou. O número NUNCA aparece na página."
          >
            <option value="">Sem vínculo</option>
            {ordens.map((ordem) => (
              <option key={ordem.id} value={ordem.id}>
                {ordem.rotulo}
              </option>
            ))}
          </Selecao>

          <Area
            rotulo="O que falta para publicar"
            name="pendingNote"
            rows={2}
            maxLength={600}
            defaultValue={caso?.pendingNote ?? ""}
            className="sm:col-span-2"
            ajuda="Nota interna. Nunca aparece no site."
          />
        </Bloco>
      </fieldset>

      {!somenteLeitura ? (
        <BarraDeSalvar aviso="Salvar não publica, e não registra autorização do cliente.">
          <Botao type="submit" carregando={pendente}>
            <Save className="size-4" aria-hidden />
            {criando ? "Criar rascunho" : "Salvar"}
          </Botao>
        </BarraDeSalvar>
      ) : null}
    </form>
  );
}
