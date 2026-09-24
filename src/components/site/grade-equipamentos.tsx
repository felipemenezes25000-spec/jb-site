"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { ICONE_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { EQUIPAMENTOS, montarMensagem, type Equipamento, type IdEquipamento } from "@/lib/diagnostico";
import { caminhoDoEquipamento } from "@/lib/paginas-equipamento";
import { cn } from "@/lib/utils";

/* ============================================================================
   Equipamentos atendidos pela JB

   A grade pública é um portfólio de assistência e manutenção, não um catálogo
   comercial. Cada item mostra somente imagem + nome do tipo de equipamento.
   Não há modelo, ficha técnica, preço nem descrição de venda.

   As imagens foram recortadas do portfólio técnico fornecido pela JB e reunidas
   em sprites para evitar dezenas de downloads pequenos. Elas ilustram o tipo de
   equipamento; não funcionam como selo de autorização de fabricante.
   ============================================================================ */

const NOME_PUBLICO_DO_EQUIPAMENTO: Record<IdEquipamento, string> = {
  autoclave: "Autoclave",
  compressor: "Compressor odontológico",
  "bomba-vacuo": "Bomba de vácuo",
  cadeira: "Cadeira odontológica",
  seladora: "Seladora",
  destilador: "Destilador de água",
  lavadora: "Lavadora ultrassônica",
  outro: "Outro equipamento",
};

type PosicaoSprite = { arquivo: 1 | 2 | 3 | 4; x: 0 | 1; y: 0 | 1 };

type EquipamentoPortfolio = {
  slug: string;
  nome: string;
  sprite: PosicaoSprite;
};

const SPRITE_DO_EQUIPAMENTO: Partial<Record<IdEquipamento, PosicaoSprite>> = {
  autoclave: { arquivo: 1, x: 0, y: 0 },
  compressor: { arquivo: 1, x: 1, y: 0 },
  "bomba-vacuo": { arquivo: 1, x: 0, y: 1 },
  cadeira: { arquivo: 1, x: 1, y: 1 },
  seladora: { arquivo: 2, x: 0, y: 0 },
  destilador: { arquivo: 2, x: 1, y: 0 },
  lavadora: { arquivo: 2, x: 0, y: 1 },
};

const EQUIPAMENTOS_PORTFOLIO: readonly EquipamentoPortfolio[] = [
  { slug: "pecas-de-mao", nome: "Peças de mão", sprite: { arquivo: 2, x: 1, y: 1 } },
  { slug: "raio-x", nome: "Raio-X odontológico", sprite: { arquivo: 3, x: 0, y: 0 } },
  { slug: "profilaxia", nome: "Ultrassom e profilaxia", sprite: { arquivo: 3, x: 1, y: 0 } },
  { slug: "fotopolimerizador", nome: "Fotopolimerizador", sprite: { arquivo: 3, x: 0, y: 1 } },
  { slug: "amalgamador", nome: "Amalgamador", sprite: { arquivo: 3, x: 1, y: 1 } },
  { slug: "mini-equipo", nome: "Equipo odontológico", sprite: { arquivo: 4, x: 0, y: 0 } },
  { slug: "refletor", nome: "Refletor odontológico", sprite: { arquivo: 4, x: 1, y: 0 } },
  { slug: "mocho", nome: "Mocho odontológico", sprite: { arquivo: 4, x: 0, y: 1 } },
  { slug: "articulador", nome: "Articulador", sprite: { arquivo: 4, x: 1, y: 1 } },
];

const POSICAO = ["0%", "100%"] as const;

function ImagemDoPortfolio({ posicao }: { posicao: PosicaoSprite }) {
  return (
    <span className="relative flex h-32 items-center justify-center overflow-hidden sm:h-36" aria-hidden>
      <span
        className="relative block size-28 shrink-0 bg-no-repeat transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.05] sm:size-32"
        style={{
          backgroundImage: `url('/site/equip/pdf/portfolio-sprite-${posicao.arquivo}.webp')`,
          backgroundSize: "200% 200%",
          backgroundPosition: `${POSICAO[posicao.x]} ${POSICAO[posicao.y]}`,
        }}
      />
      <span className="absolute inset-x-[28%] bottom-0 h-3 rounded-[100%] bg-graf-950/10 blur-md transition-transform duration-500 group-hover:scale-x-90" />
    </span>
  );
}

function mensagemDePortfolio(nome: string) {
  return `Olá, JB! Vim pelo site e preciso de assistência e manutenção para ${nome.toLowerCase()}.`;
}

function Cartao({
  equipamento,
  contatos,
  indice,
  aberto,
  alternar,
}: {
  equipamento: Equipamento;
  contatos: ContatoWhatsapp[];
  indice: number;
  aberto: boolean;
  alternar: () => void;
}) {
  const Icone = ICONE_DO_EQUIPAMENTO[equipamento.id];
  const sprite = SPRITE_DO_EQUIPAMENTO[equipamento.id];
  const outro = equipamento.id === "outro";
  const idOpcoes = useId();
  const pagina = caminhoDoEquipamento(equipamento.id);
  const nomePublico = NOME_PUBLICO_DO_EQUIPAMENTO[equipamento.id];

  return (
    <li className="jb-revela" style={{ "--i": indice % 4 } as React.CSSProperties}>
      <div
        className={cn(
          "jb-cartao-equipamento group relative flex h-full min-h-[12rem] flex-col overflow-clip rounded-2xl border bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-pop sm:p-6",
          outro ? "border-dashed border-graf-300 hover:border-jb-400" : "border-graf-200 hover:border-jb-300",
          aberto && "border-jb-400 shadow-pop",
        )}
      >
        <button
          type="button"
          onClick={alternar}
          aria-expanded={aberto}
          aria-controls={idOpcoes}
          className="foco-jb absolute inset-0 z-[1] rounded-2xl active:bg-graf-950/[0.02]"
        >
          <span className="sr-only">
            {nomePublico}: assistência e manutenção com Jeferson ou Jackson no WhatsApp
          </span>
        </button>

        {sprite ? (
          <ImagemDoPortfolio posicao={sprite} />
        ) : (
          <span className="flex size-12 items-center justify-center rounded-xl bg-graf-100 text-graf-700 transition-colors group-hover:bg-jb-50 group-hover:text-jb-600">
            <Icone className="jb-icone-balanca size-6" aria-hidden />
          </span>
        )}

        <span className={cn("relative mt-auto block", sprite ? "pt-4" : "pt-8")}>
          <span className="block text-bloco font-extrabold tracking-tight text-graf-950">
            {nomePublico}
          </span>
          {aberto ? null : (
            <span aria-hidden className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-jb-600">
              <MarcaWhatsapp className="size-4" />
              {outro ? "Consultar assistência" : "Assistência e manutenção"}
              <ChevronDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </span>
          )}
        </span>

        <div id={idOpcoes} hidden={!aberto} className="relative z-[2] mt-4">
          {aberto ? (
            <>
              <OpcoesWhatsapp
                contatos={contatos}
                mensagem={montarMensagem({ equipamento: equipamento.id })}
                equipamento={equipamento.id}
                posicao="secao"
                tamanho="sm"
                coluna
              />
              {pagina ? (
                <Link
                  href={pagina}
                  prefetch={false}
                  className="foco-jb mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-bold text-graf-700 underline-offset-4 hover:text-jb-700 hover:underline"
                >
                  Ver assistência técnica
                  <span className="sr-only"> de {nomePublico.toLowerCase()}</span>
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function CartaoPortfolio({
  item,
  contatos,
  indice,
  aberto,
  alternar,
}: {
  item: EquipamentoPortfolio;
  contatos: ContatoWhatsapp[];
  indice: number;
  aberto: boolean;
  alternar: () => void;
}) {
  const idOpcoes = useId();

  return (
    <li className="jb-revela" style={{ "--i": indice % 4 } as React.CSSProperties}>
      <div
        className={cn(
          "jb-cartao-equipamento group relative flex h-full min-h-[12rem] flex-col overflow-clip rounded-2xl border border-graf-200 bg-white p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-jb-300 hover:shadow-pop sm:p-6",
          aberto && "border-jb-400 shadow-pop",
        )}
      >
        <button
          type="button"
          onClick={alternar}
          aria-expanded={aberto}
          aria-controls={idOpcoes}
          className="foco-jb absolute inset-0 z-[1] rounded-2xl active:bg-graf-950/[0.02]"
        >
          <span className="sr-only">
            {item.nome}: assistência e manutenção com Jeferson ou Jackson no WhatsApp
          </span>
        </button>

        <ImagemDoPortfolio posicao={item.sprite} />

        <span className="relative mt-auto block pt-4">
          <span className="block text-bloco font-extrabold tracking-tight text-graf-950">{item.nome}</span>
          {aberto ? null : (
            <span aria-hidden className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-jb-600">
              <MarcaWhatsapp className="size-4" />
              Assistência e manutenção
              <ChevronDown className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </span>
          )}
        </span>

        <div id={idOpcoes} hidden={!aberto} className="relative z-[2] mt-4">
          {aberto ? (
            <OpcoesWhatsapp
              contatos={contatos}
              mensagem={mensagemDePortfolio(item.nome)}
              equipamento={item.slug}
              posicao="secao"
              tamanho="sm"
              coluna
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function GradeEquipamentos({ contatos }: { contatos: ContatoWhatsapp[] }) {
  const [aberto, setAberto] = useState<IdEquipamento | null>(null);
  const [abertoPortfolio, setAbertoPortfolio] = useState<string | null>(null);

  return (
    <section
      id="equipamentos"
      aria-labelledby="equipamentos-titulo"
      className="scroll-mt-20 bg-white py-16 md:py-24"
    >
      <div className="container-jb">
        <p className="sobretitulo jb-revela">Assistência técnica especializada</p>
        <h2 id="equipamentos-titulo" className="text-section texto-forte jb-revela mt-3 max-w-3xl">
          Equipamentos que atendemos. <span className="text-jb-600">Assistência e manutenção.</span>
        </h2>
        <p
          className="texto-guia jb-revela mt-4 max-w-2xl text-graf-600"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Selecione o equipamento para falar com a equipe técnica. O site mostra somente o tipo do equipamento, sem catálogo, modelo ou ficha comercial.
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {EQUIPAMENTOS.map((equipamento, indice) => (
            <Cartao
              key={equipamento.id}
              equipamento={equipamento}
              contatos={contatos}
              indice={indice}
              aberto={aberto === equipamento.id}
              alternar={() => {
                setAbertoPortfolio(null);
                setAberto((atual) => (atual === equipamento.id ? null : equipamento.id));
              }}
            />
          ))}

          {EQUIPAMENTOS_PORTFOLIO.map((item, indice) => (
            <CartaoPortfolio
              key={item.slug}
              item={item}
              contatos={contatos}
              indice={EQUIPAMENTOS.length + indice}
              aberto={abertoPortfolio === item.slug}
              alternar={() => {
                setAberto(null);
                setAbertoPortfolio((atual) => (atual === item.slug ? null : item.slug));
              }}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
