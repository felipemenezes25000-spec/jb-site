"use client";

import { useActionState } from "react";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";

import {
  perguntarSobreProduto,
  type EstadoPergunta,
} from "@/app/acoes/pergunta-de-produto";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Area, Campo } from "@/components/ui/form";
import { CampoTelefone } from "@/components/ui/campos-br";

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

  const concluido = Boolean(estado.ok);

  return (
    <details className="group border-y border-graf-200" open={concluido || undefined}>
      <summary className="foco-jb flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-jb-700">
            <MessageCircleQuestion className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-graf-950">Ainda ficou alguma dúvida?</span>
            <span className="mt-0.5 block text-xs leading-5 text-graf-500">
              Envie uma pergunta para a equipe JB.
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-jb-700">
          <span className="hidden sm:inline group-open:hidden">Perguntar</span>
          <span className="hidden sm:group-open:inline">Recolher</span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </span>
      </summary>

      <div className="border-t border-graf-150 pb-4 pt-4">
        {estado.ok ? (
          <Aviso tom="sucesso">{estado.ok}</Aviso>
        ) : (
          <form action={acao} className="grid gap-4">
            <input type="hidden" name="produtoId" value={produtoId} />
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
              placeholder={`Ex.: o ${nomeDoProduto} precisa de alguma preparação antes do uso?`}
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
                ajuda="A resposta chega por aqui."
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
              <p className="min-w-0 flex-1 text-xs leading-5 text-graf-500">
                A resposta vai para o seu e-mail. A JB pode publicar a pergunta sem identificar você.
              </p>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
