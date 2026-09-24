import type { Metadata } from "next";
import { BadgeCheck, Clock3, ShieldCheck, Wrench } from "lucide-react";

import { ChamadaFinal } from "@/components/site/chamada-final";
import { ClinicaOuBancada } from "@/components/site/clinica-ou-bancada";
import { ComoFunciona } from "@/components/site/como-funciona";
import { DiagnosticoWhatsapp } from "@/components/site/diagnostico-whatsapp";
import { Duvidas } from "@/components/site/duvidas";
import { FaixaAutorizada } from "@/components/site/faixa-autorizada";
import { FotoAbertura } from "@/components/site/foto-abertura";
import { GradeEquipamentos } from "@/components/site/grade-equipamentos";
import { InfraestruturaClinica, PERGUNTA_DE_INFRAESTRUTURA } from "@/components/site/infraestrutura-clinica";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
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
   Tudo leva ao WhatsApp: Jeferson ou Jackson na abertura, o diagnóstico, o
   portfólio de equipamentos, a infraestrutura (com visita antes do
   orçamento), o simulador, a chamada final, o cabeçalho grudado no topo e a
   barra do pé do celular.

   Nada aqui consulta produto, preço ou estoque. Os dados são configurações
   públicas, cacheadas e derrubadas pela etiqueta quando alguém salva o painel.
   ============================================================================ */

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

        <div className="container-jb relative grid gap-8 pb-12 pt-7 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-[minmax(0,1.03fr)_minmax(0,34rem)] lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-14 lg:gap-y-8 lg:pb-16 lg:pt-12">
          <div className="flex min-w-0 flex-col lg:pt-6">
            <StatusAtendimento
              horario={s.horario}
              neutro={`Assistência técnica odontológica em ${s.endereco_cidade}`}
              className="entrada self-start"
            />

            <div className="jb-hero-copy">
              {/* Título fixo, sem palavra girando: quem chega do anúncio lê a
                  promessa inteira de primeira, e nada se mexe em loop acima da
                  dobra. Os equipamentos aparecem logo abaixo, na triagem. */}
              <h1
                id="abertura-titulo"
                className="jb-hero-title texto-forte entrada mt-5 [animation-delay:70ms]"
              >
                <span className="block">Equipamento parou?</span>{" "}
                <span className="block text-jb-600">A JB assume daqui.</span>
              </h1>

              <p className="jb-hero-subtexto texto-guia entrada mt-5 max-w-xl text-graf-600 [animation-delay:140ms]">
                Diga o equipamento e o problema em 3 toques. A mensagem fica pronta para a equipe
                técnica no WhatsApp — você revisa antes de enviar.
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
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-jb-700">Triagem guiada</p>
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

      <FaixaAutorizada desde={s.empresa_desde} cidade={s.endereco_cidade} />

      <GradeEquipamentos contatos={contatos} />
      <InfraestruturaClinica contatos={contatos} />

      {/* ------------------------------------------ quanto custa parar */}
      <section aria-labelledby="parada-titulo" className="jb-secao-parada bg-surface-muted py-16 md:py-24">
        <div className="container-jb grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-16">
          <div>
            <p className="sobretitulo jb-revela">Cenário de impacto</p>
            <h2 id="parada-titulo" className="text-section texto-forte jb-revela mt-3 max-w-xl">
              Uma parada também pesa <span className="text-jb-600">na agenda.</span>
            </h2>
            <p
              className="texto-guia jb-revela mt-5 max-w-lg text-graf-600"
              style={{ "--i": 1 } as React.CSSProperties}
            >
              Com os números da sua clínica, veja um cenário de consultas potencialmente afetadas.
              É uma estimativa com os valores que você informa — não uma previsão, nem prazo de
              conserto.
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
      <Duvidas
        cidade={s.endereco_cidade}
        horario={s.horario}
        complementares={[PERGUNTA_DE_INFRAESTRUTURA]}
      />
      <ChamadaFinal
        contatos={contatos}
        horario={s.horario}
        cidade={s.endereco_cidade}
      />
    </>
  );
}
