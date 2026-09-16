"use client";

import { useEffect } from "react";
import { LifeBuoy, RotateCcw, TriangleAlert } from "lucide-react";

import { Botao, LinkBotao } from "@/components/ui/button";

/**
 * Tela de erro do backoffice.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * Sem ele, uma falha em qualquer tela de /admin sobe até `src/app/error.tsx`,
 * que é a tela de erro da LOJA: ela troca a página inteira pela casca pública,
 * com logo que leva para a home, busca do catálogo e telefone de emergência.
 * Quem estava no meio de uma OS é jogado para fora do painel e perde o menu, a
 * sessão visível e o caminho de volta.
 *
 * Estando aqui, a fronteira de erro fica DENTRO de `admin/layout.tsx`: o menu
 * lateral, o cabeçalho e a busca continuam na tela e só o miolo é substituído.
 * A pessoa clica em outra área e segue trabalhando.
 *
 * Nada nesta tela consulta o banco: se a falha for justamente no banco, a tela
 * de erro não pode falhar junto.
 *
 * `retry` é o nome estável nesta versão do Next (16.3); `reset` continua
 * chegando por compatibilidade. Os dois entram como opcionais, e o recarregar
 * manual fica como último recurso.
 */
export default function ErroDoPainel({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    // O digest é o que liga esta tela ao registro do servidor.
    console.error("Falha ao renderizar uma tela do painel", error);
  }, [error]);

  const tentarDeNovo = retry ?? reset;

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <div className="rounded-2xl border border-graf-200 bg-white p-6 sm:p-8">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-lg bg-warn-50 text-warn-700"
        >
          <TriangleAlert className="size-5" />
        </span>

        <h1 className="mt-5 text-[1.625rem] font-bold leading-[1.15] tracking-[-0.02em] text-graf-950">
          Esta tela não carregou
        </h1>

        <p className="mt-3 text-corpo leading-relaxed text-graf-600">
          O restante do painel continua funcionando — o problema ficou nesta página. Nenhum
          pedido, chamado ou ordem de serviço foi alterado, e o que já estava salvo continua
          salvo.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Botao
            onClick={() => {
              if (tentarDeNovo) tentarDeNovo();
              else window.location.reload();
            }}
          >
            <RotateCcw className="size-4" aria-hidden />
            Tentar de novo
          </Botao>

          <LinkBotao href="/admin" variante="secundario">
            Voltar para a visão geral
          </LinkBotao>
        </div>

        {error.digest ? (
          <p className="mt-7 border-t border-graf-200 pt-5 text-corpo leading-relaxed text-graf-500">
            Se acontecer de novo, passe este código para quem cuida do sistema:{" "}
            <span className="label-mono rounded bg-graf-100 px-2 py-1 text-graf-700">
              {error.digest}
            </span>
          </p>
        ) : null}

        <p className="mt-5 flex items-start gap-2.5 text-corpo leading-relaxed text-graf-500">
          <LifeBuoy className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
          <span>
            Enquanto isso, dá para chegar às outras áreas pelo menu ou pela busca do topo.
          </span>
        </p>
      </div>
    </div>
  );
}
