"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";

import {
  alternarCupom,
  excluirCupom,
  salvarCupom,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import { Botao } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { Cartao, CabecalhoCartao, Etiqueta, Vazio } from "@/components/ui/data";
import { Campo, Marcador, Selecao } from "@/components/ui/form";
import { Painel } from "@/components/ui/painel";
import { formatarData, formatarPreco } from "@/lib/format";

/* ============================================================================
   Cupons de desconto

   Um cupom já usado nunca é apagado: ele é desativado. Apagar quebraria o
   histórico dos pedidos que o aplicaram, e o desconto ficaria sem explicação na
   ficha da venda.

   O contador de uso é só leitura na tela — quem incrementa é o checkout, dentro
   da mesma transação que cria o pedido. Editar esse número à mão daria um limite
   de uso que não corresponde à realidade.
   ============================================================================ */

const INICIAL: EstadoVendas = {};

export type CupomVisivel = {
  id: string;
  codigo: string;
  tipo: "percentual" | "valor_fixo";
  valor: number;
  valorFormatado: string;
  minimo: number;
  maxUsos: number | null;
  maxPorCliente: number | null;
  usados: number;
  inicio: string;
  fim: string;
  ativo: boolean;
  categoriaId: string;
  produtoId: string;
  escopo: string;
  vencido: boolean;
};

export type OpcaoEscopo = { id: string; rotulo: string };

/**
 * "AAAA-MM-DD" vindo do banco vira Date ancorada ao meio-dia.
 *
 * `new Date("2026-01-05")` é meia-noite UTC, que em São Paulo ainda é dia 4 —
 * o meio-dia dá 12 horas de folga e a data exibida bate com a digitada.
 */
function dataDoCampo(valor: string) {
  return valor ? new Date(`${valor}T12:00:00`) : null;
}

function Retorno({ estado }: { estado: EstadoVendas }) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm leading-snug">
      {estado.erro ? <span className="font-medium text-jb-700">{estado.erro}</span> : null}
      {estado.ok ? <span className="font-medium text-ok-700">{estado.ok}</span> : null}
    </p>
  );
}

function Enviar({
  children,
  variante = "primario",
  tamanho,
}: {
  children: React.ReactNode;
  variante?: "primario" | "secundario" | "sutil";
  tamanho?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante={variante} tamanho={tamanho} carregando={pending}>
      {children}
    </Botao>
  );
}

/** Formulário do cupom, dentro do painel. */
function FormularioCupom({
  cupom,
  categorias,
  produtos,
  aoTerminar,
}: {
  cupom: CupomVisivel | null;
  categorias: OpcaoEscopo[];
  produtos: OpcaoEscopo[];
  aoTerminar: () => void;
}) {
  const [estado, acao] = useActionState(salvarCupom, INICIAL);
  const [tipo, setTipo] = useState<"percentual" | "valor_fixo">(cupom?.tipo ?? "percentual");

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);

  return (
    <form action={acao} className="space-y-4" id="formulario-cupom">
      <input type="hidden" name="cupomId" value={cupom?.id ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Código"
          name="codigo"
          defaultValue={cupom?.codigo ?? ""}
          required
          maxLength={30}
          autoComplete="off"
          ajuda="Letras, números e hífen. É gravado em maiúsculas."
          erro={erroDe("codigo")}
        />

        <Selecao
          rotulo="Tipo de desconto"
          name="tipo"
          value={tipo}
          onChange={(evento) => setTipo(evento.target.value as "percentual" | "valor_fixo")}
        >
          <option value="percentual">Percentual sobre o subtotal</option>
          <option value="valor_fixo">Valor fixo em reais</option>
        </Selecao>

        <Campo
          rotulo={tipo === "percentual" ? "Percentual (1 a 90)" : "Valor do desconto"}
          name="valor"
          inputMode="decimal"
          prefixo={tipo === "percentual" ? undefined : "R$"}
          defaultValue={
            cupom
              ? tipo === "percentual"
                ? String(cupom.valor)
                : (cupom.valor / 100).toFixed(2).replace(".", ",")
              : ""
          }
          required
          erro={erroDe("valor")}
        />

        <Campo
          rotulo="Compra mínima"
          name="minimo"
          inputMode="decimal"
          prefixo="R$"
          defaultValue={
            cupom && cupom.minimo > 0 ? (cupom.minimo / 100).toFixed(2).replace(".", ",") : ""
          }
          ajuda="Vazio libera para qualquer valor."
        />

        <Campo
          rotulo="Limite total de usos"
          name="maxUsos"
          inputMode="numeric"
          defaultValue={cupom?.maxUsos != null ? String(cupom.maxUsos) : ""}
          ajuda="Vazio significa sem limite."
        />
        <Campo
          rotulo="Limite por cliente"
          name="maxPorCliente"
          inputMode="numeric"
          defaultValue={cupom?.maxPorCliente != null ? String(cupom.maxPorCliente) : ""}
        />

        <Campo
          rotulo="Começa em"
          name="inicio"
          type="date"
          defaultValue={cupom?.inicio ?? ""}
          erro={erroDe("inicio")}
        />
        <Campo
          rotulo="Termina em"
          name="fim"
          type="date"
          defaultValue={cupom?.fim ?? ""}
          erro={erroDe("fim")}
        />

        <Selecao
          rotulo="Restringir à categoria"
          name="categoriaId"
          defaultValue={cupom?.categoriaId ?? ""}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.rotulo}
            </option>
          ))}
        </Selecao>

        <Selecao
          rotulo="Restringir ao produto"
          name="produtoId"
          defaultValue={cupom?.produtoId ?? ""}
        >
          <option value="">Todos os produtos</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.rotulo}
            </option>
          ))}
        </Selecao>
      </div>

      <Marcador
        name="ativo"
        rotulo="Cupom ativo"
        ajuda="Desmarcado, o código deixa de valer no carrinho na hora."
        defaultChecked={cupom?.ativo ?? true}
      />

      <Retorno estado={estado} />

      <div className="flex flex-wrap gap-3">
        <Enviar>{cupom ? "Salvar cupom" : "Criar cupom"}</Enviar>
        <Botao type="button" variante="secundario" onClick={aoTerminar}>
          Fechar
        </Botao>
      </div>
    </form>
  );
}

export function GestorCupons({
  cupons,
  categorias,
  produtos,
  podeEditar,
  podeExcluir,
}: {
  cupons: CupomVisivel[];
  categorias: OpcaoEscopo[];
  produtos: OpcaoEscopo[];
  podeEditar: boolean;
  podeExcluir: boolean;
}) {
  const [editando, setEditando] = useState<CupomVisivel | null>(null);
  const [aberto, setAberto] = useState(false);
  const [estadoAlternar, alternar] = useActionState(alternarCupom, INICIAL);
  const [estadoExcluir, excluir] = useActionState(excluirCupom, INICIAL);

  function abrir(cupom: CupomVisivel | null) {
    setEditando(cupom);
    setAberto(true);
  }

  return (
    <>
      <Cartao>
        <CabecalhoCartao
          titulo="Cupons"
          descricao="Descontos aplicados no carrinho pelo código digitado."
          acao={
            podeEditar ? (
              <Botao type="button" tamanho="sm" onClick={() => abrir(null)}>
                <Plus className="size-4" aria-hidden />
                Novo cupom
              </Botao>
            ) : null
          }
        />

        <div className="p-5">
          <p aria-live="polite" className="min-h-5 pb-2 text-sm">
            {estadoAlternar.erro || estadoExcluir.erro ? (
              <span className="font-medium text-jb-700">
                {estadoAlternar.erro ?? estadoExcluir.erro}
              </span>
            ) : null}
            {estadoAlternar.ok || estadoExcluir.ok ? (
              <span className="font-medium text-ok-700">
                {estadoAlternar.ok ?? estadoExcluir.ok}
              </span>
            ) : null}
          </p>

          {cupons.length === 0 ? (
            <Vazio
              icone={TicketPercent}
              titulo="Nenhum cupom cadastrado"
              descricao="Crie um código de desconto para campanhas, feiras e negociações pontuais."
              acao={
                podeEditar ? (
                  <Botao type="button" onClick={() => abrir(null)}>
                    Criar o primeiro cupom
                  </Botao>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {cupons.map((cupom) => (
                <li
                  key={cupom.id}
                  className="rounded-xl border border-graf-200 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular text-base font-bold text-graf-950">
                        {cupom.codigo}
                      </span>
                      <Etiqueta tom={cupom.ativo && !cupom.vencido ? "ok" : "neutro"}>
                        {cupom.vencido ? "Prazo vencido" : cupom.ativo ? "Ativo" : "Desativado"}
                      </Etiqueta>
                      <Etiqueta tom="marca">{cupom.valorFormatado}</Etiqueta>
                    </div>

                    <p className="mt-1 text-sm text-graf-600">
                      {[
                        cupom.minimo > 0
                          ? `Compra mínima ${formatarPreco(cupom.minimo)}`
                          : "Sem compra mínima",
                        cupom.escopo,
                        cupom.inicio ? `de ${formatarData(dataDoCampo(cupom.inicio))}` : "",
                        cupom.fim ? `até ${formatarData(dataDoCampo(cupom.fim))}` : "sem prazo",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>

                    <p className="mt-0.5 text-apoio text-graf-500">
                      <span className="tabular font-semibold text-graf-700">
                        {cupom.usados}
                      </span>{" "}
                      uso(s)
                      {cupom.maxUsos != null ? ` de ${cupom.maxUsos} permitidos` : " registrados"}
                      {cupom.maxPorCliente != null
                        ? ` · máximo ${cupom.maxPorCliente} por cliente`
                        : ""}
                    </p>
                  </div>

                  {podeEditar ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0">
                      <Botao
                        type="button"
                        variante="secundario"
                        tamanho="sm"
                        onClick={() => abrir(cupom)}
                      >
                        <Pencil className="size-4" aria-hidden />
                        Editar
                      </Botao>

                      <form action={alternar}>
                        <input type="hidden" name="cupomId" value={cupom.id} />
                        <Enviar variante="sutil" tamanho="sm">
                          {cupom.ativo ? "Desativar" : "Reativar"}
                        </Enviar>
                      </form>

                      {podeExcluir && cupom.usados === 0 ? (
                        <form action={excluir}>
                          <input type="hidden" name="cupomId" value={cupom.id} />
                          <BotaoConfirmar
                            rotulo="Excluir"
                            pergunta={`Excluir o cupom ${cupom.codigo}?`}
                            detalhe="Nenhum pedido usou este código, então nada do histórico se perde."
                            rotuloConfirmar="Excluir cupom"
                            tamanho="sm"
                            icone={<Trash2 className="size-4" aria-hidden />}
                          />
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Cartao>

      <Painel
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={editando ? `Editar cupom ${editando.codigo}` : "Novo cupom"}
        descricao="O desconto é conferido de novo na hora de fechar o pedido."
        tamanho="lg"
      >
        <FormularioCupom
          key={editando?.id ?? "novo"}
          cupom={editando}
          categorias={categorias}
          produtos={produtos}
          aoTerminar={() => setAberto(false)}
        />
      </Painel>
    </>
  );
}
