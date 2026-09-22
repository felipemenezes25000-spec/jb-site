import { ICONE_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { EQUIPAMENTOS } from "@/lib/diagnostico";

/* ============================================================================
   Faixa que corre com os equipamentos atendidos

   A única faixa em movimento da página. Diz, de relance, o tamanho do que a
   JB conserta, e pára quando o mouse passa por cima para quem quer ler.
   A lista é duplicada para o laço fechar sem emenda; a segunda cópia é
   escondida do leitor de tela, que ouve cada item uma vez só.
   ============================================================================ */

const ITENS = EQUIPAMENTOS.filter((equipamento) => equipamento.id !== "outro");

function Trilho({ oculto }: { oculto?: boolean }) {
  return (
    <ul aria-hidden={oculto} className="flex shrink-0 items-center">
      {ITENS.map((equipamento) => {
        const Icone = ICONE_DO_EQUIPAMENTO[equipamento.id];
        return (
          <li
            key={equipamento.id}
            className="flex items-center gap-3 px-6 text-lg font-extrabold tracking-tight text-graf-900 sm:px-8 sm:text-2xl"
          >
            <Icone className="size-5 text-jb-500 sm:size-6" aria-hidden />
            {equipamento.nome}
          </li>
        );
      })}
    </ul>
  );
}

export function FaixaEquipamentos() {
  return (
    <div className="jb-faixa overflow-hidden border-b border-graf-200 bg-white py-5 sm:py-6">
      <p className="sr-only">Equipamentos atendidos:</p>
      <div className="jb-faixa-trilho">
        <Trilho />
        <Trilho oculto />
      </div>
    </div>
  );
}
