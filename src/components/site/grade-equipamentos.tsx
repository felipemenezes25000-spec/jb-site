"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, Plus, Wrench } from "lucide-react";

import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { caminhoDoEquipamento } from "@/lib/paginas-equipamento";
import {
  GRUPOS_DO_PORTFOLIO,
  PORTFOLIO_DE_ASSISTENCIA,
  idDeMedicao,
  imagemDoPortfolio,
  itensDoGrupo,
  mensagemDoPortfolio,
  type GrupoDoPortfolio,
  type ItemDoPortfolio,
} from "@/lib/portfolio-assistencia";
import { cn } from "@/lib/utils";

/* ============================================================================
   Equipamentos atendidos pela JB

   Portfólio de assistência e manutenção, não vitrine: fechado, o cartão é
   foto + nome do tipo de equipamento, e nada mais. O toque abre, dentro do
   próprio cartão, Jeferson e Jackson com a mensagem já dizendo o equipamento
   — e, quando existe, o caminho para a página daquele equipamento.

   Os filtros por área (esterilização, ar e sucção…) só encurtam a lista: tudo
   vem no HTML do servidor, e "Outro equipamento" fica sempre no fim, porque a
   JB atende o que não está na grade. Os dados moram em
   `@/lib/portfolio-assistencia`.
   ============================================================================ */

const DESCRICAO_DO_ALVO = "assistência e manutenção com Jeferson ou Jackson no WhatsApp";

/** Uma coluna de cartão em cada faixa: 2 no celular, 3 no tablet, 6 no desktop. */
const TAMANHOS = "(min-width: 1440px) 214px, (min-width: 1024px) 15vw, (min-width: 640px) 30vw, 46vw";

type Aberto = string | null;
const OUTRO = "outro";

/**
 * Sem filtro, celular e tablet começam pelos equipamentos com página própria,
 * mais "Outro": 7 + 1 fecham quatro fileiras de 2, e 8 + 1, três fileiras de 3.
 * O resto continua no HTML e aparece no botão; o desktop mostra tudo.
 */
const VISIVEIS_NO_CELULAR = 7;
const VISIVEIS_NO_TABLET = 8;

/** Palavra longa demais para o cartão de 150px: quebra com hífen, não no meio da letra. */
const QUEBRA_SUAVE: Record<string, string> = {
  Fotopolimerizador: "Fotopolime­rizador",
};

function Cartao({
  id,
  nome,
  indice,
  recolhe,
  aberto,
  alternar,
  foto,
  children,
}: {
  id: string;
  nome: string;
  indice: number;
  /** Some da grade recolhida: no celular, ou no celular e no tablet. */
  recolhe?: "celular" | "sempre";
  aberto: boolean;
  alternar: () => void;
  foto: React.ReactNode;
  children: React.ReactNode;
}) {
  const idOpcoes = useId();

  return (
    <li className="jb-revela" data-recolhe={recolhe} style={{ "--i": indice % 6 } as React.CSSProperties}>
      <div
        data-aberto={aberto}
        data-portfolio={id}
        className={cn(
          "jb-cartao-equipamento group relative flex h-full flex-col rounded-2xl border bg-white",
          id === OUTRO ? "border-dashed border-graf-300" : "border-graf-200",
        )}
      >
        <button
          type="button"
          onClick={alternar}
          aria-expanded={aberto}
          aria-controls={idOpcoes}
          className="jb-portfolio-alvo foco-jb flex w-full flex-1 flex-col rounded-[inherit] text-left"
        >
          <span className="jb-portfolio-foto relative block aspect-square w-full overflow-clip">
            {foto}
            <span aria-hidden className="jb-portfolio-mais">
              <Plus className="size-4" />
            </span>
          </span>
          <span className="jb-portfolio-nome block">
            {QUEBRA_SUAVE[nome] ?? nome}
            <span className="sr-only">: {DESCRICAO_DO_ALVO}</span>
          </span>
        </button>

        <div id={idOpcoes} hidden={!aberto} className="jb-portfolio-opcoes">
          {aberto ? children : null}
        </div>
      </div>
    </li>
  );
}

function OpcoesDoItem({ item, contatos }: { item: ItemDoPortfolio; contatos: ContatoWhatsapp[] }) {
  const pagina = item.equipamento ? caminhoDoEquipamento(item.equipamento) : null;

  return (
    <>
      <OpcoesWhatsapp
        contatos={contatos}
        mensagem={mensagemDoPortfolio(item)}
        equipamento={idDeMedicao(item)}
        posicao="secao"
        tamanho="sm"
        coluna
      />
      {pagina ? (
        <Link
          href={pagina}
          prefetch={false}
          className="foco-jb mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-bold text-graf-700 underline-offset-4 hover:text-jb-700 hover:underline"
        >
          Ver página
          <span className="sr-only"> de assistência para {item.naMensagem}</span>
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </>
  );
}

export function GradeEquipamentos({ contatos }: { contatos: ContatoWhatsapp[] }) {
  const [grupo, setGrupo] = useState<GrupoDoPortfolio | null>(null);
  const [aberto, setAberto] = useState<Aberto>(null);
  const [anuncio, setAnuncio] = useState("");
  const [listaToda, setListaToda] = useState(false);
  const grade = useRef<HTMLUListElement>(null);

  const visiveis = itensDoGrupo(grupo);
  const recolhida = grupo === null && !listaToda;

  function filtrar(proximo: GrupoDoPortfolio | null) {
    setGrupo(proximo);
    setAberto(null);
    const quantos = itensDoGrupo(proximo).length;
    const rotulo = GRUPOS_DO_PORTFOLIO.find((candidato) => candidato.id === proximo)?.rotulo;
    setAnuncio(rotulo ? `${quantos} equipamentos em ${rotulo}, mais outro equipamento.` : `Todos os ${quantos} equipamentos.`);
  }

  function mostrarTudo() {
    /* O foco segue para o primeiro cartão que apareceu, não volta ao topo. */
    const primeiroEscondido = [...(grade.current?.querySelectorAll<HTMLElement>("li[data-recolhe]") ?? [])].find(
      (item) => item.offsetParent === null,
    );
    setListaToda(true);
    setAnuncio(`Todos os ${PORTFOLIO_DE_ASSISTENCIA.length} equipamentos.`);
    requestAnimationFrame(() => {
      primeiroEscondido?.querySelector<HTMLButtonElement>(".jb-portfolio-alvo")?.focus();
    });
  }

  function alternar(id: string) {
    setAberto((atual) => (atual === id ? null : id));
  }

  /* Esc fecha o cartão aberto e devolve o foco ao próprio cartão. */
  function aoTeclar(evento: React.KeyboardEvent<HTMLUListElement>) {
    if (evento.key !== "Escape" || !aberto) return;
    const alvo = grade.current?.querySelector<HTMLButtonElement>(`[data-portfolio="${aberto}"] .jb-portfolio-alvo`);
    setAberto(null);
    alvo?.focus();
  }

  const filtros: { id: GrupoDoPortfolio | null; rotulo: string; quantos: number }[] = [
    { id: null, rotulo: "Todos", quantos: PORTFOLIO_DE_ASSISTENCIA.length },
    ...GRUPOS_DO_PORTFOLIO.map((item) => ({ ...item, quantos: itensDoGrupo(item.id).length })),
  ];

  return (
    <section
      id="equipamentos"
      aria-labelledby="equipamentos-titulo"
      className="scroll-mt-20 bg-white py-16 md:py-24"
    >
      <div className="container-jb">
        <p className="sobretitulo jb-revela">Portfólio de assistência</p>
        <h2 id="equipamentos-titulo" className="text-section texto-forte jb-revela mt-3 max-w-3xl">
          Equipamentos que a JB atende. <span className="text-jb-600">Manutenção e assistência técnica.</span>
        </h2>
        <p
          className="texto-guia jb-revela mt-4 max-w-2xl text-graf-600"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Toque no equipamento e fale direto com Jeferson ou Jackson. A mensagem já chega com o nome
          dele.
        </p>

        <div className="jb-revela mt-7" style={{ "--i": 2 } as React.CSSProperties}>
          <div
            role="group"
            aria-label="Filtrar equipamentos por área"
            data-rolagem-horizontal
            className="jb-portfolio-filtros"
          >
            {filtros.map((filtro) => (
              <button
                key={filtro.id ?? "todos"}
                type="button"
                aria-pressed={grupo === filtro.id}
                onClick={() => filtrar(filtro.id)}
                className="jb-portfolio-filtro foco-jb"
              >
                {filtro.rotulo}
                <span className="jb-portfolio-contagem" aria-hidden>
                  {filtro.quantos}
                </span>
              </button>
            ))}
          </div>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {anuncio}
        </p>

        <ul
          ref={grade}
          onKeyDown={aoTeclar}
          data-recolhida={recolhida}
          className="jb-portfolio-grade mt-6 grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6 lg:gap-3 xl:gap-4"
        >
          {visiveis.map((item, indice) => (
            <Cartao
              key={item.slug}
              id={item.slug}
              nome={item.nome}
              indice={indice}
              recolhe={
                indice >= VISIVEIS_NO_TABLET ? "sempre" : indice >= VISIVEIS_NO_CELULAR ? "celular" : undefined
              }
              aberto={aberto === item.slug}
              alternar={() => alternar(item.slug)}
              foto={
                <Image
                  src={imagemDoPortfolio(item.slug)}
                  alt=""
                  fill
                  sizes={TAMANHOS}
                  className="jb-portfolio-imagem jb-toque-foto object-contain mix-blend-multiply"
                />
              }
            >
              <OpcoesDoItem item={item} contatos={contatos} />
            </Cartao>
          ))}

          <Cartao
            id={OUTRO}
            nome="Outro equipamento"
            indice={visiveis.length}
            aberto={aberto === OUTRO}
            alternar={() => alternar(OUTRO)}
            foto={
              <span className="jb-portfolio-outro" aria-hidden>
                <Wrench className="size-7" />
              </span>
            }
          >
            <OpcoesWhatsapp
              contatos={contatos}
              mensagem={mensagemDoPortfolio(null)}
              equipamento={OUTRO}
              posicao="secao"
              tamanho="sm"
              coluna
            />
          </Cartao>
        </ul>

        {recolhida ? (
          <button type="button" onClick={mostrarTudo} className="jb-portfolio-ver-todos foco-jb">
            Ver todos os {PORTFOLIO_DE_ASSISTENCIA.length} equipamentos
            <ChevronDown className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </section>
  );
}
