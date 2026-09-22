import type { Metadata } from "next";
import { ArrowUpRight, BadgeCheck, CalendarCheck2, FileCheck2, MapPin, Phone } from "lucide-react";

import { BotaoWhatsapp } from "@/components/site/botao-whatsapp";
import { ChamadaFinal } from "@/components/site/chamada-final";
import { ClinicaOuBancada } from "@/components/site/clinica-ou-bancada";
import { ComoFunciona } from "@/components/site/como-funciona";
import { DiagnosticoWhatsapp } from "@/components/site/diagnostico-whatsapp";
import { Duvidas } from "@/components/site/duvidas";
import { FaixaEquipamentos } from "@/components/site/faixa-equipamentos";
import { FotoAbertura } from "@/components/site/foto-abertura";
import { GradeEquipamentos } from "@/components/site/grade-equipamentos";
import { PalavraGiratoria } from "@/components/site/palavra-giratoria";
import { PorQueJb } from "@/components/site/por-que-jb";
import { LISTA_EVOXX } from "@/components/site/rodape-site";
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
    descricao: `Autoclave, compressor, cadeira ou outro equipamento parado? Assistência técnica autorizada EVOXX em ${s.endereco_cidade} e região. Chame a equipe técnica da JB no WhatsApp.`,
    caminho: "/",
  });
}

export default async function HomePage() {
  const s = await configuracoesPublicas();
  const anos = await anosDesde(s.empresa_desde);
  /* Só o celular: é o mesmo número do WhatsApp, e o fixo saiu do site. */
  const ligar = telHref(s.whatsapp);

  const provas = [
    {
      icone: CalendarCheck2,
      titulo: `Na bancada desde ${s.empresa_desde}`,
      texto: "Anos consertando equipamento de clínica odontológica.",
    },
    {
      icone: FileCheck2,
      titulo: "Orçamento antes da troca",
      texto: "Nenhuma peça é trocada sem a sua aprovação.",
    },
    {
      icone: MapPin,
      titulo: "Na clínica ou na bancada",
      texto: `Atendimento em ${s.endereco_cidade} e região.`,
    },
  ];

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
          <div>
            <StatusAtendimento
              horario={s.horario}
              neutro={`Assistência técnica odontológica em ${s.endereco_cidade}`}
              className="entrada"
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

            <div className="entrada [animation-delay:260ms]">
              <FotoAbertura />
            </div>
          </div>

          <div className="entrada [animation-delay:160ms]">
            <DiagnosticoWhatsapp numero={s.whatsapp} />
          </div>
        </div>
      </section>

      <FaixaEquipamentos />

      {/* ---------------------------------------------- autorizada EVOXX */}
      <section
        id="autorizada"
        aria-labelledby="autorizada-titulo"
        className="scroll-mt-20 border-b border-graf-200 bg-surface-muted"
      >
        <div className="container-jb grid gap-10 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)] lg:items-center lg:gap-14 lg:py-14">
          <div className="jb-revela flex gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-jb-500 text-white shadow-card">
              <BadgeCheck className="size-6" aria-hidden />
            </span>
            <div>
              <h2 id="autorizada-titulo" className="text-title texto-forte">
                Assistência técnica autorizada EVOXX
              </h2>
              <p className="mt-2 text-corpo leading-relaxed text-graf-600">
                A JB está na lista oficial do fabricante. Não é só dizer: dá para conferir.
              </p>
              <a
                href={LISTA_EVOXX}
                target="_blank"
                rel="noopener noreferrer"
                className="foco-jb mt-3 inline-flex min-h-11 items-center gap-1 rounded text-sm font-bold text-jb-700 underline-offset-4 hover:underline"
              >
                Conferir no site da EVOXX
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            </div>
          </div>

          <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8">
            {provas.map((prova, indice) => (
              <li
                key={prova.titulo}
                className="jb-revela border-t-2 border-jb-500 pt-4"
                style={{ "--i": indice + 1 } as React.CSSProperties}
              >
                <prova.icone className="size-5 text-jb-600" aria-hidden />
                <p className="mt-3 text-corpo font-extrabold text-graf-950">{prova.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-graf-600">{prova.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
        telefone={s.whatsapp}
        horario={s.horario}
        cidade={s.endereco_cidade}
      />
    </>
  );
}
