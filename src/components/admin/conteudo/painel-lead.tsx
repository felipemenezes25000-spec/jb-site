"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Save, UserPlus } from "lucide-react";

import type { AcaoDeFormulario, EstadoAcao } from "@/components/admin/conteudo/botao-acao";
import {
  Bloco,
  MensagemDoFormulario,
  erroDoCampo,
} from "@/components/admin/conteudo/formulario-base";
import { ROTULO_LEAD, STATUS_LEAD } from "@/components/admin/conteudo/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Area, Selecao } from "@/components/ui/form";

/* ============================================================================
   Atendimento de um lead

   Duas ações independentes: registrar a situação com as anotações internas, e
   transformar o contato em cliente de verdade. A conversão é separada porque é
   a única que cria registro novo — e, quando o e-mail já existe, ela avisa em
   vez de duplicar cadastro.
   ============================================================================ */

const VAZIO: EstadoAcao = {};

export function FormularioLead({
  acao,
  id,
  status,
  notas,
}: {
  acao: AcaoDeFormulario;
  id: string;
  status: string;
  notas: string;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);

  return (
    <form action={executar}>
      <Bloco titulo="Atendimento" descricao="Situação e anotações internas deste contato.">
        <input type="hidden" name="id" value={id} />

        <Selecao
          rotulo="Situação"
          name="status"
          defaultValue={STATUS_LEAD.includes(status as never) ? status : "novo"}
          erro={erroDoCampo(estado, "status")}
        >
          {STATUS_LEAD.map((chave) => (
            <option key={chave} value={chave}>
              {ROTULO_LEAD[chave]}
            </option>
          ))}
        </Selecao>

        <Area
          rotulo="Anotações internas"
          name="notas"
          rows={6}
          maxLength={4000}
          defaultValue={notas}
          erro={erroDoCampo(estado, "notas")}
          ajuda="Só a equipe vê este texto. O cliente nunca recebe."
        />

        <MensagemDoFormulario estado={estado} />

        <div>
          <Botao type="submit" carregando={pendente} tamanho="md">
            <Save className="size-4" aria-hidden />
            Salvar atendimento
          </Botao>
        </div>
      </Bloco>
    </form>
  );
}

export function BotaoConverterLead({
  acao,
  id,
  jaConvertido,
}: {
  acao: AcaoDeFormulario;
  id: string;
  jaConvertido: boolean;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);

  return (
    <form action={executar} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      <Botao type="submit" variante="secundario" carregando={pendente} larguraTotal>
        <UserPlus className="size-4" aria-hidden />
        {jaConvertido ? "Criar cliente mesmo assim" : "Criar cliente com estes dados"}
      </Botao>

      {estado.erro ? (
        <Aviso tom="atencao" titulo="Nenhum cliente novo foi criado">
          <p>{estado.erro}</p>
          {estado.id ? (
            <p className="mt-2">
              <Link
                href={`/admin/clientes/${estado.id}`}
                className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-jb-700 underline underline-offset-2"
              >
                Abrir o cliente existente
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </p>
          ) : null}
        </Aviso>
      ) : null}

      {estado.ok ? (
        <Aviso tom="sucesso" titulo="Cliente criado">
          <p>{estado.ok}</p>
          {estado.id ? (
            <p className="mt-2">
              <Link
                href={`/admin/clientes/${estado.id}`}
                className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-jb-700 underline underline-offset-2"
              >
                Abrir a ficha do cliente
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </p>
          ) : null}
        </Aviso>
      ) : null}
    </form>
  );
}
