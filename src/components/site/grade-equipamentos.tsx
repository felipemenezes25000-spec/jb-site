"use client";

import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ChevronDown } from "lucide-react";

import { ICONE_DO_EQUIPAMENTO, IMAGEM_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { EQUIPAMENTOS, montarMensagem, type Equipamento, type IdEquipamento } from "@/lib/diagnostico";
import { caminhoDoEquipamento } from "@/lib/paginas-equipamento";
import { cn } from "@/lib/utils";

/* ============================================================================
   O que a JB conserta

   Cada bloco é um atalho para o WhatsApp com o equipamento já escrito na
   mensagem: o toque abre, dentro do próprio cartão, a escolha de sempre,
   Jeferson ou Jackson. Um cartão aberto por vez. A autoclave recebe mais área
   visual para criar hierarquia na composição, sem afirmar prioridade clínica
   ou frequência de falha que os dados do site não medem.

   Nenhum cartão leva marca de fabricante: a JB conserta todas, e um selo de
   marca num aparelho faria parecer que só aquela é atendida. "Outro
   equipamento" fecha a grade largo, para ninguém sair achando que a máquina
   dele não entra.

   Grade de 4 colunas: 4 células da autoclave + 6 comuns + 2 do "outro" = 12,
   sem buraco. No celular, 2 colunas com os dois blocos largos ocupando a
   linha inteira.

   Aberto, o cartão também leva à página do equipamento. Até 23/09/2026 a home
   tinha, além desta grade, uma faixa só com esses links logo abaixo da
   abertura: três escolhas de equipamento seguidas (triagem, faixa, grade).
   ============================================================================ */

function Cartao({
  equipamento,
  contatos,
  destaque,
  largo,
  indice,
  aberto,
  alternar,
}: {
  equipamento: Equipamento;
  contatos: ContatoWhatsapp[];
  destaque?: boolean;
  largo?: boolean;
  indice: number;
  aberto: boolean;
  alternar: () => void;
}) {
  const Icone = ICONE_DO_EQUIPAMENTO[equipamento.id];
  const imagem = IMAGEM_DO_EQUIPAMENTO[equipamento.id];
  const outro = equipamento.id === "outro";
  const idOpcoes = useId();
  const pagina = caminhoDoEquipamento(equipamento.id);

  return (
    <li
      className={cn(
        "jb-revela",
        destaque && "col-span-2 lg:row-span-2",
        largo && "col-span-2",
      )}
      style={{ "--i": indice % 4 } as React.CSSProperties}
    >
      <div
        className={cn(
          "jb-cartao-equipamento group relative flex h-full flex-col overflow-clip rounded-2xl border p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:shadow-pop sm:p-6",
          destaque
            ? "min-h-[15rem] border-jb-200 bg-gradient-to-br from-jb-50 via-white to-white lg:min-h-full"
            : outro
              ? "min-h-[9rem] border-dashed border-graf-300 bg-white hover:border-jb-400"
              : "min-h-[11rem] border-graf-200 bg-white hover:border-jb-300",
          aberto && "border-jb-400 shadow-pop",
        )}
      >
        {/* O cartão inteiro é o botão que abre a escolha; os dois botões de
            WhatsApp ficam por cima dele quando abertos. */}
        <button
          type="button"
          onClick={alternar}
          aria-expanded={aberto}
          aria-controls={idOpcoes}
          className="foco-jb absolute inset-0 z-[1] rounded-2xl active:bg-graf-950/[0.02]"
        >
          <span className="sr-only">
            {outro ? "Outro equipamento" : equipamento.nome}: falar com Jeferson ou Jackson no WhatsApp
          </span>
        </button>
        {destaque ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[radial-gradient(closest-side,rgb(224_20_27/0.14),transparent)]"
          />
        ) : null}

        <span className="relative flex items-start justify-between gap-3">
          {imagem ? null : (
            <span
              className={cn(
                "flex items-center justify-center rounded-xl transition-colors",
                destaque
                  ? "size-14 bg-jb-500 text-white shadow-card"
                  : "size-11 bg-graf-100 text-graf-700 group-hover:bg-jb-50 group-hover:text-jb-600",
              )}
            >
              <Icone className={cn("jb-icone-balanca", destaque ? "size-7" : "size-5")} aria-hidden />
            </span>
          )}
          {destaque ? (
            <span className="relative ml-auto inline-flex items-center gap-1 rounded-full border border-jb-200 bg-white px-2.5 py-1 text-[0.6875rem] font-bold text-jb-700 shadow-xs">
              <BadgeCheck className="size-3.5" aria-hidden />
              Todas as marcas
            </span>
          ) : null}
        </span>

        {imagem ? (
          <span
            className={cn(
              "relative -mt-4 block",
              destaque ? "h-52 sm:h-64 lg:h-[24rem]" : "h-28 sm:h-32",
            )}
          >
            <Image
              src={imagem}
              alt=""
              fill
              sizes={destaque ? "(min-width: 1024px) 40vw, 90vw" : "(min-width: 1024px) 20vw, 45vw"}
              className="jb-toque-foto object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.06]"
            />
            {/* Sombra de chão: funciona com foto de fundo branco, onde a
                sombra projetada desenharia um retângulo. */}
            <span
              aria-hidden
              className="absolute inset-x-[22%] bottom-0 h-3 rounded-[100%] bg-graf-950/15 blur-md transition-transform duration-500 group-hover:scale-x-90"
            />
          </span>
        ) : null}

        <span className={cn("relative mt-auto block", imagem ? "pt-3" : "pt-6")}>
          <span
            className={cn(
              "block font-extrabold tracking-tight text-graf-950",
              destaque ? "text-title" : "text-bloco",
            )}
          >
            {outro ? "Outro equipamento?" : equipamento.nome}
          </span>
          <span className={cn("mt-1.5 block text-sm leading-relaxed text-graf-600", destaque && "sm:text-corpo")}>
            {outro
              ? "Atendemos todas as marcas. Se souber, informe marca e modelo na triagem."
              : equipamento.defeitos.slice(0, destaque ? 4 : 3).join(", ")}
          </span>
          {aberto ? null : (
            <span aria-hidden className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-jb-600">
              <MarcaWhatsapp className="size-4" />
              {destaque || outro ? "Jeferson ou Jackson" : "Chamar"}
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
                lado={destaque || largo}
                coluna={!destaque && !largo}
              />
              {pagina ? (
                <Link
                  href={pagina}
                  prefetch={false}
                  className="foco-jb mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-bold text-graf-700 underline-offset-4 hover:text-jb-700 hover:underline"
                >
                  Ver conserto
                  <span className="sr-only"> de {equipamento.nome.toLowerCase()}</span>
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
        <h2 id="equipamentos-titulo" className="text-section texto-forte jb-revela max-w-2xl">
          Qual equipamento parou? <span className="text-jb-600">Toque e escolha com quem falar.</span>
        </h2>
        <p className="texto-guia jb-revela mt-4 max-w-2xl text-graf-600" style={{ "--i": 1 } as React.CSSProperties}>
          Atendemos todas as marcas. Jeferson ou Jackson: o WhatsApp abre com o nome do equipamento na mensagem; você completa com o que aconteceu.
        </p>

        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {EQUIPAMENTOS.map((equipamento, indice) => (
            <Cartao
              key={equipamento.id}
              equipamento={equipamento}
              contatos={contatos}
              destaque={equipamento.id === "autoclave"}
              largo={equipamento.id === "outro"}
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
