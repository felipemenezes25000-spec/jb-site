import type { Metadata } from "next";
import { Phone } from "lucide-react";

import { BotaoWhatsapp } from "@/components/site/botao-whatsapp";
import { ChamadaFinal } from "@/components/site/chamada-final";
import { ClinicaOuBancada } from "@/components/site/clinica-ou-bancada";
import { ComoFunciona } from "@/components/site/como-funciona";
import { DiagnosticoWhatsapp } from "@/components/site/diagnostico-whatsapp";
import { Duvidas } from "@/components/site/duvidas";
import { FaixaAutorizada } from "@/components/site/faixa-autorizada";
import { FaixaEquipamentos } from "@/components/site/faixa-equipamentos";
import { FotoAbertura } from "@/components/site/foto-abertura";
import { GradeEquipamentos } from "@/components/site/grade-equipamentos";
import { NumerosWhatsapp } from "@/components/site/numeros-whatsapp";
import { PalavraGiratoria } from "@/components/site/palavra-giratoria";
import { PorQueJb } from "@/components/site/por-que-jb";
import { SimuladorParada } from "@/components/site/simulador-parada";
import { StatusAtendimento } from "@/components/site/status-atendimento";
import { classesBotao } from "@/components/ui/button";
import { MENSAGEM_PADRAO } from "@/lib/diagnostico";
import { telHref } from "@/lib/format";
import { JsonLd, localNegocioJsonLd, metadataDePagina, organizacaoJsonLd } from "@/lib/seo";
import { anosDesde, configuracoesPublicas } from "@/lib/site-publico";

/* ============================================================================
   Home: assistência técnica, e só isso

   Feita para quem chega de anúncio, no celular, com um equipamento parado.
   Tudo leva ao WhatsApp: o botão da abertura, o diagnóstico em 3 toques, os
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
  /* Só o celular: é o mesmo número do WhatsApp, e o fixo saiu do site. */
  const ligar = telHref(s.whatsapp);

  return (
    <>
      <JsonLd dados={[organizacaoJsonLd(s), localNegocioJsonLd(s)]} />

      {/* ------------------------------------------------------- abertura */}
      <section
        aria-labelledby="abertura-titulo"
        className="relative overflow-hidden border-b border-graf-200 bg-white"
      >
        <span
          aria-hidden
          className="jb-flutua pointer-events-none absolute -right-40 -top-40 size-[36rem] rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.11),transparent)]"
        />
        <span
          aria-hidden
          className="jb-flutua-lento pointer-events-none absolute -bottom-56 -left-40 size-[32rem] rounded-full bg-[radial-gradient(closest-side,rgb(26_28_30/0.05),transparent)]"
        />

        <div className="container-jb relative grid gap-10 pb-12 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,35rem)] lg:items-center lg:gap-14 lg:pb-16 lg:pt-12">
          {/* No celular a foto sobe para antes do título (`order-first`): quem
              chega do anúncio vê primeiro alguém consertando uma autoclave. */}
          <div className="flex flex-col">
            <StatusAtendimento
              horario={s.horario}
              neutro={`Assistência técnica odontológica em ${s.endereco_cidade}`}
              className="entrada self-start"
            />

            <h1 id="abertura-titulo" className="text-hero texto-forte entrada mt-5 [animation-delay:70ms]">
              <span className="sr-only">Equipamento parou? A JB assume daqui.</span>
              <span aria-hidden className="block">
                <PalavraGiratoria palavras={GIRO} />
                <span className="block">parou?</span>
                <span className="block text-jb-600">A JB assume daqui.</span>
              </span>
            </h1>

            <p className="texto-guia entrada mt-5 max-w-xl text-graf-600 [animation-delay:140ms]">
              Diga o equipamento e o problema em 3 toques. A mensagem chega pronta para a nossa
              equipe técnica no WhatsApp.
            </p>

            <div className="entrada mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:210ms]">
              <BotaoWhatsapp
                numero={s.whatsapp}
                mensagem={MENSAGEM_PADRAO}
                posicao="abertura"
                tamanho="lg"
                className="w-full sm:w-auto"
              />
              {ligar ? (
                <a href={ligar} className={classesBotao("secundario", "lg", "w-full whitespace-nowrap sm:w-auto")}>
                  <Phone className="size-4" aria-hidden />
                  Ligar agora
                </a>
              ) : null}
            </div>

            <NumerosWhatsapp
              numeros={[s.whatsapp, s.whatsapp_alternativo]}
              mensagem={MENSAGEM_PADRAO}
              posicao="abertura-numero"
              className="entrada mt-4 [animation-delay:240ms]"
            />

            <div className="entrada order-first mb-6 sm:mb-8 lg:order-none lg:mb-0 lg:mt-10 lg:[animation-delay:260ms]">
              <FotoAbertura />
            </div>
          </div>

          <div className="entrada [animation-delay:160ms]">
            <DiagnosticoWhatsapp numero={s.whatsapp} />
          </div>
        </div>
      </section>

      <FaixaEquipamentos />

      <FaixaAutorizada desde={s.empresa_desde} cidade={s.endereco_cidade} />

      <GradeEquipamentos whatsapp={s.whatsapp} />

      {/* ------------------------------------------ quanto custa parar */}
      <section aria-labelledby="parada-titulo" className="bg-surface-muted py-16 md:py-24">
        <div className="container-jb grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-center lg:gap-16">
          <div>
            <h2 id="parada-titulo" className="text-section texto-forte jb-revela max-w-xl">
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
            <SimuladorParada whatsapp={s.whatsapp} />
          </div>
        </div>
      </section>

      <ComoFunciona whatsapp={s.whatsapp} />
      <ClinicaOuBancada cidade={s.endereco_cidade} />
      <PorQueJb anos={anos} desde={s.empresa_desde} cidade={s.endereco_cidade} />
      <Duvidas cidade={s.endereco_cidade} horario={s.horario} />
      <ChamadaFinal
        whatsapp={s.whatsapp}
        whatsappAlternativo={s.whatsapp_alternativo}
        telefone={s.whatsapp}
        horario={s.horario}
        cidade={s.endereco_cidade}
      />
    </>
  );
}
