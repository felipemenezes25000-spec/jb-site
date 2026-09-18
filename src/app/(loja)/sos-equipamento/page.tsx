import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CircleAlert,
  ClipboardList,
  MessageCircle,
  ShieldAlert,
  Siren,
  Wrench,
} from "lucide-react";

import { SosAbrirChamado } from "@/components/assistencia/sos-equipamento";
import { LinkBotao } from "@/components/ui/button";
import { Trilha } from "@/components/ui/data";
import { whatsappHref } from "@/lib/format";
import {
  JsonLd,
  metadataDePagina,
  servicoJsonLd,
  trilhaJsonLd,
} from "@/lib/seo";
/* Configuração pública em cache (etiqueta `configuracoes`, derrubada quando o
   painel salva). `getSettings()` cru é leitura sem cache fora de <Suspense>:
   com Cache Components o Next acusava "uncached data during prerendering or a
   navigation" ao chegar aqui pelo atalho da home. */
import { configuracoesPublicas } from "@/lib/loja-publica";

import "./sos.css";

const CAMINHO = "/sos-equipamento";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Assistência técnica", href: "/assistencia-tecnica" },
  { rotulo: "SOS Equipamento" },
];

export async function generateMetadata(): Promise<Metadata> {
  const s = await configuracoesPublicas();
  return metadataDePagina({
    titulo: "SOS Equipamento odontológico",
    descricao: `Seu equipamento odontológico parou? Inicie a triagem técnica da JB em ${s.endereco_cidade}, envie evidências e abra um chamado com protocolo.`,
    caminho: CAMINHO,
  });
}

const PASSOS = [
  {
    icone: Siren,
    titulo: "Sinalize que o equipamento parou",
    texto: "O formulário já começa com a parada operacional marcada para você revisar.",
  },
  {
    icone: Camera,
    titulo: "Mostre o que está acontecendo",
    texto: "Foto da etiqueta, imagens e um vídeo curto ajudam a equipe a chegar mais preparada.",
  },
  {
    icone: ClipboardList,
    titulo: "Receba o protocolo",
    texto: "Depois do envio, o chamado ganha número e passa a ter andamento rastreável.",
  },
];

export default async function SosEquipamentoPage() {
  const s = await configuracoesPublicas();
  const whatsapp = whatsappHref(
    s.whatsapp,
    "Olá! Meu equipamento odontológico parou e preciso de assistência técnica da JB.",
  );

  return (
    <div data-sos-equipamento>
      <JsonLd
        dados={[
          servicoJsonLd({
            nome: "SOS Equipamento odontológico",
            caminho: CAMINHO,
            descricao:
              "Entrada rápida para triagem e abertura de chamado quando um equipamento odontológico para de operar.",
            prestador: s.empresa_nome,
            area: s.endereco_cidade,
            tipo: "Assistência técnica odontológica",
          }),
          trilhaJsonLd(TRILHA),
        ]}
      />

      <header className="sos-hero relative overflow-hidden border-b border-graf-800 bg-graf-950 text-white">
        <span aria-hidden className="sos-grid pointer-events-none absolute inset-0" />
        <span aria-hidden className="sos-orbita pointer-events-none absolute -right-28 top-14 size-80 rounded-full border border-jb-500/25" />
        <span aria-hidden className="sos-orbita sos-orbita-2 pointer-events-none absolute -right-2 top-36 size-52 rounded-full border border-jb-500/15" />
        <span aria-hidden className="sos-scan pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-jb-500 to-transparent" />

        <div className="container-jb relative py-8 sm:py-12 lg:py-16">
          <Trilha itens={TRILHA} className="mb-7 [&_a]:text-graf-400 [&_span]:text-graf-300" />

          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-jb-500/30 bg-jb-500/10 px-3.5 py-1.5 text-sm font-bold text-jb-100">
                <span className="relative flex size-2.5" aria-hidden>
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-jb-500 opacity-70 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-jb-500" />
                </span>
                SOS Equipamento · entrada rápida
              </p>

              <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                O equipamento parou? <span className="text-jb-400">Comece por aqui.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-graf-300 sm:text-lg">
                Em poucos toques você registra a parada, identifica o aparelho, envia evidências e
                abre um chamado técnico. Sem promessas artificiais de prazo: o protocolo registra a
                ocorrência e a equipe combina os próximos passos com a clínica.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <SosAbrirChamado
                  urgente
                  className="foco-jb inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-jb-600 px-5 text-base font-extrabold text-white shadow-xl shadow-jb-950/30 transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-jb-500 hover:shadow-2xl motion-reduce:transition-none"
                >
                  <Siren className="size-5" aria-hidden />
                  Meu equipamento parou
                  <ArrowRight className="size-4" aria-hidden />
                </SosAbrirChamado>

                {whatsapp ? (
                  <LinkBotao href={whatsapp} variante="secundario" tamanho="lg">
                    <MessageCircle className="size-4" aria-hidden />
                    Falar com a JB
                  </LinkBotao>
                ) : null}
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-graf-400">
                Ainda funciona, mas precisa de avaliação?{" "}
                <Link
                  href="/assistencia-tecnica/solicitar"
                  className="font-bold text-white underline underline-offset-4 hover:text-jb-300"
                >
                  Abra um chamado normal
                </Link>
                .
              </p>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-graf-700 bg-graf-900/90 p-2 shadow-2xl shadow-black/25 backdrop-blur">
                <div className="rounded-[1.15rem] border border-graf-700 bg-graf-950/80 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-jb-400">
                        protocolo de triagem
                      </p>
                      <p className="mt-2 text-xl font-extrabold text-white">Parada operacional</p>
                    </div>
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-jb-500/30 bg-jb-500/10 text-jb-400">
                      <Wrench className="size-5" aria-hidden />
                    </span>
                  </div>

                  <ol className="mt-7 space-y-3">
                    {PASSOS.map((passo, indice) => (
                      <li
                        key={passo.titulo}
                        className="sos-passo flex gap-3 rounded-2xl border border-graf-700 bg-graf-900/80 p-4"
                        style={{ "--sos-delay": `${indice * 90}ms` } as React.CSSProperties}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-jb-400">
                          <passo.icone className="size-4.5" aria-hidden />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold text-white">{passo.titulo}</p>
                          <p className="mt-1 text-sm leading-relaxed text-graf-400">{passo.texto}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container-jb py-12 lg:py-16">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:gap-10">
          <div className="rounded-3xl border border-graf-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-jb-50 text-jb-700">
                <ShieldAlert className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.08em] text-jb-700">Antes do chamado</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-graf-950">
                  Segurança primeiro. Diagnóstico depois.
                </h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 text-sm leading-relaxed text-graf-600 sm:grid-cols-2">
              <p className="rounded-2xl bg-graf-50 p-4">
                Se houver fumaça, cheiro de queimado, aquecimento anormal, choque, vazamento ou
                comportamento imprevisível, interrompa o uso e mantenha o equipamento fora do
                atendimento até orientação técnica.
              </p>
              <p className="rounded-2xl bg-graf-50 p-4">
                Não abra carenagens nem tente reparar equipamento energizado, pressurizado ou com
                partes internas expostas. Fotografe apenas o exterior, a etiqueta e o defeito que
                consiga registrar com segurança.
              </p>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
              <CircleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden />
              <p>
                <strong>Este canal é para equipamento.</strong> Se existir uma emergência clínica ou
                risco imediato para uma pessoa, siga o protocolo assistencial da clínica e procure o
                serviço de emergência adequado.
              </p>
            </div>
          </div>

          <aside className="rounded-3xl border border-graf-200 bg-graf-50 p-6 sm:p-8">
            <p className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-graf-500">
              JB · assistência técnica
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-graf-950">
              O chamado não some depois do conserto.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-graf-600">
              O atendimento fica ligado ao equipamento: protocolo, visita, ordem de serviço,
              documentos, peças registradas e histórico técnico podem continuar no prontuário da
              clínica.
            </p>

            <div className="mt-6 space-y-3">
              <SosAbrirChamado
                urgente
                className="foco-jb inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-jb-600 px-4 text-sm font-extrabold text-white transition-colors hover:bg-jb-700"
              >
                Abrir SOS técnico
                <ArrowRight className="size-4" aria-hidden />
              </SosAbrirChamado>
              <Link
                href="/assistencia-tecnica"
                className="foco-jb inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-graf-300 bg-white px-4 text-sm font-bold text-graf-800 transition-colors hover:bg-graf-100"
              >
                Conhecer toda a assistência JB
              </Link>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-graf-500">
              Atendimento em {s.endereco_cidade} e região · {s.horario}
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}
