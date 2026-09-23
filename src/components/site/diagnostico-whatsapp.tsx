"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCheck, ChevronLeft, RotateCcw, Siren } from "lucide-react";

import { medir } from "@/lib/analytics/cliente";
import {
  EQUIPAMENTOS,
  SITUACOES,
  equipamentoPorId,
  montarMensagem,
  situacaoPorId,
  toquesDados,
  type IdEquipamento,
  type IdSituacao,
} from "@/lib/diagnostico";
import { OpcoesWhatsapp } from "@/components/site/opcoes-whatsapp";
import type { ContatoWhatsapp } from "@/lib/contatos-whatsapp";
import { ICONE_DO_EQUIPAMENTO, IMAGEM_DO_EQUIPAMENTO } from "@/components/site/icones-equipamento";
import { MarcaWhatsapp } from "@/components/site/marca-whatsapp";
import { cn } from "@/lib/utils";

/* ============================================================================
   Diagnóstico em 3 toques

   Equipamento → problema → situação da clínica. A cada toque a mensagem se
   escreve no balão, do jeito que vai chegar para a equipe, e o botão abre o
   WhatsApp com ela pronta. Nada é enviado pelo site: quem envia é a pessoa,
   dentro do WhatsApp, depois de ler.

   O botão funciona desde o primeiro segundo. Quem não quer tocar em nada
   chama com a mensagem padrão; o diagnóstico acelera a triagem, não é
   pedágio.

   Cada toque mede o passo do funil (`assistance_step_1..3`) com o
   equipamento escolhido. Nunca a cidade: texto digitado não sai daqui.
   ============================================================================ */

type Passo = 0 | 1 | 2 | 3;

/** Negrito do WhatsApp (`*assim*`) vira <strong> no balão. */
function LinhaDoBalao({ texto }: { texto: string }) {
  const partes = texto.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {partes.map((parte, indice) =>
        parte.startsWith("*") && parte.endsWith("*") ? (
          <strong key={indice} className="font-bold">
            {parte.slice(1, -1)}
          </strong>
        ) : (
          <Fragment key={indice}>{parte}</Fragment>
        ),
      )}
    </>
  );
}

function Progresso({ toques }: { toques: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2" aria-label={`${toques} de 3 toques`}>
      <span className="tabular text-apoio font-bold text-graf-600" aria-hidden>
        {toques}/3
      </span>
      <span className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "h-1.5 w-5 rounded-full transition-colors duration-300",
              n <= toques ? "bg-jb-500" : "bg-graf-200",
            )}
          />
        ))}
      </span>
    </div>
  );
}

export function DiagnosticoWhatsapp({ contatos }: { contatos: ContatoWhatsapp[] }) {
  const reduzir = useReducedMotion();
  const [equipamentoId, setEquipamentoId] = useState<IdEquipamento | null>(null);
  const [defeito, setDefeito] = useState<string | null>(null);
  const [situacaoId, setSituacaoId] = useState<IdSituacao | null>(null);
  const [cidade, setCidade] = useState("");
  const [passo, setPasso] = useState<Passo>(0);

  const equipamento = equipamentoPorId(equipamentoId);
  const situacao = situacaoPorId(situacaoId);
  const escolhas = { equipamento: equipamentoId, defeito, situacao: situacaoId, cidade };
  const toques = toquesDados(escolhas);
  const mensagem = montarMensagem(escolhas);
  const linhas = mensagem.split("\n");
  const pronto = toques === 3;

  const transicao = reduzir
    ? { duration: 0 }
    : { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const };

  function escolherEquipamento(id: IdEquipamento) {
    if (id !== equipamentoId) setDefeito(null);
    setEquipamentoId(id);
    setPasso(1);
    medir("assistance_step_1", { categoria: id, etapa: "diagnostico" });
  }

  function escolherDefeito(texto: string) {
    setDefeito(texto);
    setPasso(2);
    medir("assistance_step_2", { categoria: equipamentoId ?? "", etapa: "diagnostico" });
  }

  function escolherSituacao(id: IdSituacao) {
    setSituacaoId(id);
    setPasso(3);
    medir("assistance_step_3", {
      categoria: equipamentoId ?? "",
      etapa: "diagnostico",
      resultado: id,
    });
  }

  function recomecar() {
    setEquipamentoId(null);
    setDefeito(null);
    setSituacaoId(null);
    setPasso(0);
  }

  const trilha: { rotulo: string; passo: Passo }[] = [
    ...(equipamento ? [{ rotulo: equipamento.nome, passo: 0 as Passo }] : []),
    ...(defeito ? [{ rotulo: defeito, passo: 1 as Passo }] : []),
    ...(situacao ? [{ rotulo: situacao.rotulo, passo: 2 as Passo }] : []),
  ];

  return (
    <section
      id="diagnostico"
      aria-labelledby="diagnostico-titulo"
      className="jb-borda-viva relative scroll-mt-24 rounded-2xl border border-graf-200 bg-white shadow-pop"
    >
      <header className="flex items-start justify-between gap-4 border-b border-graf-100 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id="diagnostico-titulo" className="text-[1.0625rem] font-extrabold leading-tight text-graf-950">
            Monte sua mensagem em 3 toques
          </h2>
          <p className="mt-1 text-apoio text-graf-500">Ela chega pronta para a equipe técnica.</p>
        </div>
        <Progresso toques={toques} />
      </header>

      <motion.div layout={!reduzir} transition={transicao} className="px-4 py-5 sm:px-6">
        {trilha.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {trilha.map((item) => (
              <button
                key={item.passo}
                type="button"
                onClick={() => setPasso(item.passo)}
                className="foco-jb inline-flex min-h-8 items-center gap-1 rounded-full bg-jb-50 px-3 text-xs font-bold text-jb-800 transition-colors hover:bg-jb-100"
              >
                {item.rotulo}
                <span className="sr-only">(trocar)</span>
              </button>
            ))}
            <button
              type="button"
              onClick={recomecar}
              className="foco-jb inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-graf-500 transition-colors hover:bg-graf-100 hover:text-graf-800"
            >
              <RotateCcw className="size-3" aria-hidden />
              Recomeçar
            </button>
          </div>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={passo}
            initial={reduzir ? false : { opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduzir ? undefined : { opacity: 0, x: -14 }}
            transition={transicao}
          >
            {passo === 0 ? (
              <fieldset>
                <legend className="text-sm font-bold text-graf-900">
                  <span className="text-jb-600">1.</span> Qual equipamento?
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {EQUIPAMENTOS.map((item) => {
                    const Icone = ICONE_DO_EQUIPAMENTO[item.id];
                    const imagem = IMAGEM_DO_EQUIPAMENTO[item.id];
                    const escolhido = item.id === equipamentoId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={escolhido}
                        onClick={() => escolherEquipamento(item.id)}
                        className={cn(
                          "foco-jb group flex min-h-[4.75rem] flex-col items-start justify-between gap-2 rounded-xl border p-3 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 active:scale-[0.98]",
                          escolhido
                            ? "border-jb-500 bg-jb-50 shadow-xs"
                            : "border-graf-200 bg-white hover:-translate-y-0.5 hover:border-jb-300 hover:shadow-card",
                        )}
                      >
                        {imagem ? (
                          <span className="relative block size-11">
                            <Image
                              src={imagem}
                              alt=""
                              fill
                              sizes="44px"
                              className="object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-110"
                            />
                          </span>
                        ) : (
                          <span className="flex size-11 items-center justify-center">
                            <Icone
                              className={cn(
                                "size-6 transition-colors",
                                escolhido ? "text-jb-600" : "text-graf-500 group-hover:text-jb-600",
                              )}
                              aria-hidden
                            />
                          </span>
                        )}
                        <span className="text-[0.8125rem] font-bold leading-tight text-graf-900">
                          {item.nome}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {passo === 1 && equipamento ? (
              <fieldset>
                <legend className="text-sm font-bold text-graf-900">
                  <span className="text-jb-600">2.</span> O que está acontecendo?
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {equipamento.defeitos.map((texto) => {
                    const escolhido = texto === defeito;
                    return (
                      <button
                        key={texto}
                        type="button"
                        aria-pressed={escolhido}
                        onClick={() => escolherDefeito(texto)}
                        className={cn(
                          "foco-jb min-h-11 rounded-full border px-4 text-sm font-semibold transition-[border-color,background-color,color,transform] duration-200 active:scale-[0.98]",
                          escolhido
                            ? "border-jb-500 bg-jb-500 text-white"
                            : "border-graf-200 bg-white text-graf-800 hover:border-jb-300 hover:bg-jb-50 hover:text-jb-800",
                        )}
                      >
                        {texto}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setPasso(0)}
                  className="foco-jb mt-4 inline-flex min-h-9 items-center gap-1 rounded-md text-xs font-semibold text-graf-500 hover:text-graf-800"
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Trocar equipamento
                </button>
              </fieldset>
            ) : null}

            {passo === 2 ? (
              <fieldset>
                <legend className="text-sm font-bold text-graf-900">
                  <span className="text-jb-600">3.</span> Como está a clínica agora?
                </legend>
                <div className="mt-3 grid gap-2">
                  {SITUACOES.map((item) => {
                    const escolhido = item.id === situacaoId;
                    const urgente = item.id === "parado";
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={escolhido}
                        onClick={() => escolherSituacao(item.id)}
                        className={cn(
                          "foco-jb flex min-h-12 items-center gap-3 rounded-xl border px-4 text-left text-sm font-bold transition-[border-color,background-color,transform] duration-200 active:scale-[0.99]",
                          escolhido
                            ? "border-jb-500 bg-jb-50 text-jb-800"
                            : urgente
                              ? "border-jb-200 bg-white text-graf-900 hover:border-jb-400 hover:bg-jb-50"
                              : "border-graf-200 bg-white text-graf-900 hover:border-graf-300 hover:bg-graf-50",
                        )}
                      >
                        {urgente ? (
                          <Siren className="size-4 shrink-0 text-jb-600" aria-hidden />
                        ) : (
                          <span className="size-4 shrink-0" aria-hidden />
                        )}
                        {item.rotulo}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            {passo === 3 ? (
              <div>
                <p className="text-sm font-bold text-graf-900">
                  {situacaoId === "parado"
                    ? "Pronto. A mensagem já avisa que o equipamento está parado."
                    : "Pronto. Confira a mensagem e envie."}
                </p>
                <label htmlFor="diagnostico-cidade" className="mt-4 block text-xs font-bold text-graf-700">
                  Cidade da clínica <span className="font-medium text-graf-500">(opcional)</span>
                </label>
                <input
                  id="diagnostico-cidade"
                  type="text"
                  inputMode="text"
                  autoComplete="address-level2"
                  maxLength={60}
                  value={cidade}
                  onChange={(evento) => setCidade(evento.target.value)}
                  placeholder="Ex.: Osasco"
                  className="mt-1.5 min-h-11 w-full rounded-lg border border-graf-300 bg-white px-3.5 text-base text-graf-900 placeholder:text-graf-450 focus:border-jb-500 focus:outline-2 focus:outline-offset-1 focus:outline-jb-500/30"
                />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="rounded-b-2xl border-t border-graf-100 bg-graf-50 px-4 pb-4 pt-4 sm:px-6 sm:pb-5">
        <div className="rounded-xl bg-graf-100/80 p-3" aria-label="Prévia da mensagem">
          <p className="mb-2 flex items-center gap-1.5 text-[0.6875rem] font-bold text-graf-500">
            <MarcaWhatsapp className="size-3" />
            Para: {contatos.map((contato) => contato.nome).filter(Boolean).join(" ou ") || "equipe técnica JB"}
          </p>
          <div className="ml-auto w-fit max-w-[92%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[0.8125rem] leading-snug text-[#111b21] shadow-xs">
            <AnimatePresence initial={false}>
              {linhas.map((linha, indice) =>
                linha === "" ? (
                  <span key={`vazio-${indice}`} className="block h-2" aria-hidden />
                ) : (
                  <motion.span
                    key={linha}
                    initial={reduzir ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={transicao}
                    className="block"
                  >
                    <LinhaDoBalao texto={linha} />
                  </motion.span>
                ),
              )}
            </AnimatePresence>
            <span className="mt-1 flex justify-end text-[#53bdeb]" aria-hidden>
              <CheckCheck className="size-3.5" />
            </span>
          </div>
        </div>

        <OpcoesWhatsapp
          contatos={contatos}
          mensagem={mensagem}
          posicao="diagnostico"
          equipamento={equipamentoId ?? undefined}
          tamanho="lg"
          lado
          pulso={pronto && !reduzir ? 2 : false}
          className="mt-3"
        />
        <p className="mt-2.5 text-center text-xs text-graf-500">
          Abre o WhatsApp com o texto pronto. Você revisa antes de enviar.
        </p>
      </div>
    </section>
  );
}
