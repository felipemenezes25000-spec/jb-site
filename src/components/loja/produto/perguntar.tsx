"use client";

import { useActionState } from "react";
import { MessageCircleQuestion } from "lucide-react";

import {
  perguntarSobreProduto,
  type EstadoPergunta,
} from "@/app/acoes/pergunta-de-produto";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Area, Campo } from "@/components/ui/form";
import { CampoTelefone } from "@/components/ui/campos-br";

/* ============================================================================
   Perguntar sobre este equipamento

   A ficha respondia o que a JB já tinha escrito. A dúvida que ainda não foi
   escrita é justamente a que faz alguém fechar a aba — e ela não tinha para
   onde ir sem sair da página.

   O texto abaixo do formulário não é enfeite: ele diz o que acontece com a
   pergunta. Quem escreve num formulário público de "perguntas e respostas"
   costuma imaginar que o texto aparece na hora, e não aparece — nada escrito
   por visitante entra no site sem passar por alguém da JB. Dizer isso antes
   evita a decepção de procurar a própria pergunta na página e não achar.
   ============================================================================ */

export function PerguntarSobreProduto({
  produtoId,
  nomeDoProduto,
}: {
  produtoId: string;
  nomeDoProduto: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoPergunta, FormData>(
    perguntarSobreProduto,
    {},
  );

  return (
    <div className="rounded-xl border border-graf-200 bg-white p-5 sm:p-6">
      <h3 className="flex items-center gap-2.5 text-[1.0625rem] font-bold text-graf-950">
        <MessageCircleQuestion className="size-5 shrink-0 text-jb-600" aria-hidden />
        Ficou alguma dúvida sobre este equipamento?
      </h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
        Pergunte à equipe técnica da JB — a mesma que instala e faz a manutenção
        deste tipo de equipamento.
      </p>

      {estado.ok ? (
        <div className="mt-4">
          <Aviso tom="sucesso">{estado.ok}</Aviso>
        </div>
      ) : (
        <form action={acao} className="mt-5 grid gap-4">
          <input type="hidden" name="produtoId" value={produtoId} />

          {/* Armadilha: fica fora da tela e sem foco por tabulação. */}
          <input
            type="text"
            name="assunto_alternativo"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="sr-only"
          />

          <Area
            name="pergunta"
            rotulo="Sua pergunta"
            required
            rows={3}
            maxLength={1200}
            placeholder={`Ex.: o ${nomeDoProduto} precisa de ponto de água próprio?`}
            erro={estado.campo === "pergunta" ? estado.erro : undefined}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              name="nome"
              rotulo="Seu nome"
              required
              autoComplete="name"
              maxLength={120}
              erro={estado.campo === "nome" ? estado.erro : undefined}
            />
            <Campo
              name="email"
              type="email"
              rotulo="E-mail"
              required
              autoComplete="email"
              maxLength={160}
              ajuda="É por aqui que a resposta chega."
              erro={estado.campo === "email" ? estado.erro : undefined}
            />
          </div>

          <CampoTelefone
            name="telefone"
            rotulo="Telefone (opcional)"
            autoComplete="tel"
            erro={estado.campo === "telefone" ? estado.erro : undefined}
          />

          {estado.erro && !estado.campo ? <Aviso tom="erro">{estado.erro}</Aviso> : null}

          <div className="flex flex-wrap items-center gap-4">
            <Botao type="submit" carregando={enviando}>
              Enviar pergunta
            </Botao>
            <p className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-graf-500">
              A resposta vai para o seu e-mail. Quando ela for útil para outras clínicas, a
              JB publica a pergunta nesta página — sem o seu nome.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
