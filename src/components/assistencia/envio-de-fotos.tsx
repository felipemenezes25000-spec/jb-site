"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CloudUpload,
  FileText,
  ImageIcon,
  RotateCcw,
  Trash,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Envio das fotos do problema.
 *
 * Por que não usar `@/components/ui/enviar-arquivo`: aquele componente manda
 * só o arquivo no corpo do POST e devolve a URL. A rota `/api/upload` exige
 * também o campo `pasta`, e o que o chamado precisa guardar é o ID da mídia
 * (`ServiceRequestMedia.mediaId`), não o endereço do arquivo. São dois
 * contratos diferentes, então este componente é o específico da assistência —
 * mesma mecânica (arrastar e soltar, prévia local, progresso real por XHR,
 * erro por arquivo), outro corpo e outra saída.
 *
 * A validação daqui é só para dar resposta imediata. A palavra final é do
 * servidor, que confere o conteúdo do arquivo — não a extensão do nome.
 */

const MB = 1024 * 1024;

/** Mesma lista branca de `@/lib/upload` para a pasta `chamados`. */
const ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"];
const ROTULO_ACEITOS = "JPG, PNG, WebP, AVIF ou PDF";
const LIMITE_MB = 8;

type Estado = "enviando" | "pronto" | "erro";

type Item = {
  chave: string;
  nome: string;
  tamanho: number;
  mime: string;
  previa?: string;
  progresso: number;
  estado: Estado;
  erro?: string;
  mediaId?: string;
  /** Guardado só para o "Tentar de novo": quem falhou na conferência local
      não recebe o botão, porque tentar outra vez daria o mesmo resultado. */
  arquivo?: File;
};

type Resposta = {
  erro?: string;
  media?: { id?: string; filename?: string };
};

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / MB).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function postar(
  arquivo: File,
  aoProgresso: (porcento: number) => void,
): Promise<{ id: string; nome: string }> {
  return new Promise((resolver, rejeitar) => {
    const dados = new FormData();
    dados.append("arquivo", arquivo);
    dados.append("pasta", "chamados");

    const requisicao = new XMLHttpRequest();
    requisicao.open("POST", "/api/upload");

    requisicao.upload.addEventListener("progress", (evento) => {
      if (evento.lengthComputable) {
        aoProgresso(Math.round((evento.loaded / evento.total) * 100));
      }
    });

    requisicao.addEventListener("load", () => {
      let dadosResposta: Resposta;
      try {
        dadosResposta = JSON.parse(requisicao.responseText) as Resposta;
      } catch {
        rejeitar(new Error("Não conseguimos confirmar o envio. Tente de novo."));
        return;
      }
      if (dadosResposta.erro) {
        rejeitar(new Error(dadosResposta.erro));
        return;
      }
      if (!dadosResposta.media?.id) {
        rejeitar(new Error("O arquivo não chegou inteiro. Envie de novo."));
        return;
      }
      resolver({
        id: dadosResposta.media.id,
        nome: dadosResposta.media.filename ?? arquivo.name,
      });
    });

    requisicao.addEventListener("error", () =>
      rejeitar(new Error("A conexão caiu durante o envio. Tente de novo.")),
    );
    requisicao.addEventListener("abort", () => rejeitar(new Error("Envio cancelado.")));

    requisicao.send(dados);
  });
}

export function EnvioDeFotos({
  nome = "midia",
  maximo = 6,
  className,
}: {
  /** Nome dos inputs escondidos que levam os IDs de mídia no envio do form. */
  nome?: string;
  maximo?: number;
  className?: string;
}) {
  const idEntrada = useId();
  const idAjuda = `${idEntrada}-ajuda`;

  const [itens, setItens] = useState<Item[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const refEntrada = useRef<HTMLInputElement>(null);
  const refPrevias = useRef<string[]>([]);

  // As prévias são object URLs: sem revogar, ficam presas na memória da aba.
  useEffect(() => {
    const previas = refPrevias;
    return () => {
      for (const url of previas.current) URL.revokeObjectURL(url);
    };
  }, []);

  function atualizar(chave: string, mudanca: Partial<Item>) {
    setItens((atuais) =>
      atuais.map((item) => (item.chave === chave ? { ...item, ...mudanca } : item)),
    );
  }

  async function processar(arquivo: File, chave: string) {
    try {
      const enviado = await postar(arquivo, (porcento) =>
        atualizar(chave, { progresso: porcento }),
      );
      atualizar(chave, {
        estado: "pronto",
        progresso: 100,
        mediaId: enviado.id,
        erro: undefined,
      });
    } catch (erro) {
      atualizar(chave, {
        estado: "erro",
        erro: erro instanceof Error ? erro.message : "Não foi possível enviar.",
      });
    }
  }

  function adicionar(lista: FileList | null) {
    if (!lista || lista.length === 0) return;

    /* Arquivo recusado não ocupa vaga: o que conta é o que está indo ou já
       foi. Sem isso a lista dizia "2 de 6" e recusava o terceiro. */
    const espaco = Math.max(0, maximo - itens.filter((i) => i.estado !== "erro").length);
    const escolhidos = Array.from(lista);
    const aceitos = escolhidos.slice(0, espaco);
    const excedentes = escolhidos.slice(espaco);

    const novos: Item[] = [];
    const fila: { arquivo: File; chave: string }[] = [];

    for (const arquivo of aceitos) {
      const chave = `${Date.now()}-${arquivo.name}-${Math.random().toString(36).slice(2, 8)}`;
      let previa: string | undefined;
      if (arquivo.type.startsWith("image/")) {
        previa = URL.createObjectURL(arquivo);
        refPrevias.current.push(previa);
      }

      const item: Item = {
        chave,
        nome: arquivo.name,
        tamanho: arquivo.size,
        mime: arquivo.type,
        previa,
        progresso: 0,
        estado: "enviando",
      };

      if (!ACEITOS.includes(arquivo.type)) {
        item.estado = "erro";
        item.erro = `Este formato não entra pelo site. Envie ${ROTULO_ACEITOS}.`;
      } else if (arquivo.size > LIMITE_MB * MB) {
        item.estado = "erro";
        item.erro = `Passa de ${LIMITE_MB} MB (tem ${formatarTamanho(arquivo.size)}).`;
      } else {
        item.arquivo = arquivo;
        fila.push({ arquivo, chave });
      }

      novos.push(item);
    }

    for (const arquivo of excedentes) {
      novos.push({
        chave: `excedente-${Date.now()}-${arquivo.name}-${Math.random().toString(36).slice(2, 8)}`,
        nome: arquivo.name,
        tamanho: arquivo.size,
        mime: arquivo.type,
        progresso: 0,
        estado: "erro",
        erro: `Ficou de fora: o limite é de ${maximo} arquivos.`,
      });
    }

    setItens((atuais) => [...atuais, ...novos]);
    for (const item of fila) void processar(item.arquivo, item.chave);

    if (refEntrada.current) refEntrada.current.value = "";
  }

  function remover(chave: string) {
    setItens((atuais) => {
      const alvo = atuais.find((item) => item.chave === chave);
      if (alvo?.previa?.startsWith("blob:")) {
        URL.revokeObjectURL(alvo.previa);
        refPrevias.current = refPrevias.current.filter((url) => url !== alvo.previa);
      }
      return atuais.filter((item) => item.chave !== chave);
    });
  }

  /** Conexão que cai no meio do envio é o caso comum — e ela merece um botão. */
  function tentarDeNovo(item: Item) {
    if (!item.arquivo) return;
    atualizar(item.chave, { estado: "enviando", progresso: 0, erro: undefined });
    void processar(item.arquivo, item.chave);
  }

  const enviando = itens.some((item) => item.estado === "enviando");
  const prontos = itens.filter((item) => item.estado === "pronto" && item.mediaId);
  /* Arquivo recusado não ocupa vaga: só conta o que está indo ou já foi. */
  const usados = itens.filter((item) => item.estado !== "erro").length;
  const cheio = usados >= maximo;

  return (
    <div className={className}>
      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastando(false);
          adicionar(evento.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border border-dashed px-6 py-9 text-center transition-colors duration-150",
          arrastando
            ? "border-jb-500 bg-jb-50"
            : cheio
              ? "border-graf-300 bg-graf-50"
              : "border-graf-400 bg-graf-50/60",
        )}
      >
        <span
          aria-hidden
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-graf-600 shadow-card ring-1 ring-inset ring-graf-200"
        >
          <CloudUpload className="size-5" />
        </span>

        <p className="mt-4 text-[0.9375rem] font-bold text-graf-950">
          {cheio ? "Limite de arquivos atingido" : "Arraste as fotos até aqui"}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-graf-500">
          {cheio
            ? `Você já escolheu ${maximo} arquivos. Remova um da lista para colocar outro no lugar.`
            : "Ou escolha as imagens direto do computador ou do celular."}
        </p>

        <input
          ref={refEntrada}
          id={idEntrada}
          type="file"
          multiple
          disabled={cheio}
          accept={ACEITOS.join(",")}
          aria-describedby={idAjuda}
          onChange={(evento) => adicionar(evento.target.files)}
          /* `peer` porque o input é IRMÃO da label, não filho: `focus-within`
             na label nunca disparava e o botão ficava sem indicação de foco */
          className="peer sr-only"
        />
        <label
          htmlFor={idEntrada}
          className={cn(
            "mt-5 inline-flex min-h-11 select-none items-center justify-center rounded-lg border px-5 text-[0.9375rem] font-semibold transition-colors",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-jb-500",
            cheio
              ? "cursor-not-allowed border-graf-200 bg-graf-100 text-graf-500"
              : "cursor-pointer border-graf-300 bg-white text-graf-800 shadow-xs hover:border-graf-400 hover:bg-graf-50",
          )}
        >
          Escolher arquivos
        </label>

        <p id={idAjuda} className="mt-4 text-[0.8125rem] leading-relaxed text-graf-500">
          Até {maximo} arquivos de {LIMITE_MB} MB cada, em {ROTULO_ACEITOS}.
        </p>
      </div>

      {itens.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[0.8125rem] font-bold uppercase tracking-[0.06em] text-graf-500">
              Arquivos do chamado
            </p>
            <p className="tabular text-[0.8125rem] text-graf-500">
              {usados} de {maximo}
            </p>
          </div>

          <ul className="mt-3 space-y-2.5">
            {itens.map((item) => (
              <li
                key={item.chave}
                className={cn(
                  "flex items-center gap-4 rounded-xl border p-3",
                  item.estado === "erro"
                    ? "border-jb-200 bg-jb-50/60"
                    : "border-graf-200 bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                    item.estado === "erro"
                      ? "bg-jb-100 text-jb-700"
                      : "bg-graf-100 text-graf-500",
                  )}
                >
                  {item.estado === "erro" ? (
                    <TriangleAlert className="size-5" aria-hidden />
                  ) : item.previa ? (
                    /* object URL local: não passa pelo otimizador do next/image */
                    <img src={item.previa} alt="" className="size-full object-cover" />
                  ) : item.mime.startsWith("image/") ? (
                    <ImageIcon className="size-5" aria-hidden />
                  ) : (
                    <FileText className="size-5" aria-hidden />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-graf-950">{item.nome}</p>

                  {item.estado === "erro" ? (
                    <>
                      <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-jb-700">
                        {item.erro}
                      </p>
                      {item.arquivo && !cheio ? (
                        <button
                          type="button"
                          onClick={() => tentarDeNovo(item)}
                          className="-my-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold text-jb-700 underline underline-offset-2 transition-colors hover:text-jb-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          <RotateCcw className="size-3.5" aria-hidden />
                          Tentar de novo
                          <span className="sr-only"> o envio de {item.nome}</span>
                        </button>
                      ) : null}
                    </>
                  ) : item.estado === "enviando" ? (
                    <div className="mt-2 flex items-center gap-3">
                      <div
                        role="progressbar"
                        aria-valuenow={item.progresso}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Enviando ${item.nome}`}
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-graf-200"
                      >
                        <div
                          className="h-full rounded-full bg-jb-500 transition-[width] duration-200"
                          style={{ width: `${item.progresso}%` }}
                        />
                      </div>
                      <span className="tabular w-9 shrink-0 text-right text-[0.8125rem] text-graf-500">
                        {item.progresso}%
                      </span>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-[0.8125rem] text-graf-500">
                      Enviado · {formatarTamanho(item.tamanho)}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => remover(item.chave)}
                  aria-label={`Remover ${item.nome}`}
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-graf-500 transition-colors",
                    "hover:bg-graf-100 hover:text-jb-700",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                  )}
                >
                  <Trash className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {enviando
          ? "Enviando arquivos."
          : `${prontos.length} arquivo${prontos.length === 1 ? "" : "s"} pronto${
              prontos.length === 1 ? "" : "s"
            }.`}
      </p>

      {prontos.map((item) => (
        <input key={item.mediaId} type="hidden" name={nome} value={item.mediaId} />
      ))}
    </div>
  );
}
