"use client";

import Link from "next/link";
import { ArrowRight, Headset, LayoutGrid, MessageCircle, Phone, RotateCcw } from "lucide-react";

import { CONTATO_DE_EMERGENCIA } from "@/components/institucional/contato-de-emergencia";
import { BuscaHero } from "@/components/loja/busca-hero";
import { Botao, LinkBotao, classesBotao } from "@/components/ui/button";
import { formatarTelefone, telHref, whatsappHref } from "@/lib/format";

const CLASSE_CARTAO =
  "group flex h-full min-h-24 min-w-0 items-start gap-3.5 rounded-xl border border-graf-200 bg-white p-4 transition-[border-color,box-shadow] hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 sm:p-5";

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
    <div className="mx-auto w-full max-w-5xl min-w-0">
      <p className="sobretitulo">Erro inesperado</p>
      <h1 className="text-display texto-forte mt-3 max-w-2xl text-balance">
        Não conseguimos abrir esta página agora.
      </h1>
      <p className="texto-guia texto-suave mt-5 max-w-xl">
        Tente novamente. Se a falha continuar, você pode voltar para a loja ou falar com a equipe JB.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Botao
          tamanho="lg"
          className="w-full sm:w-auto"
          onClick={() => {
            if (tentarDeNovo) tentarDeNovo();
            else window.location.reload();
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          Tentar de novo
        </Botao>
        <LinkBotao href="/" variante="secundario" tamanho="lg" className="w-full sm:w-auto">
          Ir para a página inicial
        </LinkBotao>
      </div>

      <div className="mt-10 max-w-xl sm:mt-12">
        <h2 className="text-[0.8125rem] font-bold text-graf-950">Ou procure direto no catálogo</h2>
        <div className="mt-3"><BuscaHero /></div>
      </div>

      <ul className="mt-8 grid min-w-0 gap-3 sm:mt-10 sm:grid-cols-2">
        <li className="min-w-0">
          <Link href="/loja" className={CLASSE_CARTAO}>
            <LayoutGrid className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-base font-bold text-graf-950">
                Ver o catálogo
                <ArrowRight className="size-4 shrink-0 text-jb-600 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-graf-600">
                Produtos, seminovos, peças e acessórios.
              </span>
            </span>
          </Link>
        </li>
        <li className="min-w-0">
          <Link href="/assistencia-tecnica/solicitar" className={CLASSE_CARTAO}>
            <Headset className="mt-0.5 size-5 shrink-0 text-graf-500" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-base font-bold text-graf-950">
                Solicitar assistência
                <ArrowRight className="size-4 shrink-0 text-jb-600 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-graf-600">
                Se um equipamento parou, abra um chamado técnico.
              </span>
            </span>
          </Link>
        </li>
      </ul>

      <section className="mt-10 rounded-2xl border border-graf-200 bg-graf-50 px-4 py-6 sm:px-8 sm:py-7">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 max-w-md">
            <h2 className="text-title texto-forte">Prefere falar com alguém?</h2>
            <p className="mt-2 text-base leading-relaxed text-graf-600">A equipe da JB atende pelo telefone e pelo WhatsApp.</p>
          </div>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={telHref(CONTATO_DE_EMERGENCIA.telefone)} className={`${classesBotao()} w-full sm:w-auto`}>
              <Phone className="size-4" aria-hidden />
              {formatarTelefone(CONTATO_DE_EMERGENCIA.telefone)}
            </a>
            {whatsapp ? (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${classesBotao("secundario")} w-full sm:w-auto`}>
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {digest ? (
        <p className="mt-8 break-words text-sm text-graf-500">
          Código da ocorrência: <span className="label-mono rounded bg-graf-100 px-2 py-1 text-graf-700">{digest}</span>
        </p>
      ) : null}
    </div>
  );
}
