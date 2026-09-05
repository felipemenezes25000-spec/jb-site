"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { atualizarPerfil, trocarSenha, type EstadoMinhaJb } from "@/app/acoes/minha-jb";
import { Botao } from "@/components/ui/button";
import { CampoDocumento, CampoTelefone } from "@/components/ui/campos-br";
import { Campo, Marcador, Selecao } from "@/components/ui/form";

/**
 * Dados cadastrais e troca de senha.
 *
 * São dois formulários independentes de propósito: salvar o telefone não pode
 * exigir digitar a senha, e trocar a senha não pode reenviar o cadastro
 * inteiro. Cada um tem o próprio estado, o próprio erro e o próprio aviso de
 * sucesso.
 *
 * O e-mail aparece bloqueado. Ele é a chave de acesso da conta e trocá-lo sem
 * confirmar o endereço novo é o caminho mais curto para alguém perder o acesso
 * — a tela diz como pedir a troca à equipe.
 */

type TipoPessoa = "fisica" | "juridica";

function Mensagens({ estado }: { estado: EstadoMinhaJb }) {
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {estado.ok ?? (estado.campo ? estado.erro : "")}
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

      {estado.ok ? (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-ok-500/25 bg-ok-50 px-4 py-3 text-sm leading-relaxed text-ok-700"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{estado.ok}</span>
        </p>
      ) : null}
    </>
  );
}

export type DadosDoPerfil = {
  nome: string;
  email: string;
  telefone: string;
  tipoPessoa: TipoPessoa;
  documento: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  aceitaNovidades: boolean;
};

export function FormularioPerfil({ dados }: { dados: DadosDoPerfil }) {
  const [estado, acao, enviando] = useActionState<EstadoMinhaJb, FormData>(
    atualizarPerfil,
    {},
  );
  const [tipo, setTipo] = useState<TipoPessoa>(dados.tipoPessoa);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);

  return (
    <form action={acao} noValidate className="space-y-5">
      <Mensagens estado={estado} />

      <Campo
        rotulo="Nome completo"
        name="nome"
        required
        maxLength={120}
        autoComplete="name"
        defaultValue={dados.nome}
        erro={erroDe("nome")}
      />

      <Campo
        rotulo="E-mail de acesso"
        name="email"
        type="email"
        defaultValue={dados.email}
        readOnly
        disabled
        ajuda="O e-mail é a chave da sua conta. Para trocá-lo, fale com a equipe da JB pelos canais de contato — a mudança é confirmada com você."
      />

      <CampoTelefone
        name="telefone"
        rotulo="Telefone com DDD"
        valorInicial={dados.telefone}
        autoComplete="tel"
        ajuda="Usado para confirmar visita técnica e entrega."
        erro={erroDe("telefone")}
      />

      <Selecao
        rotulo="Tipo de cadastro"
        name="tipoPessoa"
        value={tipo}
        onChange={(evento) => setTipo(evento.currentTarget.value as TipoPessoa)}
        erro={erroDe("tipoPessoa")}
      >
        <option value="fisica">Pessoa física (CPF)</option>
        <option value="juridica">Pessoa jurídica (CNPJ)</option>
      </Selecao>

      <CampoDocumento
        key={tipo}
        name="documento"
        tipo={tipo}
        rotulo={tipo === "fisica" ? "CPF" : "CNPJ"}
        valorInicial={dados.documento}
        ajuda="Necessário para a emissão da nota fiscal."
        erro={erroDe("documento")}
      />

      {tipo === "juridica" ? (
        <div className="space-y-5 rounded-lg bg-graf-50 p-4">
          <Campo
            rotulo="Razão social"
            name="razaoSocial"
            required
            maxLength={160}
            defaultValue={dados.razaoSocial}
            erro={erroDe("razaoSocial")}
          />
          <Campo
            rotulo="Nome fantasia"
            name="nomeFantasia"
            maxLength={160}
            defaultValue={dados.nomeFantasia}
            erro={erroDe("nomeFantasia")}
          />
          <Campo
            rotulo="Inscrição estadual"
            name="inscricaoEstadual"
            maxLength={40}
            defaultValue={dados.inscricaoEstadual}
            ajuda="Deixe em branco se a clínica for isenta."
            erro={erroDe("inscricaoEstadual")}
          />
        </div>
      ) : null}

      <fieldset className="border-t border-graf-200 pt-5">
        <legend className="sr-only">Preferências de contato</legend>
        <Marcador
          name="novidades"
          value="1"
          defaultChecked={dados.aceitaNovidades}
          rotulo="Quero receber novidades e ofertas da JB"
          ajuda="Avisos sobre pedido, chamado e manutenção continuam chegando de qualquer forma — eles fazem parte do atendimento."
        />
      </fieldset>

      <Botao type="submit" carregando={enviando}>
        {enviando ? "Salvando…" : "Salvar dados"}
      </Botao>
    </form>
  );
}

export function FormularioSenha() {
  const [estado, acao, enviando] = useActionState<EstadoMinhaJb, FormData>(trocarSenha, {});
  const [verSenha, setVerSenha] = useState(false);
  const refFormulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) refFormulario.current?.reset();
  }, [estado.ok]);

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);

  return (
    <form ref={refFormulario} action={acao} noValidate className="space-y-5">
      <Mensagens estado={estado} />

      <Campo
        rotulo="Senha atual"
        name="atual"
        type={verSenha ? "text" : "password"}
        autoComplete="current-password"
        required
        erro={erroDe("atual")}
      />

      <Campo
        rotulo="Nova senha"
        name="nova"
        type={verSenha ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        ajuda="Pelo menos 8 caracteres. Use algo que só você saiba."
        erro={erroDe("nova")}
      />

      <Campo
        rotulo="Repita a nova senha"
        name="confirmacao"
        type={verSenha ? "text" : "password"}
        autoComplete="new-password"
        required
        erro={erroDe("confirmacao")}
      />

      <button
        type="button"
        onClick={() => setVerSenha((atual) => !atual)}
        aria-pressed={verSenha}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium text-graf-600 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
      >
        {verSenha ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        {verSenha ? "Ocultar senhas" : "Mostrar senhas"}
      </button>

      <Botao type="submit" carregando={enviando}>
        {enviando ? "Trocando…" : "Trocar senha"}
      </Botao>
    </form>
  );
}
