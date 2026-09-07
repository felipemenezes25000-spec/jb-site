"use client";

import Link from "next/link";
import { ArrowRight, Headset, LayoutGrid, MessageCircle, Phone, RotateCcw } from "lucide-react";

import { CONTATO_DE_EMERGENCIA } from "@/components/institucional/contato-de-emergencia";
import { BuscaHero } from "@/components/loja/busca-hero";
import { Botao, LinkBotao, classesBotao } from "@/components/ui/button";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";

/* ============================================================================
   Miolo da tela de erro

   O mesmo conteúdo em duas molduras, como no 404: dentro da loja o cabeçalho
   e o rodapé já estão na tela e o erro entra só como conteúdo; fora dela a
   página traz a própria marca.

   Nada aqui consulta o banco. Se a falha for justamente no banco, a tela de
   erro não pode falhar junto — os contatos vêm de uma constante local.

   O texto fala com o dono da clínica, não com o programador: o código da
   ocorrência existe porque é o que a equipe pede quando alguém liga, e fica
   discreto, embaixo das saídas úteis.
   ============================================================================ */

const CLASSE_CARTAO =
  "group flex h-full items-start gap-3.5 rounded-xl border border-graf-200 bg-white p-5 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500";

export function ConteudoErro({
  digest,
  tentarDeNovo,
}: {
  digest?: string;
  tentarDeNovo?: () => void;
}) {
  const whatsapp = whatsappHref(
    CONTATO_DE_EMERGENCIA.whatsapp,
    "Olá! Tive um erro no site da JB.",
  );

  return (
    <div className="mx-auto max-w-5xl">
      <p className="sobretitulo">Erro inesperado</p>
      <h1 className="text-display texto-forte mt-3 max-w-2xl">
        Alguma coisa quebrou do nosso lado.
      </h1>
      <p className="texto-guia texto-suave mt-5 max-w-xl">
        Não foi você. Tente abrir a página de novo em alguns instantes — nada do que você já
        tinha salvo se perde por causa desta tela.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Botao
          tamanho="lg"
          onClick={() => {
            if (tentarDeNovo) tentarDeNovo();
            else window.location.reload();
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          Tentar de novo
        </Botao>

        <LinkBotao href="/" variante="secundario" tamanho="lg">
          Ir para a página inicial
        </LinkBotao>
      </div>

      <div className="mt-12 max-w-xl">
        <h2 className="text-[0.8125rem] font-bold text-graf-950">
          Ou procure direto no catálogo
        </h2>
        <div className="mt-3">
          <BuscaHero />
        </div>
      </div>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        <li>
          <Link href="/loja" className={CLASSE_CARTAO}>
            <LayoutGrid className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-base font-bold text-graf-950">
                Ver o catálogo
                <ArrowRight
                  className="size-4 text-jb-600 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-graf-600">
                Equipamentos, seminovos, peças e acessórios.
              </span>
            </span>
          </Link>
        </li>

        <li>
          <Link href="/assistencia-tecnica/solicitar" className={CLASSE_CARTAO}>
            <Headset className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-base font-bold text-graf-950">
                Solicitar assistência
                <ArrowRight
                  className="size-4 text-jb-600 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-graf-600">
                Equipamento parado não espera o site voltar.
              </span>
            </span>
          </Link>
        </li>
      </ul>

      <section className="mt-10 rounded-2xl border border-graf-200 bg-graf-50 px-6 py-7 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
          <div className="max-w-md">
            <h2 className="text-title texto-forte">Prefere falar com alguém?</h2>
            <p className="mt-2 text-base leading-relaxed text-graf-600">
              A equipe da JB atende pelo telefone e pelo WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a href={telHref(CONTATO_DE_EMERGENCIA.telefone)} className={classesBotao()}>
              <Phone className="size-4" aria-hidden />
              {formatarTelefone(CONTATO_DE_EMERGENCIA.telefone)}
            </a>

            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className={classesBotao("secundario")}
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {digest ? (
        <p className="mt-8 text-sm text-graf-500">
          Código da ocorrência:{" "}
          <span className="label-mono rounded bg-graf-100 px-2 py-1 text-graf-700">
            {digest}
          </span>
        </p>
      ) : null}
    </div>
  );
}
