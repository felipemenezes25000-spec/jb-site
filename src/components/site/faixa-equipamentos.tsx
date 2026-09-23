import Image from "next/image";

import { ICONE_DO_EQUIPAMENTO, IMAGEM_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { EQUIPAMENTOS } from "@/lib/diagnostico";

/* ============================================================================
   Faixa que corre com os equipamentos atendidos

   Diz, de relance, o tamanho do que a JB conserta: foto e nome de cada
   equipamento correndo, e pára quando o mouse passa por cima para quem quer
   ler. A outra faixa em movimento é a do topo, com as frases de venda.
   A lista é duplicada para o laço fechar sem emenda; a segunda cópia é
   escondida do leitor de tela, que ouve cada item uma vez só.
   ============================================================================ */

const ITENS = EQUIPAMENTOS.filter((equipamento) => equipamento.id !== "outro");

function Trilho({ oculto }: { oculto?: boolean }) {
  return (
    <ul aria-hidden={oculto} className="flex shrink-0 items-center">
      {ITENS.map((equipamento) => {
        const Icone = ICONE_DO_EQUIPAMENTO[equipamento.id];
        const imagem = IMAGEM_DO_EQUIPAMENTO[equipamento.id];
        return (
          <li
            key={equipamento.id}
            className="flex items-center gap-3 px-5 text-lg font-extrabold tracking-tight text-graf-900 sm:px-7 sm:text-2xl"
          >
            <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-card ring-1 ring-graf-200 sm:size-14">
              {imagem ? (
                <Image src={imagem} alt="" fill sizes="56px" className="object-contain p-1.5" />
              ) : (
                <Icone className="size-5 text-jb-500 sm:size-6" aria-hidden />
              )}
            </span>
            {equipamento.nome}
          </li>
        );
      })}
    </ul>
  );
}

export function FaixaEquipamentos() {
  return (
    <div className="jb-faixa overflow-hidden border-b border-graf-200 bg-surface-muted py-5 sm:py-6">
      <p className="sr-only">Equipamentos atendidos:</p>
      <div className="jb-faixa-trilho">
        <Trilho />
        <Trilho oculto />
      </div>
    </div>
  );
}
