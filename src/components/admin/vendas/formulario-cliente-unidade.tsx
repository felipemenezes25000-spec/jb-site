"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  excluirUnidade,
  salvarUnidade,
  type EstadoCliente,
} from "@/app/acoes/admin-clientes";
import { Botao } from "@/components/ui/button";
import { CampoCep } from "@/components/ui/campos-br";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { CabecalhoCartao, Cartao } from "@/components/ui/data";
import { Area, Campo, Selecao } from "@/components/ui/form";
import { Painel } from "@/components/ui/painel";

/* ============================================================================
   Unidades (clínicas) do cliente

   Um cliente pode ter mais de um consultório, e o equipamento vive numa
   unidade e numa sala — é o que faz o técnico chegar no lugar certo em vez de
   no endereço de cobrança.

   O endereço da unidade não é texto solto: é um `CustomerAddress` do próprio
   cliente. Ou se reaproveita um que já existe (o de entrega, por exemplo), ou
   se cadastra um novo aqui, que passa a valer para pedido e visita ao mesmo
   tempo. Corrigir a rua num lugar conserta os dois.
   ============================================================================ */

const INICIAL: EstadoCliente = {};

export type EnderecoDoCliente = {
  id: string;
  rotulo: string;
  resumo: string;
};

export type UnidadeEditavel = {
  id: string;
  nome: string;
  enderecoId: string | null;
  notas: string;
};

const CAMPOS_DE_ENDERECO = [
  "cep",
  "logradouro",
  "numero",
  "bairro",
  "cidade",
  "uf",
  "enderecoId",
];

/* ------------------------------------------------------------- formulário */

function FormularioUnidade({
  clienteId,
  enderecos,
  unidade,
  aoConcluir,
  rotuloEnviar,
  acoesExtras,
}: {
  clienteId: string;
  enderecos: EnderecoDoCliente[];
  unidade?: UnidadeEditavel;
  aoConcluir?: () => void;
  rotuloEnviar: string;
  acoesExtras?: React.ReactNode;
}) {
  const [estado, acao, pendente] = useActionState(salvarUnidade, INICIAL);
  const [escolha, setEscolha] = useState(unidade?.enderecoId ?? "");
  const referencia = useRef<HTMLFormElement>(null);
  const ultimo = useRef<EstadoCliente>(INICIAL);

  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  const idErro = useId();
  const idNumero = useId();

  const refConcluir = useRef(aoConcluir);
  useEffect(() => {
    refConcluir.current = aoConcluir;
  });

  useEffect(() => {
    if (estado === ultimo.current) return;
    ultimo.current = estado;
    if (!estado.ok) return;
    if (estado.mensagem) toast.success(estado.mensagem);
    if (!unidade) referencia.current?.reset();
    refConcluir.current?.();
  }, [estado, unidade]);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral =
    estado.erro && !["nome", ...CAMPOS_DE_ENDERECO].includes(estado.campo ?? "")
      ? estado.erro
      : undefined;

  const cadastrandoEndereco = escolha === "nova";

  return (
    <form
      ref={referencia}
      action={acao}
      className="space-y-4"
      aria-busy={pendente || undefined}
      aria-describedby={erroGeral ? idErro : undefined}
    >
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="unidadeId" value={unidade?.id ?? ""} />

      <Campo
        rotulo="Nome da unidade"
        name="nome"
        required
        maxLength={120}
        defaultValue={unidade?.nome}
        placeholder="Clínica Centro, Consultório 2, Matriz"
        ajuda="É como a equipe chama o lugar na agenda e no prontuário."
        erro={erroDe("nome")}
      />

      <Selecao
        rotulo="Endereço"
        name="enderecoId"
        value={escolha}
        onChange={(evento) => setEscolha(evento.target.value)}
        erro={erroDe("enderecoId")}
        ajuda="Reaproveite um endereço já cadastrado ou informe um novo."
      >
        <option value="">Sem endereço por enquanto</option>
        {enderecos.map((endereco) => (
          <option key={endereco.id} value={endereco.id}>
            {endereco.rotulo} — {endereco.resumo}
          </option>
        ))}
        <option value="nova">Cadastrar um endereço novo…</option>
      </Selecao>

      {cadastrandoEndereco ? (
        <fieldset className="grid gap-4 rounded-lg border border-graf-200 p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold text-graf-800">
            Endereço da unidade
          </legend>

          <CampoCep
            name="cep"
            erro={erroDe("cep")}
            aoEncontrar={(endereco) => {
              setLogradouro(endereco.logradouro);
              setBairro(endereco.bairro);
              setCidade(endereco.cidade);
              setUf(endereco.uf);
              document.getElementById(idNumero)?.focus();
            }}
          />

          <Campo
            id={idNumero}
            rotulo="Número"
            name="numero"
            maxLength={20}
            placeholder="s/n quando não houver"
            erro={erroDe("numero")}
          />

          <Campo
            rotulo="Logradouro"
            name="logradouro"
            maxLength={160}
            value={logradouro}
            onChange={(evento) => setLogradouro(evento.target.value)}
            erro={erroDe("logradouro")}
            className="sm:col-span-2"
          />

          <Campo
            rotulo="Complemento"
            name="complemento"
            maxLength={80}
            placeholder="Sala, andar, bloco"
          />

          <Campo
            rotulo="Bairro"
            name="bairro"
            maxLength={120}
            value={bairro}
            onChange={(evento) => setBairro(evento.target.value)}
            erro={erroDe("bairro")}
          />

          <Campo
            rotulo="Cidade"
            name="cidade"
            maxLength={120}
            value={cidade}
            onChange={(evento) => setCidade(evento.target.value)}
            erro={erroDe("cidade")}
          />

          <Campo
            rotulo="UF"
            name="uf"
            maxLength={2}
            value={uf}
            onChange={(evento) => setUf(evento.target.value.toUpperCase())}
            placeholder="SP"
            erro={erroDe("uf")}
          />

          <Campo
            rotulo="Ponto de referência"
            name="referencia"
            maxLength={160}
            className="sm:col-span-2"
          />
        </fieldset>
      ) : null}

      <Area
        rotulo="Observações da unidade"
        name="notas"
        rows={2}
        maxLength={2000}
        defaultValue={unidade?.notas}
        placeholder="Ex.: entrada pelos fundos; recepção só atende até as 17h."
      />

      <p
        id={idErro}
        role="alert"
        aria-live="assertive"
        className={erroGeral ? "text-sm font-medium text-jb-700" : "sr-only"}
      >
        {erroGeral ?? ""}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" carregando={pendente}>
          {rotuloEnviar}
        </Botao>
        {acoesExtras}
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ telas */

export function NovaUnidade({
  clienteId,
  enderecos,
}: {
  clienteId: string;
  enderecos: EnderecoDoCliente[];
}) {
  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Cadastrar unidade"
        descricao="Cada consultório do cliente vira uma unidade — é onde o equipamento mora."
      />
      <div className="p-5">
        <FormularioUnidade
          clienteId={clienteId}
          enderecos={enderecos}
          rotuloEnviar="Cadastrar unidade"
        />
      </div>
    </Cartao>
  );
}

export function EditarUnidade({
  clienteId,
  enderecos,
  unidade,
}: {
  clienteId: string;
  enderecos: EnderecoDoCliente[];
  unidade: UnidadeEditavel;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Botao
        type="button"
        variante="secundario"
        tamanho="sm"
        onClick={() => setAberto(true)}
      >
        <Pencil className="size-4" aria-hidden />
        Editar
      </Botao>

      <Painel
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={`Editar ${unidade.nome}`}
        descricao="Renomear a unidade não muda o endereço dos chamados já abertos."
        tamanho="lg"
      >
        {/* O painel só monta o conteúdo quando abre: uma lista de 20 unidades
            não carrega 20 formulários na árvore. */}
        <FormularioUnidade
          clienteId={clienteId}
          enderecos={enderecos}
          unidade={unidade}
          rotuloEnviar="Salvar unidade"
          aoConcluir={() => setAberto(false)}
          acoesExtras={
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
          }
        />
      </Painel>
    </>
  );
}

export function ExcluirUnidade({
  clienteId,
  unidade,
  equipamentos,
}: {
  clienteId: string;
  unidade: { id: string; nome: string };
  equipamentos: number;
}) {
  const [estado, acao, pendente] = useActionState(excluirUnidade, INICIAL);
  const ultimo = useRef<EstadoCliente>(INICIAL);

  useEffect(() => {
    if (estado === ultimo.current) return;
    ultimo.current = estado;
    if (estado.ok && estado.mensagem) toast.success(estado.mensagem);
    if (estado.erro) toast.error(estado.erro);
  }, [estado]);

  /*
   * Unidade com equipamento não é excluída: o `onDelete: SetNull` do schema
   * deixaria o parque instalado sem lugar, em silêncio. Em vez de um botão
   * desligado com a explicação escondida num `title`, o motivo aparece escrito
   * — quem lê pela tela e quem lê por leitor de tela recebem a mesma coisa.
   */
  if (equipamentos > 0) {
    return (
      <p className="max-w-52 text-xs leading-snug text-graf-500">
        Transfira os equipamentos desta unidade antes de excluí-la.
      </p>
    );
  }

  return (
    <form action={acao} className="inline-flex">
      <input type="hidden" name="clienteId" value={clienteId} />
      <input type="hidden" name="unidadeId" value={unidade.id} />
      <BotaoConfirmar
        rotulo={
          <>
            <Trash2 className="size-4" aria-hidden />
            Excluir
          </>
        }
        tamanho="sm"
        variante="perigo"
        varianteConfirmar="perigo"
        rotuloConfirmar="Excluir unidade"
        pergunta={`Excluir a unidade ${unidade.nome}?`}
        detalhe="A unidade some da agenda e do prontuário. Os chamados já abertos continuam com o endereço que tinham."
        carregando={pendente}
      />
    </form>
  );
}
