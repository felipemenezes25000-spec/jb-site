"use client";

import { useId, useState } from "react";
import { ArrowDownRight, ArrowLeft, ArrowRight, Images, PlugZap, Ruler } from "lucide-react";
import { GaleriaProduto, type FotoProduto } from "@/components/loja/galeria-produto";
import { PROCEDENCIA } from "@/domain/specs/schema";
import type { ExploracaoDoProduto, MedidasDoProduto, PontoDeInstalacao } from "@/lib/comercio/exploracao-produto";
import styles from "./exploracao-produto.module.css";

type Modo = "fotos" | "medidas" | "instalacao";

function DesenhoDimensional({ medidas }: { medidas: MedidasDoProduto }) {
  return (
    <div className={styles.estudo} data-exploracao-medidas>
      <div className={styles.cabecalho}>
        <span className={styles.sobretitulo}>Espaço do equipamento</span>
        <h2>Cabe na sua clínica?</h2>
      </div>
      <figure className={styles.figura}>
        <svg className={styles.desenho} viewBox="0 0 560 390" fill="none" aria-hidden="true">
          <path className={styles.face} d="M130 118 345 118 345 315 130 315Z" />
          <path className={styles.lateral} d="M345 118 425 65 425 263 345 315Z" />
          <path className={styles.topo} d="M130 118 210 65 425 65 345 118Z" />
          <path className={styles.oculto} d="M210 65V263H425 M130 315 210 263" />
          <g className={styles.cotas}>
            <path pathLength="1" d="M130 333V356 M345 333V356 M130 347H345 M120 347H130 M345 347H355" />
            <path pathLength="1" d="M103 118H78 M103 315H78 M88 118V315 M88 108V118 M88 315V325" />
            <path pathLength="1" d="M364 110 440 59 M357 98 370 117 M433 47 446 66" />
          </g>
          <g className={styles.letras} fill="currentColor" stroke="none">
            <text x="229" y="375">L</text><text x="58" y="225">A</text><text x="401" y="59">P</text>
          </g>
        </svg>
        <figcaption>
          <dl className={styles.medidas}>
            {[['L', 'Largura', medidas.largura], ['A', 'Altura', medidas.altura], ['P', 'Profundidade', medidas.profundidade]].map(([sigla, rotulo, valor]) => (
              <div key={sigla}>
                <dt><span>{sigla}</span> {rotulo}</dt><dd>{valor}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.nota}>Esquema sem escala. Medidas do equipamento; confira também as folgas de instalação.</p>
          <p className={styles.fonte}>Fonte: {PROCEDENCIA[medidas.fonte].rotulo}.</p>
        </figcaption>
      </figure>
    </div>
  );
}

function InstalacaoVisual({ pontos }: { pontos: PontoDeInstalacao[] }) {
  const [atual, setAtual] = useState(0);
  const ponto = pontos[atual] ?? pontos[0];
  return (
    <div className={styles.estudo} data-exploracao-instalacao>
      <div className={styles.cabecalho}>
        <span className={styles.sobretitulo}>Antes de instalar</span>
        <h2>Prepare o lugar dele.</h2>
      </div>
      <div className={styles.instalacao}>
        <div className={styles.trajeto} aria-hidden="true">
          <PlugZap /><svg viewBox="0 0 300 40" fill="none"><path key={atual} pathLength="1" d="M0 20H105L125 4H175L195 20H300" /></svg><span>{String(atual + 1).padStart(2, "0")}</span>
        </div>
        <div className={styles.requisito} aria-live="polite" aria-atomic="true">
          <div key={ponto.chave} className={styles.entrada}>
            <p className={styles.sobretitulo}>{ponto.rotulo}</p>
            <p className={styles.valor}>{ponto.valor}</p>
            {ponto.ajuda ? <p className={styles.ajuda}>{ponto.ajuda}</p> : null}
            <p className={styles.fonte}>Fonte: {PROCEDENCIA[ponto.fonte].rotulo}.</p>
          </div>
        </div>
        <div className={styles.progresso} aria-hidden="true">
          {pontos.map((item, indice) => <span key={item.chave} data-ativo={indice <= atual} />)}
        </div>
        <div className={styles.avancar}>
          <span>{atual + 1} de {pontos.length} requisitos</span>
          <div>
            <button type="button" className="foco-jb" disabled={atual === 0} aria-label="Requisito anterior" onClick={() => setAtual((valor) => valor - 1)}><ArrowLeft aria-hidden="true" /></button>
            <button type="button" className="foco-jb" disabled={atual === pontos.length - 1} aria-label="Próximo requisito" onClick={() => setAtual((valor) => valor + 1)}><ArrowRight aria-hidden="true" /></button>
          </div>
        </div>
      </div>
      <a href="#ficha-tecnica" className={`${styles.link} foco-jb`}>Conferir requisitos na ficha <ArrowDownRight size={16} aria-hidden="true" /></a>
    </div>
  );
}

export function ExploracaoProduto({ fotos, nome, dados }: { fotos: FotoProduto[]; nome: string; dados: ExploracaoDoProduto }) {
  const [modo, setModo] = useState<Modo>("fotos");
  const id = useId();
  const temMedidas = Boolean(dados.medidas);
  const temInstalacao = dados.instalacao.length > 0;
  if (!temMedidas && !temInstalacao) return <GaleriaProduto fotos={fotos} nome={nome} />;

  const modos = [
    { chave: "fotos" as const, nome: "Fotos", Icone: Images, visivel: true },
    { chave: "medidas" as const, nome: "Medidas", Icone: Ruler, visivel: temMedidas },
    { chave: "instalacao" as const, nome: "Instalação", Icone: PlugZap, visivel: temInstalacao },
  ].filter((item) => item.visivel);

  return (
    <div className={styles.exploracao} data-exploracao-produto>
      <div className={styles.controles} role="group" aria-label="Explorar equipamento">
        {modos.map(({ chave, nome: rotulo, Icone }) => (
          <button key={chave} type="button" className="foco-jb" aria-pressed={modo === chave} aria-controls={`${id}-${chave}`} onClick={() => setModo(chave)}>
            <Icone size={16} aria-hidden="true" />{rotulo}
          </button>
        ))}
      </div>
      <div id={`${id}-fotos`} hidden={modo !== "fotos"}><GaleriaProduto fotos={fotos} nome={nome} /></div>
      {dados.medidas ? <section id={`${id}-medidas`} hidden={modo !== "medidas"} className={styles.painel} aria-label={`Dimensões de ${nome}`}>{modo === "medidas" ? <DesenhoDimensional medidas={dados.medidas} /> : null}</section> : null}
      {temInstalacao ? <section id={`${id}-instalacao`} hidden={modo !== "instalacao"} className={styles.painel} aria-label={`Instalação de ${nome}`}>{modo === "instalacao" ? <InstalacaoVisual pontos={dados.instalacao} /> : null}</section> : null}
    </div>
  );
}
