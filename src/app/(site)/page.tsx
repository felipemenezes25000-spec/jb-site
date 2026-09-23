import type { Metadata } from "next";
import { BadgeCheck, Clock3, ShieldCheck, Wrench } from "lucide-react";

import { ChamadaFinal } from "@/components/site/chamada-final";
import { ClinicaOuBancada } from "@/components/site/clinica-ou-bancada";
import { ComoFunciona } from "@/components/site/como-funciona";
import { DiagnosticoWhatsapp } from "@/components/site/diagnostico-whatsapp";
import { Duvidas } from "@/components/site/duvidas";
import { FaixaAutorizada } from "@/components/site/faixa-autorizada";
import { FaixaEquipamentos } from "@/components/site/faixa-equipamentos";
import { FotoAbertura } from "@/components/site/foto-abertura";
import { GradeEquipamentos } from "@/components/site/grade-equipamentos";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import { PalavraGiratoria } from "@/components/site/palavra-giratoria";
import { PorQueJb } from "@/components/site/por-que-jb";
import { SimuladorParada } from "@/components/site/simulador-parada";
import { StatusAtendimento } from "@/components/site/status-atendimento";
import { contatosWhatsapp } from "@/lib/contatos-whatsapp";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { JsonLd, localNegocioJsonLd, metadataDePagina, organizacaoJsonLd } from "@/lib/seo";
import { anosDesde, configuracoesPublicas } from "@/lib/site-publico";

/* ============================================================================
   Home: assistência técnica, e só isso

   Feita para quem chega de anúncio, no celular, com um equipamento parado.
   Tudo leva ao WhatsApp: Jeferson ou Jackson na abertura, o diagnóstico, os
   blocos de equipamento, o simulador, a chamada final, o cabeçalho grudado no
   topo e a barra do pé do celular.

   Nada aqui consulta produto, preço ou estoque. Os dados são configurações
   públicas, cacheadas e derrubadas pela etiqueta quando alguém salva o painel.
   ============================================================================ */

/** O que gira no título. "Equipamento" fecha o ciclo para quem tem outra máquina. */
const GIRO = ["Autoclave", "Compressor", "Cadeira", "Seladora", "Destilador", "Equipamento"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const s = await configuracoesPublicas();
  return metadataDePagina({
    titulo: `Assistência técnica odontológica em ${s.endereco_cidade}`,
    descricao: `Autoclave, compressor, cadeira ou outro equipamento parado? Assistência técnica de todas as marcas em ${s.endereco_cidade} e região. Chame a equipe técnica da JB no WhatsApp.`,
    caminho: "/",
  });
}

export default async function HomePage() {
  const s = await configuracoesPublicas();
  const anos = await anosDesde(s.empresa_desde);
  const contatos = contatosWhatsapp(s);

  return (
    <>
      <JsonLd dados={[organizacaoJsonLd(s), localNegocioJsonLd(s)]} />

      {/* ------------------------------------------------------- abertura */}
      <section
        aria-labelledby="abertura-titulo"
        className="jb-hero-premium relative isolate overflow-clip border-b border-graf-200 bg-white"
      >
        <span aria-hidden className="jb-hero-malha pointer-events-none absolute inset-0" />
        <span
          aria-hidden
          className="jb-flutua pointer-events-none absolute -right-40 -top-40 size-[38rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.13),transparent)]"
        />
        <span
          aria-hidden
          className="jb-flutua-lento pointer-events-none absolute -bottom-56 -left-40 size-[34rem] rounded-full bg-[radial-gradient(closest-side,rgb(26_28_30/0.055),transparent)]"
        />

        <div className="container-jb relative grid gap-8 pb-12 pt-7 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-[minmax(0,1.03fr)_minmax(0,34rem)] lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-14 lg:gap-y-8 lg:pb-16 lg:pt-12">
          <div className="flex min-w-0 flex-col lg:pt-6">
            <StatusAtendimento
              horario={s.horario}
              neutro={`Assistência técnica odontológica em ${s.endereco_cidade}`}
              className="entrada self-start"
            />

            <div className="jb-hero-copy">
              <h1
                id="abertura-titulo"
                className="jb-hero-title texto-forte entrada mt-5 [animation-delay:70ms]"
              >
                <span className="sr-only">Equipamento parou? A JB assume daqui.</span>
                <span aria-hidden className="block">
                  <PalavraGiratoria palavras={GIRO} />
                  <span className="block">parou?</span>
                  <span className="block text-jb-600">A JB assume daqui.</span>
                </span>
              </h1>

              <p className="jb-hero-subtexto texto-guia entrada mt-5 max-w-xl text-graf-600 [animation-delay:140ms]">
                Diga o equipamento e o problema em 3 toques. A mensagem chega pronta para a nossa
                equipe técnica no WhatsApp — sem formulário longo e sem enrolação.
              </p>
            </div>

            <ul
              className="jb-hero-provas entrada mt-6 grid gap-2 [animation-delay:175ms] sm:grid-cols-3"
              aria-label="Compromissos da assistência JB"
            >
              <li>
                <BadgeCheck className="size-4" aria-hidden />
                <span>Todas as marcas</span>
              </li>
              <li>
                <ShieldCheck className="size-4" aria-hidden />
                <span>Orçamento antes da troca</span>
              </li>
              <li>
                <Clock3 className="size-4" aria-hidden />
                <span>Atendimento em horário comercial</span>
              </li>
            </ul>

            <div className="jb-hero-cta entrada mt-7 [animation-delay:210ms]">
              <OpcoesWhatsapp
                contatos={contatos}
                mensagem={MENSAGEM_PADRAO}
                posicao="abertura"
              />
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-graf-600 sm:text-sm">
                <Wrench className="size-4 shrink-0 text-jb-600" aria-hidden />
                Atendimento direto com Jeferson ou Jackson. Você escolhe com quem falar.
              </p>
            </div>
          </div>

          <div className="jb-diagnostico-stage entrada lg:sticky lg:top-28 lg:row-span-2 [animation-delay:160ms]">
            <div className="jb-diagnostico-legenda mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-700">Triagem inteligente</p>
                <p className="mt-1 text-sm font-semibold text-graf-700">Menos digitação. Mais contexto para o técnico.</p>
              </div>
              <span className="hidden rounded-full border border-graf-200 bg-white/85 px-3 py-1 text-xs font-bold text-graf-700 shadow-card sm:inline-flex">
                3 toques
              </span>
            </div>
            <DiagnosticoWhatsapp contatos={contatos} />
          </div>

          <div className="jb-hero-foto entrada lg:col-start-1 lg:row-start-2 [animation-delay:260ms]">
            <FotoAbertura />
          </div>
        </div>
      </section>

      <FaixaEquipamentos />

      <FaixaAutorizada desde={s.empresa_desde} cidade={s.endereco_cidade} />

      <GradeEquipamentos contatos={contatos} />

      {/* ------------------------------------------ quanto custa parar */}
      <section aria-labelledby="parada-titulo" className="jb-secao-parada bg-surface-muted py-16 md:py-24">
        <div className="container-jb grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-16">
          <div>
            <p className="sobretitulo jb-revela">O custo invisível da parada</p>
            <h2 id="parada-titulo" className="text-section texto-forte jb-revela mt-3 max-w-xl">
              Equipamento parado não é só conserto. <span className="text-jb-600">É agenda perdida.</span>
            </h2>
            <p
              className="texto-guia jb-revela mt-5 max-w-lg text-graf-600"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Mexa nos números da sua clínica e veja quantas consultas ficam em risco enquanto o
              equipamento espera. Quanto antes você chama, menor esse número.
            </p>
          </div>
          <div className="jb-revela" style={{ "--i": 1 } as React.CSSProperties}>
            <SimuladorParada contatos={contatos} />
          </div>
        </div>
      </section>

      <ComoFunciona contatos={contatos} />
      <ClinicaOuBancada cidade={s.endereco_cidade} />
      <PorQueJb anos={anos} desde={s.empresa_desde} cidade={s.endereco_cidade} />
      <Duvidas cidade={s.endereco_cidade} horario={s.horario} />
      <ChamadaFinal
        contatos={contatos}
        horario={s.horario}
        cidade={s.endereco_cidade}
      />
    </>
  );
}
