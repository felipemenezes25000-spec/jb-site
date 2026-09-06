"use client";

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
import { normalizarRota } from "@/lib/analytics/taxonomia";
import { Botao } from "@/components/ui/button";

/* ============================================================================
   Medição: o carregador, o aviso e as Core Web Vitals

   Três decisões que valem para o arquivo:

   1. **O script só entra depois do "sim".** Não é carregado escondido nem
      "sem cookies até aceitar" — ele simplesmente não existe na página de quem
      não aceitou. É a diferença entre respeitar a recusa e registrá-la.

   2. **Nada de HTML arbitrário.** O painel guarda um identificador do GA4
      (`G-XXXXXXX`), validado no cadastro, e este componente monta o script.
      Um campo que aceitasse marcação seria injeção de script com passo
      administrativo no meio.

   3. **Sem identificador configurado, nada acontece.** Nem o aviso aparece:
      perguntar sobre medição a quem não tem medição configurada é pedir uma
      decisão sem consequência.
   ============================================================================ */

/** Só o formato do GA4. O mesmo padrão que o painel exige ao salvar. */
const GA4_VALIDO = /^G-[A-Z0-9]{6,14}$/i;

export function Medicao({ identificador }: { identificador: string }) {
  const id = identificador.trim();
  const configurado = GA4_VALIDO.test(id);

  const [estado, setEstado] = useState<EstadoDeConsentimento>("nao-decidido");
  const [montado, setMontado] = useState(false);

  /* A leitura acontece depois da montagem: `localStorage` não existe no
     servidor, e ler no primeiro render faria o HTML do servidor divergir do
     cliente. Até lá, o padrão é não medir. */
  useEffect(() => {
    setMontado(true);
    setEstado(lerConsentimento());
    return ouvirConsentimento(setEstado);
  }, []);

  if (!configurado) return null;

  return (
    <>
      {estado === "aceito" ? <ScriptDoGa4 id={id} /> : null}
      {montado && estado === "nao-decidido" ? <AvisoDeMedicao /> : null}
    </>
  );
}

/**
 * O GA4, montado a partir do identificador.
 *
 * `afterInteractive` e não `beforeInteractive`: medir é secundário à página
 * funcionar, e um script de terceiro no caminho crítico é exatamente o que
 * piora o LCP que ele deveria ajudar a medir.
 */
function ScriptDoGa4({ id }: { id: string }) {
  return (
    <>
      <Script
        id="ga4-carregador"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
      />
      <Script id="ga4-configuracao" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', ${JSON.stringify(id)}, {
            anonymize_ip: true,
            send_page_view: false
          });
        `}
      </Script>
      <RelatorioDeVitals />
    </>
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
 * Não bloqueia a tela: é uma faixa no rodapé, dispensável, que não cobre
 * conteúdo nem prende o foco. Quem ignora continua navegando, e sem medição.
 */
function AvisoDeMedicao() {
  return (
    <div
      role="region"
      aria-label="Medição de uso do site"
      className="fixed inset-x-0 bottom-0 z-90 border-t border-graf-200 bg-white/95 p-4 shadow-pop backdrop-blur"
    >
      <div className="container-jb flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 text-sm leading-relaxed text-graf-700">
          A JB pode medir o uso do site para entender o que precisa melhorar. Nada do que
          você digita — busca, dados da clínica, relato de defeito — é enviado. O site
          funciona igual se você recusar.
        </p>
        <div className="flex shrink-0 gap-2">
          <Botao
            variante="secundario"
            tamanho="sm"
            onClick={() => gravarConsentimento("recusado")}
          >
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
