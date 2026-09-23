import Image from "next/image";
import Link from "next/link";

import { ICONE_DO_EQUIPAMENTO, IMAGEM_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { EQUIPAMENTOS } from "@/lib/diagnostico";
import { PAGINAS_DE_EQUIPAMENTO } from "@/lib/paginas-equipamento";

/* ============================================================================
   Faixa dos equipamentos atendidos

   Continua funcionando como assinatura visual, mas agora também navega para
   as landings específicas. O trilho aparece duplicado no desktop para fechar
   o loop da marquise; por isso os links não fazem prefetch automático — não
   vale baixar sete páginas em segundo plano só porque os cartões passaram pela
   viewport. No toque, a faixa vira uma navegação horizontal estática.
   ============================================================================ */

const ITENS = EQUIPAMENTOS.filter((equipamento) => equipamento.id !== "outro");

function Trilho({ oculto }: { oculto?: boolean }) {
  return (
    <ul aria-hidden={oculto} className="flex shrink-0 items-center">
      {ITENS.map((equipamento) => {
        const Icone = ICONE_DO_EQUIPAMENTO[equipamento.id];
        const imagem = IMAGEM_DO_EQUIPAMENTO[equipamento.id];
        const pagina = PAGINAS_DE_EQUIPAMENTO.find((item) => item.equipamento === equipamento.id);

        const conteudo = (
          <>
            <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-card ring-1 ring-graf-200 sm:size-14">
              {imagem ? (
                <Image src={imagem} alt="" fill sizes="56px" className="object-contain p-1.5" />
              ) : (
                <Icone className="size-5 text-jb-500 sm:size-6" aria-hidden />
              )}
            </span>
            <span>{equipamento.nome}</span>
          </>
        );

        return (
          <li key={equipamento.id} className="px-2 sm:px-3">
            {pagina ? (
              <Link
                href={`/${pagina.slug}`}
                prefetch={false}
                tabIndex={oculto ? -1 : undefined}
                className="jb-faixa-equipamento foco-jb flex min-h-16 items-center gap-3 rounded-2xl border border-transparent px-3 text-base font-extrabold tracking-tight text-graf-900 transition-[background-color,border-color,transform,box-shadow] sm:min-h-20 sm:px-4 sm:text-xl"
              >
                {conteudo}
              </Link>
            ) : (
              <span className="flex min-h-16 items-center gap-3 px-3 text-base font-extrabold tracking-tight text-graf-900 sm:min-h-20 sm:px-4 sm:text-xl">
                {conteudo}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function FaixaEquipamentos() {
  return (
    <div className="jb-faixa jb-faixa-premium overflow-hidden border-b border-graf-200 bg-surface-muted py-3 sm:py-4">
      <p className="sr-only">Equipamentos atendidos:</p>
      <div className="jb-faixa-trilho">
        <Trilho />
        <Trilho oculto />
      </div>
    </div>
  );
}
