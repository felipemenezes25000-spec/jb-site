"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, Send, Trash2 } from "lucide-react";

import {
  OPCOES_TIPO_PEDIDO,
  PRAZOS,
  type TipoPedido,
} from "@/components/assistencia/rotulos";
import { Verificacao } from "@/components/assistencia/verificacao";
import { pedirOrcamento, type EstadoAssistencia } from "@/app/acoes/assistencia";
import { Aviso } from "@/components/ui/aviso";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CampoTelefone } from "@/components/ui/campos-br";
import { Cartao } from "@/components/ui/data";
import { Area, Campo, Marcador, Opcoes, Selecao } from "@/components/ui/form";

/**
 * Pedido de orçamento geral.
 *
 * A lista de itens é aberta: quem chega da página de um serviço já entra com a
 * primeira linha preenchida, quem chega direto começa em branco e acrescenta o
 * que quiser. Nenhum campo de preço — o valor é a equipe que monta, e o
 * servidor grava os itens com valor zero justamente para deixar isso claro no
 * painel.
 */

type Linha = { chave: string; descricao: string; quantidade: string };

function novaLinha(descricao = ""): Linha {
  return {
    chave: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    descricao,
    quantidade: "1",
  };
}

export function FormularioOrcamento({
  inicio,
  cliente,
  telefone,
  tipoInicial = "compra",
  itemInicial = "",
  className,
}: {
  inicio: number;
  cliente: { nome: string; email: string; telefone: string } | null;
  telefone: string;
  tipoInicial?: TipoPedido;
  /** Descrição já preenchida na primeira linha (vinda de /servicos/[slug]). */
  itemInicial?: string;
  className?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoAssistencia, FormData>(
    pedirOrcamento,
    {},
  );

  const [tipo, setTipo] = useState<TipoPedido>(tipoInicial);
  const [linhas, setLinhas] = useState<Linha[]>(() => [novaLinha(itemInicial)]);
  const [tel, setTel] = useState(cliente?.telefone ?? "");

  if (estado.ok) {
    return (
      <Cartao className={className}>
        <div className="p-8 text-center">
          <Aviso tom="sucesso" titulo="Pedido registrado">
            {estado.ok}
          </Aviso>
          <p className="mt-6 text-sm leading-relaxed text-graf-600">
            Enquanto isso, dá para conhecer o catálogo ou ver como funciona a assistência
            técnica da JB.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <LinkBotao href="/loja" variante="secundario">
              Ver equipamentos
            </LinkBotao>
            <LinkBotao href="/assistencia-tecnica" variante="secundario">
              Assistência técnica
            </LinkBotao>
          </div>
        </div>
      </Cartao>
    );
  }

  function atualizar(chave: string, mudanca: Partial<Linha>) {
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.chave === chave ? { ...linha, ...mudanca } : linha)),
    );
  }

  return (
    <form action={acao} className={className} noValidate>
      <fieldset>
        <legend className="text-lg font-bold text-graf-950">
          Do que você precisa?
        </legend>
        <Opcoes
          nome="tipo"
          valor={tipo}
          aoMudar={setTipo}
          opcoes={OPCOES_TIPO_PEDIDO}
          className="mt-4"
        />
      </fieldset>

      {tipo === "plano" ? (
        <Aviso tom="info" className="mt-5">
          <p>
            Planos de manutenção são montados equipamento a equipamento. Você pode seguir
            por aqui descrevendo a clínica, ou{" "}
            <Link
              href="/planos-de-manutencao"
              className="font-semibold text-jb-700 underline underline-offset-2"
            >
              comparar os planos publicados
            </Link>{" "}
            antes.
          </p>
        </Aviso>
      ) : null}

      {/* ------------------------------------------------------------ itens */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-graf-950">Itens desejados</h2>
        <p className="mt-1 text-sm leading-relaxed text-graf-600">
          Descreva com as suas palavras. Modelo exato ajuda, mas &ldquo;cadeira completa
          com refletor&rdquo; já é suficiente para a equipe orçar.
        </p>

        <ul className="mt-5 space-y-4">
          {linhas.map((linha, indice) => (
            <li key={linha.chave} className="grid gap-3 sm:grid-cols-[1fr_7rem_auto]">
              <Campo
                rotulo={`Item ${indice + 1}`}
                name="item_descricao"
                value={linha.descricao}
                onChange={(evento) => atualizar(linha.chave, { descricao: evento.target.value })}
                placeholder="Ex.: autoclave 21 litros"
                autoComplete="off"
                erro={
                  indice === 0 && estado.campo === "item_descricao" ? estado.erro : undefined
                }
              />
              <Campo
                rotulo="Qtd."
                name="item_quantidade"
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={linha.quantidade}
                onChange={(evento) =>
                  atualizar(linha.chave, {
                    quantidade: evento.target.value.replace(/\D/g, "").slice(0, 3),
                  })
                }
              />
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() =>
                    setLinhas((atuais) =>
                      atuais.length === 1
                        ? [novaLinha()]
                        : atuais.filter((item) => item.chave !== linha.chave),
                    )
                  }
                  aria-label={`Remover item ${indice + 1}`}
                  className="inline-flex size-11 items-center justify-center rounded-lg text-graf-500 transition-colors hover:bg-graf-100 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <Botao
          type="button"
          variante="secundario"
          tamanho="sm"
          onClick={() => setLinhas((atuais) => [...atuais, novaLinha()])}
          className="mt-4"
        >
          <Plus className="size-4" aria-hidden />
          Adicionar item
        </Botao>
      </div>

      {/* ----------------------------------------------------- prazo e nota */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Selecao rotulo="Quando você precisa" name="prazo" defaultValue="">
          <option value="">Sem prazo definido</option>
          {PRAZOS.map((prazo) => (
            <option key={prazo} value={prazo}>
              {prazo}
            </option>
          ))}
        </Selecao>

        <Area
          rotulo="Detalhes que ajudam no orçamento"
          name="mensagem"
          rows={4}
          maxLength={3000}
          placeholder="Voltagem, espaço disponível, se há equipamento a ser retirado…"
          className="sm:col-span-2"
        />
      </div>

      {/* --------------------------------------------------------- contato */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-graf-950">Como falamos com você</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Nome completo"
            name="nome"
            required
            defaultValue={cliente?.nome ?? ""}
            autoComplete="name"
            erro={estado.campo === "nome" ? estado.erro : undefined}
          />
          <Campo
            rotulo="Clínica ou empresa"
            name="empresa"
            autoComplete="organization"
            defaultValue=""
          />
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            required
            defaultValue={cliente?.email ?? ""}
            autoComplete="email"
            erro={estado.campo === "email" ? estado.erro : undefined}
          />
          <CampoTelefone
            name="telefone"
            required
            valor={tel}
            aoMudar={setTel}
            erro={estado.campo === "telefone" ? estado.erro : undefined}
          />
          <Campo
            rotulo="Cidade"
            name="cidade"
            autoComplete="address-level2"
            defaultValue=""
          />
          <Campo
            rotulo="UF"
            name="uf"
            maxLength={2}
            autoComplete="address-level1"
            defaultValue=""
            className="sm:max-w-24"
          />
        </div>

        <Marcador
          name="novidades"
          rotulo="Quero receber novidades e condições da JB por e-mail"
          className="mt-6"
        />
      </div>

      <Verificacao
        inicio={inicio}
        exigirCodigo={estado.exigirCodigo}
        erro={estado.campo === "codigo_da_imagem" ? estado.erro : undefined}
        telefone={telefone}
        className="mt-8"
      />

      <div aria-live="polite" className="mt-6 empty:mt-0">
        {estado.erro ? <Aviso tom="erro">{estado.erro}</Aviso> : null}
      </div>

      <div className="mt-8 border-t border-graf-200 pt-6">
        <Botao type="submit" tamanho="lg" carregando={pendente}>
          <Send className="size-4" aria-hidden />
          {pendente ? "Enviando pedido…" : "Pedir orçamento"}
        </Botao>
        <p className="mt-4 text-xs leading-relaxed text-graf-500">
          Ao enviar, você concorda que a JB use estes dados para responder ao pedido.
        </p>
      </div>
    </form>
  );
}
