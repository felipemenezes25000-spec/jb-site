"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { useReportWebVitals } from "next/web-vitals";

import {
  gravarConsentimento,
  lerConsentimento,
  ouvirConsentimento,
  type EstadoDeConsentimento,
} from "@/lib/analytics/consentimento";
import { medir } from "@/lib/analytics/cliente";
import {
  aplicarConsentimentoDosAnuncios,
  configurarAnuncios,
  ouvirCliquesNoWhatsapp,
} from "@/lib/analytics/anuncios";
import { algumDestino, nomesDosDestinos, type DestinosDeMedicao } from "@/lib/analytics/destinos";
import { registrarOrigem } from "@/lib/analytics/origem";
import { normalizarRota } from "@/lib/analytics/taxonomia";
import { Botao } from "@/components/ui/button";

/* ============================================================================
   Medição: os carregadores, o aviso e as Core Web Vitals

   Três destinos possíveis: Google Analytics (uso do site), Google Ads e pixel
   da Meta (qual anúncio trouxe a conversa no WhatsApp). Quatro decisões que
   valem para os três:

   1. **O script só entra depois do "sim".** Não é carregado escondido nem
      "sem cookies até aceitar" — ele simplesmente não existe na página de quem
      não aceitou. É a diferença entre respeitar a recusa e registrá-la.

   2. **Nada de HTML arbitrário.** O painel guarda só identificadores
      (`G-…`, `AW-…`, o número do pixel), validados ao salvar e de novo em
      `destinosDeMedicao`, e este componente monta os scripts. Um campo que
      aceitasse o "código do pixel" colado seria injeção de script com passo
      administrativo no meio.

   3. **Sem destino configurado, nada acontece.** Nem o aviso aparece:
      perguntar sobre medição a quem não tem medição configurada é pedir uma
      decisão sem consequência.

   4. **A origem da visita é guardada antes da resposta.** A UTM do anúncio só
      existe na URL de chegada; se a pessoa aceitar dois cliques depois, ela
      já sumiu. Guardar no `sessionStorage` não envia nada: quem envia é
      `medir`, e ele pergunta pelo consentimento.
   ============================================================================ */

export function Medicao({ destinos }: { destinos: DestinosDeMedicao }) {
  const { ga4, googleAds, rotuloWhatsapp, metaPixel } = destinos;

  const [estado, setEstado] = useState<EstadoDeConsentimento>("nao-decidido");
  const [montado, setMontado] = useState(false);

  /* A leitura acontece depois da montagem: `localStorage` não existe no
     servidor, e ler no primeiro render faria o HTML do servidor divergir do
     cliente. Até lá, o padrão é não medir. */
  useEffect(() => {
    setMontado(true);
    registrarOrigem();
    setEstado(lerConsentimento());
    const pararConsentimento = ouvirConsentimento(setEstado);
    const pararCliques = ouvirCliquesNoWhatsapp();
    return () => {
      pararConsentimento();
      pararCliques();
    };
  }, []);

  useEffect(() => {
    configurarAnuncios({ ga4, googleAds, rotuloWhatsapp, metaPixel });
  }, [ga4, googleAds, rotuloWhatsapp, metaPixel]);

  /* Quem aceitou e depois recusou já tem os scripts na página. Eles param
     pelo consentimento deles próprios; no carregamento seguinte nem vêm. */
  useEffect(() => {
    if (montado) aplicarConsentimentoDosAnuncios(estado === "aceito");
  }, [estado, montado]);

  if (!algumDestino(destinos)) return null;

  return (
    <>
      {estado === "aceito" ? (
        <>
          {ga4 || googleAds ? <ScriptDoGoogle ga4={ga4} googleAds={googleAds} /> : null}
          {metaPixel ? <PixelDaMeta id={metaPixel} /> : null}
          {ga4 ? <RelatorioDeVitals /> : null}
        </>
      ) : null}
      {montado && estado === "nao-decidido" ? (
        <AvisoDeMedicao destinos={nomesDosDestinos(destinos)} />
      ) : null}
    </>
  );
}

/**
 * O `gtag.js`, que serve ao Analytics e ao Ads com um carregador só.
 *
 * O Ads entra num grupo próprio (`anuncios`): evento sem `send_to` vai para o
 * grupo padrão, que é o do Analytics, e assim os eventos do site não viram
 * ruído na conta de anúncio. A conversão do WhatsApp é enviada com `send_to`
 * explícito (`@/lib/analytics/anuncios`) e chega de qualquer jeito.
 *
 * `afterInteractive` e não `beforeInteractive`: medir é secundário à página
 * funcionar, e um script de terceiro no caminho crítico é exatamente o que
 * piora o LCP que ele deveria ajudar a medir.
 */
function ScriptDoGoogle({ ga4, googleAds }: { ga4: string | null; googleAds: string | null }) {
  const carregador = ga4 ?? googleAds ?? "";
  const configuracoes = [
    ga4 && `gtag('config', ${JSON.stringify(ga4)}, { anonymize_ip: true, send_page_view: false });`,
    googleAds && `gtag('config', ${JSON.stringify(googleAds)}, { groups: 'anuncios' });`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <Script
        id="gtag-carregador"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(carregador)}`}
      />
      <Script id="gtag-configuracao" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          ${configuracoes}
        `}
      </Script>
    </>
  );
}

/**
 * O pixel da Meta, no código-base oficial, com o identificador já validado
 * (só dígitos). O `PageView` da chegada sai daqui; as navegações internas o
 * próprio `fbevents.js` percebe pelo histórico do navegador.
 */
function PixelDaMeta({ id }: { id: string }) {
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', ${JSON.stringify(id)});
        fbq('track', 'PageView');
      `}
    </Script>
  );
}

/* --------------------------------------------------------- Core Web Vitals */

/**
 * Envia LCP, INP e CLS reais.
 *
 * Sai daqui, e não de um pacote novo, porque `useReportWebVitals` já vem no
 * Next instalado. Os valores são medições do navegador de quem visitou — RUM,
 * não laboratório. Nenhuma meta é afirmada como atingida em lugar nenhum: o
 * que existe é a coleta, e uma média sem amostra não é resultado.
 */
function RelatorioDeVitals() {
  useReportWebVitals((metrica) => {
    /* Só as três do escopo. O Next reporta mais (FCP, TTFB); mandar tudo
       encheria o relatório de métrica que ninguém definiu meta para. */
    if (metrica.name !== "LCP" && metrica.name !== "INP" && metrica.name !== "CLS") return;

    medir(
      "home_view",
      {
        rota: normalizarRota(window.location.pathname),
        resultado: metrica.name,
        /* Valor em milésimos: CLS é fracionário e agregador só soma inteiro.
           Quem lê o relatório divide por mil. */
        quantidade: Math.round(metrica.value * 1000),
        dispositivo: window.matchMedia("(pointer: coarse)").matches ? "toque" : "mouse",
      },
      /* Uma medição por ocorrência: o `id` da métrica é estável dentro da
         navegação, então voltar para a página não duplica o número. */
      { referencia: `${metrica.name}:${metrica.id}` },
    );
  });

  return null;
}

/* ------------------------------------------------------------------- aviso */

/**
 * O aviso de medição.
 *
 * Duas ações do mesmo peso visual. "Aceitar" não é maior nem colorido, e
 * "recusar" não está escondido num link cinza — a assimetria dos dois botões é
 * a forma mais comum de arrancar um consentimento que não foi dado.
 *
 * Diz quem recebe (Google, Meta) e para quê: saber qual anúncio traz
 * conversa. Consentimento para "melhorar a experiência" não é informado.
 *
 * Não bloqueia a tela: é uma faixa no rodapé, dispensável, que não cobre
 * conteúdo nem prende o foco. Quem ignora continua navegando, e sem medição.
 * No celular o texto é curto, para a faixa não comer meia tela de quem chegou
 * do anúncio querendo chamar no WhatsApp.
 */
function AvisoDeMedicao({ destinos }: { destinos: string[] }) {
  const quem = destinos.join(" e ");

  return (
    <div
      role="region"
      aria-label="Medição de uso do site"
      className="fixed inset-x-0 bottom-0 z-90 border-t border-graf-200 bg-white/95 px-4 pt-3 shadow-pop backdrop-blur"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="container-jb flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="min-w-0 text-xs leading-relaxed text-graf-700 sm:text-sm">
          Podemos medir as visitas com {quem} para saber quais anúncios trazem conversa?{" "}
          <span className="hidden sm:inline">
            Nada do que você escreve vai junto, e o site funciona igual se você recusar.{" "}
          </span>
          <Link
            href="/privacidade"
            className="font-semibold text-graf-900 underline underline-offset-2"
          >
            Saiba mais
          </Link>
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <Botao variante="secundario" tamanho="sm" onClick={() => gravarConsentimento("recusado")}>
            Não medir
          </Botao>
          <Botao variante="secundario" tamanho="sm" onClick={() => gravarConsentimento("aceito")}>
            Pode medir
          </Botao>
        </div>
      </div>
    </div>
  );
}
