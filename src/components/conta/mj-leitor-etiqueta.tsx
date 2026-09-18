"use client";

import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Camera, Check, Info, ScanLine, X } from "lucide-react";

import { lerEtiquetaDaFoto, type SugestaoDaEtiqueta } from "@/app/acoes/etiqueta";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { Campo } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export type CamposAplicaveis = {
  marca: string;
  modelo: string;
  serie: string;
  voltagem: string;
};

export type AoConfirmar = (campos: CamposAplicaveis) => void;

export function LeitorDeEtiqueta({
  aoConfirmar,
  className,
}: {
  aoConfirmar: AoConfirmar;
  className?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const reduzirMovimento = useReducedMotion();
  const [pendente, iniciar] = useTransition();
  const [resposta, setResposta] = useState<SugestaoDaEtiqueta | null>(null);
  const [campos, setCampos] = useState<CamposAplicaveis>({
    marca: "",
    modelo: "",
    serie: "",
    voltagem: "",
  });

  function enviar(arquivo: File) {
    const dados = new FormData();
    dados.set("foto", arquivo);
    setResposta(null);

    iniciar(async () => {
      const resultado = await lerEtiquetaDaFoto(dados);
      setResposta(resultado);

      if (resultado.ok) {
        setCampos({
          marca: resultado.campos.marca?.valor ?? "",
          modelo: resultado.campos.modelo?.valor ?? "",
          serie: resultado.campos.serial?.valor ?? "",
          voltagem: resultado.campos.voltagem?.valor ?? "",
        });
      }
    });
  }

  return (
    <div
      data-leitor-etiqueta
      className={cn(
        "relative overflow-hidden rounded-xl border border-graf-200 bg-graf-50 p-4",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full border border-jb-500/10" aria-hidden />
      <div className="pointer-events-none absolute -right-4 -top-8 size-24 rounded-full border border-jb-500/10" aria-hidden />

      <p className="relative flex items-center gap-2 text-sm font-bold text-graf-950">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white text-jb-700 shadow-xs ring-1 ring-graf-200">
          <ScanLine className="size-4" aria-hidden />
        </span>
        Ler a etiqueta do equipamento
      </p>
      <p className="relative mt-2 text-[0.875rem] leading-relaxed text-graf-600">
        Fotografe a etiqueta que costuma ficar atrás ou embaixo do aparelho. A leitura sugere
        marca, modelo, série e voltagem; você confere antes de usar. A foto é descartada.
      </p>

      <input
        ref={entrada}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Foto da etiqueta do equipamento"
        tabIndex={-1}
        className="sr-only"
        onChange={(evento) => {
          const arquivo = evento.target.files?.[0];
          if (arquivo) enviar(arquivo);
          evento.target.value = "";
        }}
      />

      <Botao
        type="button"
        variante="secundario"
        tamanho="sm"
        className="relative mt-3"
        carregando={pendente}
        onClick={() => entrada.current?.click()}
      >
        <Camera className="size-4" aria-hidden />
        Ler etiqueta com a câmera
      </Botao>

      <AnimatePresence initial={false} mode="wait">
        {pendente ? (
          <motion.div
            key="lendo"
            role="status"
            initial={reduzirMovimento ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: reduzirMovimento ? 0 : 0.22 }}
            className="relative mt-4 overflow-hidden rounded-xl border border-jb-200 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-jb-50 text-jb-700">
                <ScanLine className="size-4" aria-hidden />
                {!reduzirMovimento ? (
                  <motion.span
                    aria-hidden
                    className="absolute inset-x-1 h-px bg-jb-500 shadow-[0_0_8px_rgba(224,20,27,.55)]"
                    initial={{ top: "20%", opacity: 0 }}
                    animate={{ top: ["20%", "78%", "20%"], opacity: [0, 1, 0.5] }}
                    transition={{ duration: 1.45, repeat: Infinity, ease: "easeInOut" }}
                  />
                ) : null}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-graf-950">Lendo a identificação…</p>
                <p className="mt-1 text-xs leading-relaxed text-graf-500">
                  Procurando marca, modelo, número de série e voltagem. Nada será aplicado sem
                  sua confirmação.
                </p>
              </div>
            </div>
            {!reduzirMovimento ? (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-jb-500/5 to-transparent"
                initial={{ left: "-20%" }}
                animate={{ left: "110%" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            ) : null}
          </motion.div>
        ) : null}

        {resposta && !resposta.ok ? (
          <motion.div
            key="falha"
            initial={reduzirMovimento ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduzirMovimento ? 0 : 0.2 }}
          >
            <Aviso
              tom={resposta.motivo === "sem_mecanismo" ? "info" : "atencao"}
              className="mt-4"
              titulo={
                resposta.motivo === "sem_mecanismo"
                  ? "Leitura automática indisponível"
                  : "Não deu para aproveitar esta foto"
              }
            >
              {resposta.texto}
            </Aviso>
          </motion.div>
        ) : null}

        {resposta?.ok ? (
          <motion.div
            key="resultado"
            initial={reduzirMovimento ? false : { opacity: 0, y: 9, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduzirMovimento ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-4 space-y-4 overflow-hidden rounded-xl border border-graf-300 bg-white p-4 shadow-sm"
          >
            <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-jb-400 via-jb-600 to-transparent" aria-hidden />

            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-ok-50 text-ok-700">
                <Check className="size-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-corpo font-semibold text-graf-950">{resposta.aviso}</p>
                <p className="mt-1 text-xs leading-relaxed text-graf-500">
                  A confiança abaixo é da leitura da imagem, não uma validação técnica do
                  equipamento. Confira os caracteres na etiqueta antes de aplicar.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <CampoSugerido
                rotulo="Marca"
                valor={campos.marca}
                aoMudar={(valor) => setCampos({ ...campos, marca: valor })}
                bruto={resposta.campos.marca?.bruto}
                confianca={resposta.campos.marca?.confianca ?? null}
              />
              <CampoSugerido
                rotulo="Modelo"
                valor={campos.modelo}
                aoMudar={(valor) => setCampos({ ...campos, modelo: valor })}
                bruto={resposta.campos.modelo?.bruto}
                confianca={resposta.campos.modelo?.confianca ?? null}
              />
              <CampoSugerido
                rotulo="Número de série"
                valor={campos.serie}
                aoMudar={(valor) => setCampos({ ...campos, serie: valor })}
                bruto={resposta.campos.serial?.bruto}
                confianca={resposta.campos.serial?.confianca ?? null}
                alternativas={resposta.campos.serial?.alternativas ?? []}
              />
              <CampoSugerido
                rotulo="Voltagem"
                valor={campos.voltagem}
                aoMudar={(valor) => setCampos({ ...campos, voltagem: valor })}
                bruto={resposta.campos.voltagem?.bruto}
                confianca={resposta.campos.voltagem?.confianca ?? null}
              />
            </div>

            <p className="flex gap-2 border-t border-graf-200 pt-3 text-apoio leading-relaxed text-graf-500">
              <Info className="mt-0.5 size-3.5 shrink-0 text-graf-500" aria-hidden />
              <span>{resposta.limite}</span>
            </p>

            <div className="flex flex-wrap gap-2">
              <Botao
                type="button"
                tamanho="sm"
                onClick={() => {
                  aoConfirmar(campos);
                  setResposta(null);
                }}
              >
                <Check className="size-4" aria-hidden />
                Usar estes dados
              </Botao>
              <Botao
                type="button"
                variante="secundario"
                tamanho="sm"
                onClick={() => setResposta(null)}
              >
                <X className="size-4" aria-hidden />
                Descartar
              </Botao>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CampoSugerido({
  rotulo,
  valor,
  aoMudar,
  bruto,
  confianca,
  alternativas = [],
}: {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  bruto?: string;
  confianca: number | null;
  alternativas?: string[];
}) {
  const percentual = confianca === null ? null : Math.max(0, Math.min(100, Math.round(confianca * 100)));

  return (
    <div>
      <Campo
        rotulo={rotulo}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        ajuda={bruto && bruto.trim() !== valor.trim() ? `Na etiqueta: "${bruto}"` : undefined}
      />

      {percentual !== null ? (
        <div className="mt-2" aria-label={`Confiança da leitura de ${rotulo}: ${percentual}%`}>
          <div className="flex items-center justify-between gap-3 text-[0.6875rem] font-semibold text-graf-500">
            <span>Confiança da leitura</span>
            <span className="tabular font-mono text-graf-700">{percentual}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-graf-100">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                percentual >= 85
                  ? "bg-ok-500"
                  : percentual >= 65
                    ? "bg-warn-500"
                    : "bg-jb-500",
              )}
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>
      ) : null}

      {alternativas.length > 0 ? (
        <div className="mt-2.5">
          <p className="text-[0.75rem] text-graf-500">
            Caracteres parecidos. Confira no aparelho:
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {alternativas.map((alternativa) => (
              <button
                key={alternativa}
                type="button"
                onClick={() => aoMudar(alternativa)}
                className="label-mono rounded border border-graf-300 bg-white px-2 py-1 text-[0.75rem] text-graf-700 transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                {alternativa}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
