"use client";

import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Building2, FileClock, ScanLine } from "lucide-react";
import estilos from "./bancada-processo.module.css";

const ETAPAS = [
  {
    numero: "01",
    nome: "Rotina",
    titulo: "A clínica descreve a rotina",
    texto:
      "Quantos consultórios, quantos ciclos por dia, o que já existe na sala. A recomendação nasce daí, não de uma lista de mais vendidos.",
    detalhe: "A escolha começa na sua clínica.",
    icone: Building2,
  },
  {
    numero: "02",
    nome: "Bancada",
    titulo: "O equipamento passa pela bancada",
    texto:
      "Todo seminovo é aberto, testado e fotografado. O que foi trocado aparece no laudo daquela unidade, com nome de peça e resultado item por item.",
    detalhe: "O registro é da unidade que você recebe.",
    icone: ScanLine,
  },
  {
    numero: "03",
    nome: "Histórico",
    titulo: "A JB continua depois da entrega",
    texto:
      "Instalação acompanhada, chamado técnico com a mesma equipe que vendeu, e o equipamento registrado na Área da Clínica com garantia e histórico.",
    detalhe: "O cuidado acompanha o equipamento.",
    icone: FileClock,
  },
] as const;

/** Capítulos manuais: a animação só começa quando a pessoa escolhe uma etapa. */
export function BancadaProcesso() {
  const id = useId();
  const [etapaAtiva, definirEtapa] = useState(0);
  const [interagiu, definirInteracao] = useState(false);
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);

  function selecionarEtapa(indice: number) {
    if (indice === etapaAtiva) return;
    definirInteracao(true);
    definirEtapa(indice);
  }

  function navegarEtapas(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    let proxima: number;
    switch (evento.key) {
      case "ArrowRight": proxima = (indice + 1) % ETAPAS.length; break;
      case "ArrowLeft": proxima = (indice + ETAPAS.length - 1) % ETAPAS.length; break;
      case "Home": proxima = 0; break;
      case "End": proxima = ETAPAS.length - 1; break;
      default: return;
    }
    evento.preventDefault();
    selecionarEtapa(proxima);
    botoes.current[proxima]?.focus();
  }

  return (
    <div className={estilos.processo} data-etapa={etapaAtiva} data-interagiu={interagiu}>
      <div className={estilos.capitulos} role="tablist" aria-label="Da escolha ao pós-venda">
        {ETAPAS.map((etapa, indice) => (
          <button
            key={etapa.numero}
            ref={(elemento) => { botoes.current[indice] = elemento; }}
            type="button"
            role="tab"
            id={`${id}-etapa-${indice}`}
            aria-controls={`${id}-painel-${indice}`}
            aria-selected={etapaAtiva === indice}
            tabIndex={etapaAtiva === indice ? 0 : -1}
            className={`foco-jb ${estilos.capitulo}`}
            onClick={() => selecionarEtapa(indice)}
            onKeyDown={(evento) => navegarEtapas(evento, indice)}
          >
            <span className={estilos.numero}>{etapa.numero}</span>
            <span>{etapa.nome}</span>
          </button>
        ))}
      </div>

      <figure className={estilos.fotografia}>
        <div className={estilos.recorte}>
          <Image
            src="/lumina/bancada.jpg"
            alt="Técnico inspeciona um equipamento odontológico na bancada"
            width={1600}
            height={1100}
            sizes="(min-width: 1600px) 880px, (min-width: 1024px) 56vw, 100vw"
            className={estilos.imagem}
          />
          <span className={estilos.moldura} aria-hidden="true" />
          <div className={estilos.legenda} aria-hidden="true">
            <span className={estilos.numero}>{ETAPAS[etapaAtiva].numero} / 03</span>
            <span>{ETAPAS[etapaAtiva].detalhe}</span>
          </div>
        </div>
        <figcaption className={estilos.rodapeFoto}>
          <span>Bancada JB</span>
          <span>Da escolha ao pós-venda</span>
        </figcaption>
      </figure>

      <div className={estilos.conteudo}>
        {ETAPAS.map((etapa, indice) => (
          <div
            key={etapa.numero}
            id={`${id}-painel-${indice}`}
            role="tabpanel"
            aria-labelledby={`${id}-etapa-${indice}`}
            hidden={etapaAtiva !== indice}
            tabIndex={0}
            className={`foco-jb ${estilos.painel}`}
          >
            <p className="label-mono text-jb-700">{etapa.numero} / {etapa.nome}</p>
            <h3 className="mt-4 text-title">{etapa.titulo}</h3>
            <p className="mt-4 text-corpo leading-7 text-graf-950">{etapa.texto}</p>
          </div>
        ))}

        <div key={etapaAtiva} className={estilos.percurso} aria-hidden="true">
          <svg className={estilos.linha} viewBox="0 0 300 64" fill="none" preserveAspectRatio="none">
            <path d="M50 32H250" className={estilos.base} />
            {etapaAtiva > 0 && (
              <path
                d={etapaAtiva === 1 ? "M50 32H150" : "M50 32H250"}
                pathLength="1"
                className={estilos.traco}
              />
            )}
          </svg>
          {ETAPAS.map((etapa, indice) => (
            <div key={etapa.numero} className={estilos.marco} data-ativo={indice === etapaAtiva}>
              <span className={estilos.icone}><etapa.icone strokeWidth={1.5} /></span>
              <span>{etapa.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
