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

/* ============================================================================
   Perguntar sobre este equipamento

   O formulário é importante numa compra consultiva, mas não precisa ocupar a
   página inteira de quem só veio ler as respostas já publicadas. A entrada é
   uma ação progressiva: o comprador vê que pode falar com a equipe e abre o
   formulário apenas quando realmente precisar.
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

  const concluido = Boolean(estado.ok);

  return (
    <details
      className="group overflow-hidden rounded-xl border border-graf-200 bg-white"
      open={concluido || undefined}
    >
      <summary className="foco-jb flex min-h-[4.75rem] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
            <MessageCircleQuestion className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-bold text-graf-950">
              Não encontrou sua dúvida?
            </span>
            <span className="mt-0.5 block text-[0.8125rem] leading-5 text-graf-500">
              Pergunte diretamente à equipe técnica da JB.
            </span>
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-jb-700">
          <span className="hidden sm:inline group-open:hidden">Perguntar</span>
          <span className="hidden sm:group-open:inline">Recolher</span>
          <ChevronDown
            className="size-4 transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </span>
      </summary>

      <div className="border-t border-graf-200 px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
        {estado.ok ? (
          <Aviso tom="sucesso">{estado.ok}</Aviso>
        ) : (
          <form action={acao} className="grid gap-4">
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
              <p className="min-w-0 flex-1 text-[0.75rem] leading-5 text-graf-500">
                A resposta vai para o seu e-mail. Se ajudar outras clínicas, a JB pode publicar
                a pergunta nesta página sem o seu nome.
              </p>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
