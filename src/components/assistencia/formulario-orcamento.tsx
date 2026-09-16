"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CircleCheck, Plus, Send, Trash2 } from "lucide-react";

import { OPCOES_TIPO_PEDIDO, PRAZOS, type TipoPedido } from "@/components/assistencia/rotulos";
import { Verificacao } from "@/components/assistencia/verificacao";
import { pedirOrcamento, type EstadoAssistencia } from "@/app/acoes/assistencia";
import { Aviso } from "@/components/ui/aviso";
import { Botao, LinkBotao } from "@/components/ui/button";
import { CampoTelefone } from "@/components/ui/campos-br";
import { Area, Campo, Marcador, Opcoes, Selecao } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/**
 * Pedido de orçamento geral.
 *
 * A lista de itens é aberta: quem chega da página de um serviço já entra com a
 * primeira linha preenchida, quem chega direto começa em branco e acrescenta o
 * que quiser. Nenhum campo de preço — o valor é a equipe que monta, e o
 * servidor grava os itens com valor zero justamente para deixar isso claro no
 * painel.
 *
 * O formulário é longo, então ele é lido em três perguntas — o que você quer,
 * o que a clínica precisa e como falamos com você — em vez de virar uma pilha
 * de campos sem começo nem fim.
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

  /* O formulário já vive dentro do cartão da página: repetir a moldura aqui
     produzia cartão dentro de cartão, com borda e respiro em dobro. */
  if (estado.ok) {
    return (
      <div className={cn("mx-auto w-full max-w-2xl", className)} role="status">
        <span
          aria-hidden
          className="flex size-14 items-center justify-center rounded-full bg-ok-50 text-ok-700 ring-1 ring-inset ring-ok-500/20"
        >
          <CircleCheck className="size-7" />
        </span>
        <h2 className="mt-6 text-title texto-forte">Pedido registrado</h2>
        <p className="texto-guia mt-4 text-graf-600">{estado.ok}</p>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-graf-600">
          Enquanto a equipe monta a proposta, dá para conhecer o catálogo ou ver como
          funciona a assistência técnica da JB.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkBotao href="/loja" variante="secundario">
            Ver equipamentos
          </LinkBotao>
          <LinkBotao href="/assistencia-tecnica" variante="secundario">
            Assistência técnica
          </LinkBotao>
        </div>
      </div>
    );
  }

  function atualizar(chave: string, mudanca: Partial<Linha>) {
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.chave === chave ? { ...linha, ...mudanca } : linha)),
    );
  }

  return (
    <form action={acao} className={className} noValidate>
      <div className="mx-auto w-full max-w-2xl">
        {/* --------------------------------------------------- tipo de pedido */}
        <fieldset>
          {/* `legend` aceita um título dentro: o grupo de opções continua
              amarrado à pergunta, e a pergunta continua no sumário da página. */}
          <legend>
            <h2 className="text-title texto-forte">Do que você precisa?</h2>
          </legend>
          <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graf-500">
            Isso define para quem o pedido vai dentro da JB — vendas, técnica ou
            manutenção programada.
          </p>
          <Opcoes
            nome="tipo"
            valor={tipo}
            aoMudar={setTipo}
            opcoes={OPCOES_TIPO_PEDIDO}
            className="mt-6"
          />
        </fieldset>

        {tipo === "plano" ? (
          <Aviso tom="info" className="mt-6">
            <p>
              Planos de manutenção são montados equipamento a equipamento. Você pode
              seguir por aqui descrevendo a clínica, ou{" "}
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
        <Bloco
          titulo="O que a clínica precisa"
          descricao="Descreva com as suas palavras. Modelo exato ajuda, mas “cadeira completa com refletor” já é suficiente para a equipe orçar."
        >
          <ul className="space-y-4">
            {linhas.map((linha, indice) => (
              <li key={linha.chave} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto]">
                <Campo
                  rotulo={`Item ${indice + 1}`}
                  name="item_descricao"
                  value={linha.descricao}
                  onChange={(evento) =>
                    atualizar(linha.chave, { descricao: evento.target.value })
                  }
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

          <div>
            <Botao
              type="button"
              variante="secundario"
              tamanho="sm"
              onClick={() => setLinhas((atuais) => [...atuais, novaLinha()])}
            >
              <Plus className="size-4" aria-hidden />
              Adicionar item
            </Botao>
          </div>

          <div className="border-t border-graf-200 pt-7">
            <h3 className="text-[0.9375rem] font-bold text-graf-950">
              Prazo e detalhes do pedido
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-graf-500">
              Opcional, mas evita idas e vindas depois.
            </p>

            <div className="mt-5 grid gap-5">
              <Selecao
                rotulo="Quando você precisa"
                name="prazo"
                defaultValue=""
                className="sm:max-w-sm"
              >
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
              />
            </div>
          </div>
        </Bloco>

        {/* --------------------------------------------------------- contato */}
        <Bloco
          titulo="Como falamos com você"
          descricao="A proposta chega por e-mail, e a equipe liga se faltar algum detalhe."
        >
          <Campo
            rotulo="Nome completo"
            name="nome"
            required
            defaultValue={cliente?.nome ?? ""}
            autoComplete="name"
            erro={estado.campo === "nome" ? estado.erro : undefined}
          />

          <div className="grid gap-5 sm:grid-cols-2">
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
              ajuda="Com DDD, de preferência um celular."
              erro={estado.campo === "telefone" ? estado.erro : undefined}
            />
            <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3">
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
              />
            </div>
          </div>

          <Marcador
            name="novidades"
            rotulo="Quero receber novidades e condições da JB por e-mail"
          />
        </Bloco>

        <Verificacao
          inicio={inicio}
          exigirCodigo={estado.exigirCodigo}
          erro={estado.campo === "codigo_da_imagem" ? estado.erro : undefined}
          telefone={telefone}
          className="mt-9"
        />

        <div aria-live="polite" className="mt-7 empty:mt-0">
          {estado.erro ? <Aviso tom="erro">{estado.erro}</Aviso> : null}
        </div>

        <div className="mt-9 border-t border-graf-200 pt-7">
          <Botao
            type="submit"
            tamanho="lg"
            carregando={pendente}
            className="w-full sm:w-auto"
          >
            {pendente ? null : <Send className="size-4" aria-hidden />}
            {pendente ? "Enviando pedido…" : "Pedir orçamento"}
          </Botao>
          <p className="mt-5 text-[0.8125rem] leading-relaxed text-graf-500">
            Ao enviar, você concorda que a JB use estes dados para responder ao pedido.
          </p>
        </div>
      </div>
    </form>
  );
}

/**
 * Uma das perguntas do formulário: título, linha de apoio e os campos que
 * respondem a ela, separados da pergunta anterior por um fio.
 */
function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-graf-200 pt-9">
      <h2 className="text-title texto-forte">{titulo}</h2>
      {descricao ? (
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graf-500">{descricao}</p>
      ) : null}
      <div className="mt-6 grid gap-6">{children}</div>
    </section>
  );
}
