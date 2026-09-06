"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { enviarContato, type EstadoContato } from "@/app/acoes/contato";
import { Botao } from "@/components/ui/button";
import { Area, Campo, Marcador } from "@/components/ui/form";
import { CampoTelefone } from "@/components/ui/campos-br";
import { Aviso } from "@/components/ui/aviso";

/* ============================================================================
   Formulário de contato

   Toda a validação que vale é a do servidor (`@/app/acoes/contato`); aqui o
   navegador só ajuda com máscara e teclado certo. O erro aparece duas vezes
   de propósito: no resumo em cima, que é região viva e leva o foco para o
   campo problemático, e junto do próprio campo, para quem já está lendo ali.

   Depois de um envio bem-sucedido o formulário é remontado por troca de
   chave — só assim os campos com máscara, que guardam estado interno,
   realmente voltam a ficar vazios.
   ============================================================================ */

const INICIAL: EstadoContato = {};

export function FormularioContato() {
  const [estado, acao, pendente] = useActionState(enviarContato, INICIAL);
  const [chave, setChave] = useState(0);
  const refForm = useRef<HTMLFormElement>(null);
  const tratado = useRef<EstadoContato | null>(null);

  useEffect(() => {
    if (tratado.current === estado) return;
    tratado.current = estado;

    if (estado.ok) {
      setChave((atual) => atual + 1);
      return;
    }

    if (estado.campo) {
      const campo = refForm.current?.elements.namedItem(estado.campo);
      if (campo instanceof HTMLElement) campo.focus();
    }
  }, [estado]);

  const erroDe = (nome: string) => (estado.campo === nome ? estado.erro : undefined);

  return (
    <div>
      {estado.ok ? (
        <Aviso tom="sucesso" titulo="Mensagem enviada" className="mb-6">
          {estado.ok}
        </Aviso>
      ) : null}

      {estado.erro ? (
        <Aviso tom="erro" titulo="Não foi possível enviar" className="mb-6">
          {estado.erro}
        </Aviso>
      ) : null}

      <form key={chave} ref={refForm} action={acao} noValidate className="space-y-5">
        {/* Armadilha para robô: fora da tela, fora da ordem de tabulação e
            ignorada pelo leitor de tela. Humano nunca preenche. */}
        <div hidden aria-hidden>
          <label htmlFor="assunto_alternativo">Não preencha este campo</label>
          <input
            id="assunto_alternativo"
            name="assunto_alternativo"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            rotulo="Nome"
            name="nome"
            required
            autoComplete="name"
            maxLength={120}
            placeholder="Como devemos chamar você"
            erro={erroDe("nome")}
          />
          <Campo
            rotulo="E-mail"
            name="email"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            placeholder="voce@clinica.com.br"
            erro={erroDe("email")}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTelefone
            name="telefone"
            required
            erro={erroDe("telefone")}
            ajuda="Com DDD. É por onde a JB retorna mais rápido."
          />
          <Campo
            rotulo="Cidade"
            name="cidade"
            autoComplete="address-level2"
            maxLength={80}
            placeholder="Onde fica a clínica"
            erro={erroDe("cidade")}
          />
        </div>

        <Area
          rotulo="Mensagem"
          name="mensagem"
          required
          rows={6}
          maxLength={4000}
          placeholder="Conte o que você precisa: equipamento, marca, modelo, o que está acontecendo."
          erro={erroDe("mensagem")}
          ajuda="Quanto mais detalhe, mais direta é a resposta."
        />

        <Marcador
          name="novidades"
          rotulo="Quero receber novidades e condições da JB por e-mail"
          ajuda="Opcional. Dá para cancelar quando quiser."
        />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
          <Botao type="submit" tamanho="lg" carregando={pendente}>
            {pendente ? "Enviando…" : "Enviar mensagem"}
            {pendente ? null : <Send className="size-4" aria-hidden />}
          </Botao>
          <p className="max-w-xs text-[0.8125rem] leading-relaxed text-graf-500">
            Ao enviar, seus dados são usados apenas para responder este contato.{" "}
            <Link
              href="/privacidade"
              className="font-semibold text-graf-700 underline underline-offset-4 hover:text-jb-700"
            >
              Política de privacidade
            </Link>
            .
          </p>
        </div>
      </form>
    </div>
  );
}
