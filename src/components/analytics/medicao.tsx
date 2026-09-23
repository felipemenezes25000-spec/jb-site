"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
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
import { localizacaoParaMedicao, origemDaVisita, registrarOrigem } from "@/lib/analytics/origem";
import { normalizarRota } from "@/lib/analytics/taxonomia";
import { Botao } from "@/components/ui/button";

/* ============================================================================
   Medição: carregadores, consentimento, PageView e Core Web Vitals

   Três destinos possíveis: Google Analytics (uso do site), Google Ads e pixel
   da Meta (qual anúncio trouxe a conversa no WhatsApp).

   Regras:

   1. **O script só entra depois do "sim".** Sem aceite, Google e Meta nem são
      carregados.
   2. **Nada de HTML arbitrário.** O painel guarda apenas identificadores
      validados e este componente monta os scripts.
   3. **Sem destino configurado, nada acontece.** Nem aviso de consentimento.
   4. **A origem da visita é guardada antes da resposta.** A UTM pode sumir da
      URL depois da navegação; guardar em sessionStorage não envia nada.
   5. **PageView é explícito.** GA4 usa `send_page_view:false`, e o pixel da Meta
      não deve depender de heurística de histórico. A rota atual é emitida na
      primeira página depois do consentimento e em cada navegação do App Router.
      Query string não é enviada no PageView: evita que parâmetro arbitrário da
      URL vire dado de analytics. A exceção é a campanha — UTMs limpas e o
      click-id do Google, por lista de permissão — no primeiro PageView, sem a
      qual o GA4 atribuiria toda visita paga a "direto".
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
          {ga4 || metaPixel ? <RastreamentoDePaginas ga4={ga4} metaPixel={metaPixel} /> : null}
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
 * grupo padrão, que é o do Analytics. A conversão do WhatsApp é enviada com
 * `send_to` explícito em `@/lib/analytics/anuncios`.
 *
 * `send_page_view:false` é deliberado: `RastreamentoDePaginas` abaixo mede a
 * primeira rota e as navegações SPA sem duplicar a chegada.
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
 * Código-base do pixel da Meta.
 *
 * Ele inicializa o destino, mas não dispara `PageView` aqui. A primeira visita
 * e as navegações internas passam pelo mesmo `RastreamentoDePaginas`, evitando
 * um PageView inicial duplicado e outro modelo de contagem para SPA.
 *
 * Duas chaves antes do `init`, e as duas pelo mesmo motivo — o pixel só envia
 * o que este código manda:
 *
 *  - `disablePushState`: sem ela o fbevents escuta o `history.pushState` do
 *    App Router e dispara um PageView próprio a cada navegação, que somado ao
 *    explícito contaria cada página duas vezes;
 *  - `autoConfig` desligado: a configuração automática coleta texto de botão
 *    e metadado da página por conta própria. O contrato do site é que só sai
 *    evento com campo controlado — nunca texto que a pessoa vê ou digita.
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
        fbq.disablePushState = true;
        fbq('set', 'autoConfig', false, ${JSON.stringify(id)});
        fbq('init', ${JSON.stringify(id)});
      `}
    </Script>
  );
}

/* -------------------------------------------------------------- PageView */

/**
 * A campanha acompanha só o primeiro PageView medido neste documento — o que
 * abre a sessão no GA4. Módulo, e não `useRef`: a regra vale para a vida da
 * aba, mesmo que o componente remonte (aceitar, recusar e aceitar de novo).
 */
let campanhaJaMedida = false;

function rotaPrivadaDaMedicao(pathname: string) {
  return pathname.startsWith("/avaliar/");
}

/**
 * PageView da chegada e de cada navegação do App Router.
 *
 * Os scripts de terceiro carregam de forma assíncrona. A rota pode mudar antes
 * de `gtag`/`fbq` existirem, então esta peça tenta por uma janela curta e para
 * assim que cada destino recebeu aquela rota. `useRef` impede repetição do
 * mesmo caminho em remontagem de efeito; navegar para outra página e voltar
 * conta novamente, como uma nova visualização deve contar.
 */
function RastreamentoDePaginas({
  ga4,
  metaPixel,
}: {
  ga4: string | null;
  metaPixel: string | null;
}) {
  const pathname = usePathname();
  const ultimoGoogle = useRef<string | null>(null);
  const ultimoMeta = useRef<string | null>(null);

  useEffect(() => {
    /* O convite de avaliação carrega um token pessoal no caminho. Não é
       tráfego de campanha, e o pixel da Meta anexaria a URL inteira ao evento. */
    if (rotaPrivadaDaMedicao(pathname)) return;

    let cancelado = false;
    let temporizador = 0;
    let tentativas = 0;

    const rota = normalizarRota(pathname);

    const emitir = () => {
      if (cancelado) return;

      if (ga4 && ultimoGoogle.current !== pathname && typeof window.gtag === "function") {
        const primeira = !campanhaJaMedida;
        window.gtag("event", "page_view", {
          page_path: rota,
          page_location: localizacaoParaMedicao(
            window.location.origin,
            rota,
            window.location.search,
            primeira ? origemDaVisita() : null,
            primeira,
          ),
          page_title: document.title,
        });
        campanhaJaMedida = true;
        ultimoGoogle.current = pathname;
      }

      if (metaPixel && ultimoMeta.current !== pathname && typeof window.fbq === "function") {
        window.fbq("track", "PageView");
        ultimoMeta.current = pathname;
      }

      const faltaGoogle = Boolean(ga4 && ultimoGoogle.current !== pathname);
      const faltaMeta = Boolean(metaPixel && ultimoMeta.current !== pathname);
      if (!faltaGoogle && !faltaMeta) return;

      tentativas += 1;
      if (tentativas < 30) temporizador = window.setTimeout(emitir, 100);
    };

    /* Um frame dá ao `<head>` da rota nova tempo para atualizar o título antes
       de o PageView capturar `document.title`. */
    const quadro = window.requestAnimationFrame(emitir);

    return () => {
      cancelado = true;
      window.cancelAnimationFrame(quadro);
      window.clearTimeout(temporizador);
    };
  }, [pathname, ga4, metaPixel]);

  return null;
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
    if (metrica.name !== "LCP" && metrica.name !== "INP" && metrica.name !== "CLS") return;

    medir(
      "web_vital",
      {
        rota: normalizarRota(window.location.pathname),
        resultado: metrica.name,
        quantidade: Math.round(metrica.value * 1000),
        dispositivo: window.matchMedia("(pointer: coarse)").matches ? "toque" : "mouse",
      },
      { referencia: `${metrica.name}:${metrica.id}` },
    );
  });

  return null;
}

/* ------------------------------------------------------------------- aviso */

function AvisoDeMedicao({ destinos }: { destinos: string[] }) {
  const quem = destinos.join(" e ");

  /* Cartão flutuante acima da área segura do aparelho, com recusar e aceitar
     do mesmo tamanho e peso. O desenho mora em `.jb-aviso-medicao`
     (`app/(site)/acabamento.css`); enquanto ele está aberto, a barra do
     WhatsApp do celular recolhe — dois painéis fixos no pé da tela não se
     sobrepõem. */
  return (
    <div
      role="region"
      aria-label="Medição de uso do site"
      className="jb-aviso-medicao fixed z-90"
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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
          {(
            [
              ["recusado", "Não medir"],
              ["aceito", "Pode medir"],
            ] as const
          ).map(([escolha, rotulo]) => (
            <Botao
              key={escolha}
              variante="secundario"
              tamanho="sm"
              onClick={() => gravarConsentimento(escolha)}
              className="jb-aviso-medicao-botao"
            >
              {rotulo}
            </Botao>
          ))}
        </div>
      </div>
    </div>
  );
}
