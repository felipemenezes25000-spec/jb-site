"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { NotebookPen, Save } from "lucide-react";

import {
  adicionarNotaDoCliente,
  salvarCliente,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import { Botao } from "@/components/ui/button";
import { CampoDocumento, CampoTelefone } from "@/components/ui/campos-br";
import { Cartao, CabecalhoCartao, Vazio } from "@/components/ui/data";
import { Area, Campo, Marcador, Selecao } from "@/components/ui/form";

/* ============================================================================
   Cadastro e notas internas do cliente

   O tipo de pessoa manda no resto do formulário: pessoa jurídica pede razão
   social e valida CNPJ, física valida CPF. A troca acontece na hora aqui, mas
   quem confirma é o servidor — inclusive os dígitos verificadores.

   As notas internas moram num único campo de texto no schema (`Customer.notes`),
   então cada nota nova entra como bloco datado e assinado, com a mais recente no
   topo. É por isso que o histórico aparece como texto corrido e não como lista
   de registros.
   ============================================================================ */

const INICIAL: EstadoVendas = {};

export type ClienteEditavel = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipoPessoa: "fisica" | "juridica";
  documento: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  ativo: boolean;
  notas: string;
};

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
}: {
  children: React.ReactNode;
  variante?: "primario" | "secundario";
}) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante={variante} carregando={pending}>
      {children}
    </Botao>
  );
}

export function FormularioCliente({ cliente }: { cliente: ClienteEditavel }) {
  const [estado, acao] = useActionState(salvarCliente, INICIAL);
  const [tipo, setTipo] = useState(cliente.tipoPessoa);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Cadastro"
        descricao="Dados usados em pedidos, orçamentos e documentos."
      />
      <form action={acao} className="space-y-4 p-5">
        <input type="hidden" name="clienteId" value={cliente.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Nome"
            name="nome"
            defaultValue={cliente.nome}
            required
            maxLength={160}
            autoComplete="off"
            erro={erroDe("nome")}
          />
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            defaultValue={cliente.email}
            required
            maxLength={160}
            autoComplete="off"
            erro={erroDe("email")}
          />

          <CampoTelefone
            name="telefone"
            valorInicial={cliente.telefone}
            erro={erroDe("telefone")}
          />

          <Selecao
            rotulo="Tipo de pessoa"
            name="tipoPessoa"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as "fisica" | "juridica")}
          >
            <option value="fisica">Pessoa física</option>
            <option value="juridica">Pessoa jurídica</option>
          </Selecao>

          <CampoDocumento
            name="documento"
            tipo={tipo}
            rotulo={tipo === "juridica" ? "CNPJ" : "CPF"}
            valorInicial={cliente.documento}
            erro={erroDe("documento")}
          />

          {tipo === "juridica" ? (
            <>
              <Campo
                rotulo="Razão social"
                name="razaoSocial"
                defaultValue={cliente.razaoSocial}
                maxLength={160}
                erro={erroDe("razaoSocial")}
              />
              <Campo
                rotulo="Nome fantasia"
                name="nomeFantasia"
                defaultValue={cliente.nomeFantasia}
                maxLength={160}
              />
              <Campo
                rotulo="Inscrição estadual"
                name="inscricaoEstadual"
                defaultValue={cliente.inscricaoEstadual}
                maxLength={40}
                ajuda="Deixe vazio se for isento."
              />
            </>
          ) : (
            <>
              <input type="hidden" name="razaoSocial" value={cliente.razaoSocial} />
              <input type="hidden" name="nomeFantasia" value={cliente.nomeFantasia} />
              <input
                type="hidden"
                name="inscricaoEstadual"
                value={cliente.inscricaoEstadual}
              />
            </>
          )}
        </div>

        <Marcador
          name="ativo"
          rotulo="Conta ativa"
          ajuda="Desmarcado, o cliente não consegue entrar na Minha JB. O histórico continua aqui."
          defaultChecked={cliente.ativo}
        />

        <Retorno estado={estado} />

        <Enviar>
          <Save className="size-4" aria-hidden />
          Salvar cadastro
        </Enviar>
      </form>
    </Cartao>
  );
}

export function NotasDoCliente({
  clienteId,
  notas,
}: {
  clienteId: string;
  notas: string;
}) {
  const [estado, acao] = useActionState(adicionarNotaDoCliente, INICIAL);

  return (
    <Cartao>
      <CabecalhoCartao
        titulo="Notas internas"
        descricao="Só a equipe vê. O cliente nunca tem acesso a este texto."
      />
      <div className="space-y-5 p-5">
        {notas.trim() ? (
          <div className="max-h-80 overflow-y-auto rounded-lg bg-graf-50 p-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-graf-800">{notas}</p>
          </div>
        ) : (
          <Vazio
            icone={NotebookPen}
            titulo="Nenhuma nota ainda"
            descricao="Registre combinações, preferências e o que a próxima pessoa precisa saber antes de ligar."
          />
        )}

        <form action={acao} className="space-y-3 border-t border-graf-200 pt-5">
          <input type="hidden" name="clienteId" value={clienteId} />
          <Area
            rotulo="Nova nota"
            name="nota"
            rows={3}
            required
            maxLength={2000}
            erro={estado.campo === "nota" ? estado.erro : undefined}
            placeholder="Ex.: prefere visita às terças de manhã; compras sempre aprovadas pela Dra. Ana."
          />
          <Retorno estado={estado} />
          <Enviar variante="secundario">Registrar nota</Enviar>
        </form>
      </div>
    </Cartao>
  );
}
