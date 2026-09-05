"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { abrirChamadoDoCliente, type EstadoMinhaJb } from "@/app/acoes/minha-jb";
import { Anexos } from "@/components/conta/mj-anexos";
import { Botao, LinkBotao } from "@/components/ui/button";
import { Area, Campo, Opcoes, Selecao } from "@/components/ui/form";

/**
 * Abertura de chamado por quem já tem conta.
 *
 * Quem está autenticado não digita nome, e-mail nem telefone de novo: o
 * contato sai do cadastro. O que resta é o que só o cliente sabe — qual
 * equipamento, o que está acontecendo, com que urgência e quando dá para
 * receber o técnico.
 *
 * A urgência é a única escolha com peso: "equipamento parado" muda a ordem da
 * fila da equipe, então o texto de cada opção diz exatamente o que ela
 * significa em vez de deixar a pessoa adivinhar.
 */

type Urgencia = "baixa" | "normal" | "alta" | "parado";

const URGENCIAS: { valor: Urgencia; rotulo: string; descricao: string }[] = [
  { valor: "baixa", rotulo: "Baixa", descricao: "Dá para esperar" },
  { valor: "normal", rotulo: "Normal", descricao: "Atrapalha, mas funciona" },
  { valor: "alta", rotulo: "Alta", descricao: "Compromete o atendimento" },
  { valor: "parado", rotulo: "Parado", descricao: "Não dá para usar" },
];

export type EquipamentoDaLista = {
  id: string;
  nome: string;
  detalhe: string;
};

export type EnderecoDaLista = {
  id: string;
  rotulo: string;
  resumo: string;
  padrao: boolean;
};

export function FormularioChamado({
  equipamentos,
  enderecos,
  equipamentoInicial = "",
}: {
  equipamentos: EquipamentoDaLista[];
  enderecos: EnderecoDaLista[];
  equipamentoInicial?: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoMinhaJb, FormData>(
    abrirChamadoDoCliente,
    {},
  );
  const [urgencia, setUrgencia] = useState<Urgencia>("normal");

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  const padrao = enderecos.find((endereco) => endereco.padrao);

  return (
    <form action={acao} noValidate className="space-y-6">
      <p aria-live="polite" className="sr-only">
        {estado.campo ? estado.erro : ""}
      </p>

      {erroGeral ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-jb-200 bg-jb-50 px-4 py-3 text-sm leading-relaxed text-jb-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroGeral}</span>
        </p>
      ) : null}

      <fieldset className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
        <legend className="px-1 text-sm font-bold text-graf-950">O equipamento</legend>

        {equipamentos.length > 0 ? (
          <Selecao
            rotulo="Qual equipamento?"
            name="equipamentoId"
            defaultValue={equipamentoInicial}
            ajuda="Escolhendo um equipamento cadastrado, o técnico já chega sabendo marca, modelo e histórico."
            erro={erroDe("equipamentoId")}
            className="mt-3"
          >
            <option value="">Outro equipamento (descrevo abaixo)</option>
            {equipamentos.map((equipamento) => (
              <option key={equipamento.id} value={equipamento.id}>
                {equipamento.nome}
                {equipamento.detalhe ? ` — ${equipamento.detalhe}` : ""}
              </option>
            ))}
          </Selecao>
        ) : (
          <p className="mt-3 rounded-lg bg-graf-50 px-4 py-3 text-sm leading-relaxed text-graf-600">
            Você ainda não tem equipamentos cadastrados — descreva o equipamento na
            mensagem abaixo. Se quiser,{" "}
            <Link
              href="/minha-jb/equipamentos/novo"
              className="font-semibold text-jb-700 underline underline-offset-4"
            >
              cadastre agora
            </Link>{" "}
            e ganhe o histórico dele para os próximos chamados.
          </p>
        )}

        <Campo
          rotulo="Resumo do problema"
          name="tipo"
          maxLength={80}
          placeholder="Ex.: não liga, vazando água, erro no painel"
          ajuda="Uma linha. Ajuda a triagem a separar os chamados."
          erro={erroDe("tipo")}
          className="mt-5"
        />

        <Area
          rotulo="O que está acontecendo"
          name="descricao"
          required
          rows={5}
          maxLength={4000}
          placeholder="Conte desde quando acontece, se faz barulho, se apareceu alguma mensagem e o que já foi tentado."
          ajuda="Quanto mais detalhe, maior a chance de o técnico levar a peça certa na primeira visita."
          erro={erroDe("descricao")}
          className="mt-5"
        />

        <Opcoes<Urgencia>
          nome="urgencia"
          rotulo="Urgência"
          valor={urgencia}
          aoMudar={setUrgencia}
          opcoes={URGENCIAS}
          className="mt-5"
        />
      </fieldset>

      <fieldset className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
        <legend className="px-1 text-sm font-bold text-graf-950">
          Onde e quando atender
        </legend>

        {enderecos.length > 0 ? (
          <Selecao
            rotulo="Endereço do atendimento"
            name="enderecoId"
            defaultValue={padrao?.id ?? ""}
            erro={erroDe("enderecoId")}
            className="mt-3"
          >
            {enderecos.map((endereco) => (
              <option key={endereco.id} value={endereco.id}>
                {endereco.rotulo} — {endereco.resumo}
              </option>
            ))}
          </Selecao>
        ) : (
          <p className="mt-3 rounded-lg bg-graf-50 px-4 py-3 text-sm leading-relaxed text-graf-600">
            Você ainda não tem endereço cadastrado. Pode abrir o chamado assim mesmo — a
            equipe confirma o endereço por telefone — ou{" "}
            <Link
              href="/minha-jb/enderecos"
              className="font-semibold text-jb-700 underline underline-offset-4"
            >
              cadastrar um endereço
            </Link>{" "}
            antes.
          </p>
        )}

        <Campo
          rotulo="Melhor horário para a visita"
          name="disponibilidade"
          maxLength={200}
          placeholder="Ex.: terças e quintas pela manhã, até as 11h"
          ajuda="A equipe confirma a data com você antes de sair."
          erro={erroDe("disponibilidade")}
          className="mt-5"
        />
      </fieldset>

      <fieldset className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
        <legend className="px-1 text-sm font-bold text-graf-950">Fotos e vídeos</legend>
        <p className="mt-1 text-sm leading-relaxed text-graf-500">
          Foto do erro no painel, da peça quebrada ou do vazamento adianta muito o
          diagnóstico.
        </p>
        <Anexos
          nome="midias"
          rotulo="Anexos do chamado"
          pasta="chamados"
          maximo={6}
          className="mt-4"
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" tamanho="lg" carregando={enviando}>
          {enviando ? "Abrindo chamado…" : "Abrir chamado"}
        </Botao>
        <LinkBotao href="/minha-jb/assistencia" variante="texto" tamanho="lg">
          Cancelar
        </LinkBotao>
      </div>
    </form>
  );
}
