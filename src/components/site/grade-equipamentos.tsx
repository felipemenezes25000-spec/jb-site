"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { ICONE_DO_EQUIPAMENTO, IMAGEM_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { EQUIPAMENTOS, montarMensagem, type Equipamento, type IdEquipamento } from "@/lib/diagnostico";
import { caminhoDoEquipamento } from "@/lib/paginas-equipamento";
import { cn } from "@/lib/utils";

/* ============================================================================
   Equipamentos atendidos pela JB

   A grade pública funciona como um portfólio de assistência e manutenção, não
   como catálogo comercial. O cartão mostra somente a imagem e o nome público
   do equipamento. Marca, modelo, sintoma e situação entram depois na triagem.

   Nenhum cartão exibe preço, ficha técnica, modelo comercial ou texto de venda.
   O clique abre Jeferson e Jackson e, quando existe, a landing de assistência
   específica daquele equipamento.
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
  const imagem = IMAGEM_DO_EQUIPAMENTO[equipamento.id];
  const outro = equipamento.id === "outro";
  const idOpcoes = useId();
  const pagina = caminhoDoEquipamento(equipamento.id);
  const nomePublico = NOME_PUBLICO_DO_EQUIPAMENTO[equipamento.id];

  return (
    <li
      className="jb-revela"
      style={{ "--i": indice % 4 } as React.CSSProperties}
    >
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

        {imagem ? (
          <span className="relative block h-32 sm:h-36">
            <Image
              src={imagem}
              alt=""
              fill
              sizes="(min-width: 1024px) 22vw, 45vw"
              className="jb-toque-foto object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.05]"
            />
            <span
              aria-hidden
              className="absolute inset-x-[24%] bottom-0 h-3 rounded-[100%] bg-graf-950/15 blur-md transition-transform duration-500 group-hover:scale-x-90"
            />
          </span>
        ) : (
          <span className="flex size-12 items-center justify-center rounded-xl bg-graf-100 text-graf-700 transition-colors group-hover:bg-jb-50 group-hover:text-jb-600">
            <Icone className="jb-icone-balanca size-6" aria-hidden />
          </span>
        )}

        <span className={cn("relative mt-auto block", imagem ? "pt-4" : "pt-8")}>
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

export function GradeEquipamentos({ contatos }: { contatos: ContatoWhatsapp[] }) {
  const [aberto, setAberto] = useState<IdEquipamento | null>(null);

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
          Selecione o equipamento. Marca, modelo e sintoma são informados na triagem, sem transformar o site em catálogo de produtos.
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {EQUIPAMENTOS.map((equipamento, indice) => (
            <Cartao
              key={equipamento.id}
              equipamento={equipamento}
              contatos={contatos}
              indice={indice}
              aberto={aberto === equipamento.id}
              alternar={() => setAberto((atual) => (atual === equipamento.id ? null : equipamento.id))}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
