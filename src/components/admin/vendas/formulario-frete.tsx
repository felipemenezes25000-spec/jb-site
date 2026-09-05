"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MapPinned, Pencil, Plus, Trash2, Truck } from "lucide-react";

import {
  excluirPerfilFrete,
  excluirZonaFrete,
  salvarPerfilFrete,
  salvarZonaFrete,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import { Botao } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { Cartao, CabecalhoCartao, Etiqueta, Vazio } from "@/components/ui/data";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";
import { Painel } from "@/components/ui/painel";
import { formatarCep, formatarPreco, plural } from "@/lib/format";

/* ============================================================================
   Perfis de frete e faixas de CEP

   Um perfil é a regra que o produto usa para calcular a entrega; as faixas são
   os intervalos de CEP com preço e prazo dentro dela. Como o CEP é comparado
   como texto de oito dígitos, digitar "01" e "09" cobre de 01000-000 a
   09999-999 — o servidor completa o começo com zeros e o fim com noves.

   Só um perfil pode ser o padrão. Marcar outro desmarca o anterior na mesma
   transação, para a loja nunca ficar com dois padrões concorrendo.
   ============================================================================ */

const INICIAL: EstadoVendas = {};

export type ZonaVisivel = {
  id: string;
  nome: string;
  cepInicio: string;
  cepFim: string;
  valorCents: number;
  valor: string;
  prazo: string;
  ordem: string;
};

export type PerfilVisivel = {
  id: string;
  nome: string;
  tipo: string;
  tipoRotulo: string;
  descricao: string;
  gratisAcimaCents: number | null;
  gratisAcima: string;
  padrao: boolean;
  produtos: number;
  zonas: ZonaVisivel[];
};

export type OpcaoTipoFrete = { valor: string; rotulo: string };

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

function FormularioPerfil({
  perfil,
  tipos,
  aoTerminar,
}: {
  perfil: PerfilVisivel | null;
  tipos: OpcaoTipoFrete[];
  aoTerminar: () => void;
}) {
  const [estado, acao] = useActionState(salvarPerfilFrete, INICIAL);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="perfilId" value={perfil?.id ?? ""} />

      <Campo
        rotulo="Nome do perfil"
        name="nome"
        defaultValue={perfil?.nome ?? ""}
        required
        maxLength={80}
        ajuda="Aparece na ficha do produto, para a equipe."
        erro={estado.campo === "nome" ? estado.erro : undefined}
      />

      <Selecao rotulo="Modalidade" name="tipo" defaultValue={perfil?.tipo ?? "entrega_local"}>
        {tipos.map((tipo) => (
          <option key={tipo.valor} value={tipo.valor}>
            {tipo.rotulo}
          </option>
        ))}
      </Selecao>

      <Area
        rotulo="Descrição"
        name="descricao"
        rows={2}
        maxLength={400}
        defaultValue={perfil?.descricao ?? ""}
        ajuda="Texto curto explicando como funciona a entrega neste perfil."
      />

      <Campo
        rotulo="Frete grátis acima de"
        name="gratisAcima"
        inputMode="decimal"
        prefixo="R$"
        defaultValue={perfil?.gratisAcima ?? ""}
        ajuda="Vazio desliga a gratuidade por valor."
      />

      <Marcador
        name="padrao"
        rotulo="Usar como perfil padrão"
        ajuda="Produtos sem perfil próprio passam a seguir este."
        defaultChecked={perfil?.padrao ?? false}
      />

      <Retorno estado={estado} />

      <div className="flex flex-wrap gap-3">
        <Enviar>{perfil ? "Salvar perfil" : "Criar perfil"}</Enviar>
        <Botao type="button" variante="secundario" onClick={aoTerminar}>
          Fechar
        </Botao>
      </div>
    </form>
  );
}

function FormularioZona({
  perfilId,
  zona,
  aoTerminar,
}: {
  perfilId: string;
  zona: ZonaVisivel | null;
  aoTerminar: () => void;
}) {
  const [estado, acao] = useActionState(salvarZonaFrete, INICIAL);
  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="zonaId" value={zona?.id ?? ""} />
      <input type="hidden" name="perfilId" value={perfilId} />

      <Campo
        rotulo="Nome da faixa"
        name="nome"
        defaultValue={zona?.nome ?? ""}
        required
        maxLength={80}
        placeholder="Ex.: Grande São Paulo"
        erro={erroDe("nome")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="CEP inicial"
          name="cepInicio"
          inputMode="numeric"
          defaultValue={zona?.cepInicio ?? ""}
          required
          placeholder="01000-000"
          ajuda="Pode digitar só o começo: 01 vira 01000000."
          erro={erroDe("cepInicio")}
        />
        <Campo
          rotulo="CEP final"
          name="cepFim"
          inputMode="numeric"
          defaultValue={zona?.cepFim ?? ""}
          required
          placeholder="09999-999"
          ajuda="Pode digitar só o começo: 09 vira 09999999."
          erro={erroDe("cepFim")}
        />
        <Campo
          rotulo="Valor do frete"
          name="valor"
          inputMode="decimal"
          prefixo="R$"
          defaultValue={zona?.valor ?? ""}
          ajuda="Vazio ou zero significa entrega sem custo nesta faixa."
        />
        <Campo
          rotulo="Prazo em dias úteis"
          name="prazo"
          inputMode="numeric"
          defaultValue={zona?.prazo ?? ""}
        />
        <Campo
          rotulo="Ordem de exibição"
          name="ordem"
          inputMode="numeric"
          defaultValue={zona?.ordem ?? "0"}
          ajuda="Menor aparece primeiro."
        />
      </div>

      <Retorno estado={estado} />

      <div className="flex flex-wrap gap-3">
        <Enviar>{zona ? "Salvar faixa" : "Criar faixa"}</Enviar>
        <Botao type="button" variante="secundario" onClick={aoTerminar}>
          Fechar
        </Botao>
      </div>
    </form>
  );
}

export function GestorFrete({
  perfis,
  tipos,
  podeEditar,
}: {
  perfis: PerfilVisivel[];
  tipos: OpcaoTipoFrete[];
  podeEditar: boolean;
}) {
  const [perfilAberto, setPerfilAberto] = useState(false);
  const [perfilEditando, setPerfilEditando] = useState<PerfilVisivel | null>(null);

  const [zonaAberta, setZonaAberta] = useState(false);
  const [zonaEditando, setZonaEditando] = useState<{
    perfilId: string;
    zona: ZonaVisivel | null;
  } | null>(null);

  const [estadoPerfil, excluirPerfil] = useActionState(excluirPerfilFrete, INICIAL);
  const [estadoZona, excluirZona] = useActionState(excluirZonaFrete, INICIAL);

  return (
    <>
      <div className="space-y-3">
        {podeEditar ? (
          <div className="flex justify-end">
            <Botao
              type="button"
              tamanho="sm"
              onClick={() => {
                setPerfilEditando(null);
                setPerfilAberto(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              Novo perfil de frete
            </Botao>
          </div>
        ) : null}

        <p aria-live="polite" className="min-h-5 text-sm">
          {estadoPerfil.erro || estadoZona.erro ? (
            <span className="font-medium text-jb-700">
              {estadoPerfil.erro ?? estadoZona.erro}
            </span>
          ) : null}
          {estadoPerfil.ok || estadoZona.ok ? (
            <span className="font-medium text-ok-700">{estadoPerfil.ok ?? estadoZona.ok}</span>
          ) : null}
        </p>

        {perfis.length === 0 ? (
          <Vazio
            icone={Truck}
            titulo="Nenhum perfil de frete"
            descricao="Crie um perfil para dizer como cada produto é entregue: retirada, entrega local, transportadora ou sob orçamento."
            acao={
              podeEditar ? (
                <Botao
                  type="button"
                  onClick={() => {
                    setPerfilEditando(null);
                    setPerfilAberto(true);
                  }}
                >
                  Criar o primeiro perfil
                </Botao>
              ) : undefined
            }
          />
        ) : (
          perfis.map((perfil) => (
            <Cartao key={perfil.id}>
              <CabecalhoCartao
                titulo={
                  <span className="flex flex-wrap items-center gap-2">
                    {perfil.nome}
                    {perfil.padrao ? <Etiqueta tom="marca">Padrão</Etiqueta> : null}
                    <Etiqueta tom="neutro">{perfil.tipoRotulo}</Etiqueta>
                  </span>
                }
                descricao={
                  <>
                    {perfil.descricao ? `${perfil.descricao} · ` : ""}
                    {plural(perfil.produtos, "produto usa", "produtos usam")} este perfil
                    {perfil.gratisAcimaCents
                      ? ` · grátis acima de ${formatarPreco(perfil.gratisAcimaCents)}`
                      : ""}
                  </>
                }
                acao={
                  podeEditar ? (
                    <div className="flex flex-wrap gap-2">
                      <Botao
                        type="button"
                        variante="secundario"
                        tamanho="sm"
                        onClick={() => {
                          setPerfilEditando(perfil);
                          setPerfilAberto(true);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                        Editar
                      </Botao>
                      <Botao
                        type="button"
                        variante="secundario"
                        tamanho="sm"
                        onClick={() => {
                          setZonaEditando({ perfilId: perfil.id, zona: null });
                          setZonaAberta(true);
                        }}
                      >
                        <Plus className="size-4" aria-hidden />
                        Faixa de CEP
                      </Botao>
                      {perfil.produtos === 0 ? (
                        <form action={excluirPerfil}>
                          <input type="hidden" name="perfilId" value={perfil.id} />
                          <BotaoConfirmar
                            rotulo="Excluir"
                            pergunta={`Excluir o perfil "${perfil.nome}"?`}
                            detalhe="As faixas de CEP dele também são apagadas. Nenhum produto usa este perfil hoje."
                            rotuloConfirmar="Excluir perfil"
                            tamanho="sm"
                            icone={<Trash2 className="size-4" aria-hidden />}
                          />
                        </form>
                      ) : null}
                    </div>
                  ) : null
                }
              />

              <div className="p-5">
                {perfil.zonas.length === 0 ? (
                  <Vazio
                    icone={MapPinned}
                    titulo="Sem faixa de CEP"
                    descricao="Sem faixa cadastrada, o cálculo não encontra preço e a entrega cai para combinação manual."
                    acao={
                      podeEditar ? (
                        <Botao
                          type="button"
                          variante="secundario"
                          onClick={() => {
                            setZonaEditando({ perfilId: perfil.id, zona: null });
                            setZonaAberta(true);
                          }}
                        >
                          Adicionar faixa
                        </Botao>
                      ) : undefined
                    }
                  />
                ) : (
                  <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
                    {perfil.zonas.map((zona) => (
                      <li
                        key={zona.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-graf-900">{zona.nome}</p>
                          <p className="tabular text-xs text-graf-500">
                            {formatarCep(zona.cepInicio)} até {formatarCep(zona.cepFim)}
                            {zona.prazo ? ` · ${zona.prazo} dia(s) útil(eis)` : ""}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="tabular font-semibold text-graf-900">
                            {zona.valorCents > 0 ? formatarPreco(zona.valorCents) : "Sem custo"}
                          </span>

                          {podeEditar ? (
                            <>
                              <Botao
                                type="button"
                                variante="sutil"
                                tamanho="sm"
                                onClick={() => {
                                  setZonaEditando({ perfilId: perfil.id, zona });
                                  setZonaAberta(true);
                                }}
                              >
                                Editar
                              </Botao>
                              <form action={excluirZona}>
                                <input type="hidden" name="zonaId" value={zona.id} />
                                <BotaoConfirmar
                                  rotulo="Excluir"
                                  pergunta={`Excluir a faixa "${zona.nome}"?`}
                                  detalhe="Pedidos antigos não mudam: eles guardam o valor do frete cobrado na época."
                                  rotuloConfirmar="Excluir faixa"
                                  tamanho="sm"
                                />
                              </form>
                            </>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Cartao>
          ))
        )}
      </div>

      <Painel
        aberto={perfilAberto}
        aoFechar={() => setPerfilAberto(false)}
        titulo={perfilEditando ? `Editar ${perfilEditando.nome}` : "Novo perfil de frete"}
        tamanho="lg"
      >
        <FormularioPerfil
          key={perfilEditando?.id ?? "novo-perfil"}
          perfil={perfilEditando}
          tipos={tipos}
          aoTerminar={() => setPerfilAberto(false)}
        />
      </Painel>

      <Painel
        aberto={zonaAberta}
        aoFechar={() => setZonaAberta(false)}
        titulo={zonaEditando?.zona ? `Editar ${zonaEditando.zona.nome}` : "Nova faixa de CEP"}
        descricao="Intervalo de CEP com preço e prazo fixos."
        tamanho="lg"
      >
        {zonaEditando ? (
          <FormularioZona
            key={zonaEditando.zona?.id ?? `nova-${zonaEditando.perfilId}`}
            perfilId={zonaEditando.perfilId}
            zona={zonaEditando.zona}
            aoTerminar={() => setZonaAberta(false)}
          />
        ) : null}
      </Painel>
    </>
  );
}
