import { ArrowRight, MessageCircle, ShoppingBag, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { whatsappHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";

const ETAPAS = [
  { numero: "01", rotulo: "Escolha", texto: "Produtos com preço, condição e informações técnicas organizadas." },
  { numero: "02", rotulo: "Entrega", texto: "Frete ou retirada definidos antes do pagamento." },
  { numero: "03", rotulo: "Pós-venda", texto: "A equipe JB continua disponível depois da compra." },
] as const;

export function SecaoAssistencia({ configuracoes: s }: { configuracoes: SettingsMap }) {
  const whatsapp = s.whatsapp.trim();

  return (
    <section className="border-b border-graf-200 bg-graf-50/50 py-14 lg:py-20">
      <div className="container-jb max-w-[100rem]">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end">
          <div className="max-w-2xl">
            <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
              Compra e suporte
            </p>
            <h2 className="mt-2 text-section font-extrabold tracking-[-0.04em] text-graf-950">
              Dois caminhos claros para o que sua clínica precisa agora.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-graf-600 sm:text-corpo lg:justify-self-end">
            Para comprar, entre na loja. Para resolver um equipamento que já está em uso, abra a
            assistência técnica. Sem misturar as duas jornadas.
          </p>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          <article className="flex min-w-0 flex-col rounded-xl border border-graf-200 bg-white p-5 sm:p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
              <ShoppingBag className="size-4" aria-hidden />
            </span>
            <p className="mt-5 text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
              Quero comprar
            </p>
            <h3 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-graf-950 sm:text-2xl">
              Produtos novos, seminovos, peças e acessórios.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-graf-600">
              Compare opções, confira disponibilidade e avance para a compra com as informações da
              página do produto.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <LinkBotao href="/loja" tamanho="lg" className="rounded-lg sm:w-auto">
                Explorar loja
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
              <LinkBotao href="/seminovos" variante="secundario" tamanho="lg" className="rounded-lg sm:w-auto">
                Ver seminovos
              </LinkBotao>
            </div>
          </article>

          <article className="flex min-w-0 flex-col rounded-xl border border-graf-200 bg-white p-5 sm:p-6">
            <span className="flex size-10 items-center justify-center rounded-lg bg-jb-50 text-jb-700">
              <Wrench className="size-4" aria-hidden />
            </span>
            <p className="mt-5 text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">
              Preciso de suporte
            </p>
            <h3 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-graf-950 sm:text-2xl">
              Assistência técnica para equipamentos odontológicos.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-graf-600">
              Abra o chamado com o contexto do equipamento para a equipe conduzir triagem,
              orçamento e acompanhamento do atendimento.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="lg" className="rounded-lg sm:w-auto">
                Solicitar assistência
                <ArrowRight className="size-4" aria-hidden />
              </LinkBotao>
              {whatsapp ? (
                <LinkBotao
                  href={whatsappHref(whatsapp, "Olá! Preciso de ajuda com um equipamento odontológico.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  variante="secundario"
                  tamanho="lg"
                  className="rounded-lg sm:w-auto"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </LinkBotao>
              ) : null}
            </div>
          </article>
        </div>

        <ol className="mt-6 grid overflow-hidden rounded-xl border border-graf-200 bg-white sm:grid-cols-3">
          {ETAPAS.map((etapa) => (
            <li key={etapa.numero} className="min-w-0 border-b border-graf-200 p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:p-5">
              <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.11em] text-jb-700">{etapa.numero} · {etapa.rotulo}</p>
              <p className="mt-2 text-sm leading-5 text-graf-600">{etapa.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
