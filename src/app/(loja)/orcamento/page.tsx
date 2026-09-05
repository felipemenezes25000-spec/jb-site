import type { Metadata } from "next";
import { MessageCircle, PackageCheck, ShoppingBag, Wrench } from "lucide-react";

import { FormOrcamento } from "@/components/cliente/form-orcamento";
import { whatsappHref } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Solicitar orçamento",
  description: "Solicite orçamento de equipamentos, peças, acessórios e assistência técnica odontológica com a JB.",
};

type Props = { searchParams: Promise<{ produto?: string }> };

export default async function OrcamentoPage({ searchParams }: Props) {
  const [{ produto }, s] = await Promise.all([searchParams, getSettings()]);
  const interesse = typeof produto === "string" ? produto.slice(0, 200) : "";

  return (
    <>
      <section className="relative overflow-hidden border-b border-graf-200 bg-graf-50/70">
        <div className="field-orbit pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="container-jb relative py-14 lg:py-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-600">Orçamento JB</p>
          <h1 className="mt-4 max-w-4xl text-display leading-[1.03]">
            Sua clínica explica a necessidade. A JB monta o próximo passo.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-graf-600 lg:text-lg">
            Equipamentos, peças, instalação ou assistência técnica. Envie os detalhes para a equipe entender o cenário antes de preparar uma resposta.
          </p>
        </div>
      </section>

      <section className="container-jb section-jb">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-12 xl:gap-16">
          <div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                [ShoppingBag, "Equipamentos", "Novos, seminovos, usados ou recondicionados conforme o catálogo e a disponibilidade."],
                [PackageCheck, "Peças e acessórios", "Reposição e itens específicos para equipamentos odontológicos."],
                [Wrench, "Assistência técnica", "Manutenção, diagnóstico, instalação e outras necessidades técnicas."],
              ].map(([Icon, titulo, texto]) => {
                const I = Icon as typeof ShoppingBag;
                return (
                  <article key={String(titulo)} className="rounded-2xl border border-graf-200 bg-white p-5 shadow-card sm:p-6">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-jb-50 text-jb-600">
                      <I className="size-5" aria-hidden />
                    </span>
                    <h2 className="mt-4 text-base font-extrabold text-graf-950">{String(titulo)}</h2>
                    <p className="mt-2 text-xs leading-5 text-graf-600">{String(texto)}</p>
                  </article>
                );
              })}
            </div>

            {s.whatsapp ? (
              <div className="mt-5 rounded-2xl bg-graf-950 p-6 text-white">
                <p className="text-sm font-extrabold text-white">Prefere conversar agora?</p>
                <p className="mt-2 text-xs leading-5 text-graf-400">
                  O WhatsApp continua disponível para dúvidas rápidas e alinhamentos comerciais.
                </p>
                <a
                  href={whatsappHref(
                    s.whatsapp,
                    interesse
                      ? `Olá! Gostaria de pedir um orçamento para ${interesse}.`
                      : "Olá! Gostaria de pedir um orçamento à JB.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-graf-950 transition hover:bg-graf-100"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Falar no WhatsApp
                </a>
              </div>
            ) : null}
          </div>

          <FormOrcamento produto={interesse} />
        </div>
      </section>
    </>
  );
}
