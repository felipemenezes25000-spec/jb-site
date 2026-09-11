"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CloudUpload, FileText, ImageIcon, Trash, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Envio de arquivos
   Arrastar e soltar, prévia da imagem, barra de progresso e erro por arquivo —
   um arquivo recusado não derruba os outros da fila.

   A validação de tipo e tamanho acontece antes do POST só para dar resposta
   imediata; a palavra final continua sendo a do servidor, que valida de novo.
   As URLs prontas saem por `aoEnviado` e, se `nome` for informado, também
   viajam em inputs escondidos — assim funciona dentro de um form comum com
   server action.
   ============================================================================ */

export type ArquivoEnviado = {
  url: string;
  nome: string;
  mime?: string;
  tamanho?: number;
  id?: string;
  largura?: number | null;
  altura?: number | null;
};

type EstadoItem = "enviando" | "pronto" | "erro";

type Item = {
  chave: string;
  nome: string;
  tamanho: number;
  mime: string;
  previa?: string;
  progresso: number;
  estado: EstadoItem;
  erro?: string;
  enviado?: ArquivoEnviado;
};

type RespostaUpload = {
  erro?: string;
  url?: string;
  media?: {
    id?: string;
    url?: string;
    filename?: string;
    mime?: string;
    size?: number;
    width?: number | null;
    height?: number | null;
  };
};

const MB = 1024 * 1024;

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / MB).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

/** Aceita tanto mime ("image/png", "image/*") quanto extensão (".pdf"). */
function tipoPermitido(arquivo: File, aceita?: string[]) {
  if (!aceita || aceita.length === 0) return true;
  const nome = arquivo.name.toLowerCase();
  return aceita.some((regra) => {
    const alvo = regra.trim().toLowerCase();
    if (alvo.startsWith(".")) return nome.endsWith(alvo);
    if (alvo.endsWith("/*")) return arquivo.type.startsWith(alvo.slice(0, -1));
    return arquivo.type === alvo;
  });
}

function lerResposta(bruto: string, nomeLocal: string, mimeLocal: string, tamanhoLocal: number) {
  let dados: RespostaUpload;
  try {
    dados = JSON.parse(bruto) as RespostaUpload;
  } catch {
    throw new Error("O servidor respondeu em um formato inesperado.");
  }
  if (dados.erro) throw new Error(dados.erro);

  const url = dados.media?.url ?? dados.url;
  if (!url) throw new Error("O servidor não devolveu o endereço do arquivo.");

  const enviado: ArquivoEnviado = {
    url,
    nome: dados.media?.filename ?? nomeLocal,
    mime: dados.media?.mime ?? mimeLocal,
    tamanho: dados.media?.size ?? tamanhoLocal,
    id: dados.media?.id,
    largura: dados.media?.width ?? null,
    altura: dados.media?.height ?? null,
  };
  return enviado;
}

function postar(
  arquivo: File,
  endpoint: string,
  campo: string,
  aoProgresso: (porcento: number) => void,
): Promise<ArquivoEnviado> {
  return new Promise((resolver, rejeitar) => {
    const dados = new FormData();
    dados.append(campo, arquivo);

    const requisicao = new XMLHttpRequest();
    requisicao.open("POST", endpoint);
    requisicao.upload.addEventListener("progress", (evento) => {
      if (evento.lengthComputable) {
        aoProgresso(Math.round((evento.loaded / evento.total) * 100));
      }
    });
    requisicao.addEventListener("load", () => {
      try {
        if (requisicao.status < 200 || requisicao.status >= 300) {
          let mensagem = `Falha no envio (erro ${requisicao.status}).`;
          try {
            const corpo = JSON.parse(requisicao.responseText) as RespostaUpload;
            if (corpo.erro) mensagem = corpo.erro;
          } catch {
            /* resposta sem JSON: fica a mensagem genérica */
          }
          rejeitar(new Error(mensagem));
          return;
        }
        resolver(lerResposta(requisicao.responseText, arquivo.name, arquivo.type, arquivo.size));
      } catch (erro) {
        rejeitar(erro instanceof Error ? erro : new Error("Falha no envio."));
      }
    });
    requisicao.addEventListener("error", () => rejeitar(new Error("Sem conexão com o servidor.")));
    requisicao.addEventListener("abort", () => rejeitar(new Error("Envio cancelado.")));
    requisicao.send(dados);
  });
}

export function EnviarArquivo({
  rotulo,
  ajuda,
  nome,
  multiplo = false,
  aceita = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  tamanhoMaximoMb = 8,
  maximoDeArquivos,
  endpoint = "/api/admin/upload",
  campoDoArquivo = "arquivo",
  valorInicial,
  aoEnviado,
  desabilitado,
  className,
}: {
  rotulo: string;
  ajuda?: string;
  /** Quando informado, as URLs prontas saem em inputs escondidos com este name. */
  nome?: string;
  multiplo?: boolean;
  /** Mime ("image/png", "image/*") ou extensão (".pdf"). */
  aceita?: string[];
  tamanhoMaximoMb?: number;
  maximoDeArquivos?: number;
  endpoint?: string;
  campoDoArquivo?: string;
  valorInicial?: ArquivoEnviado[];
  aoEnviado?: (arquivos: ArquivoEnviado[]) => void;
  desabilitado?: boolean;
  className?: string;
}) {
  const idEntrada = useId();
  const idAjuda = `${idEntrada}-ajuda`;

  const [itens, setItens] = useState<Item[]>(() =>
    (valorInicial ?? []).map((arquivo, indice) => ({
      chave: `inicial-${indice}-${arquivo.url}`,
      nome: arquivo.nome,
      tamanho: arquivo.tamanho ?? 0,
      mime: arquivo.mime ?? "",
      previa: (arquivo.mime ?? "").startsWith("image/") ? arquivo.url : undefined,
      progresso: 100,
      estado: "pronto" as const,
      enviado: arquivo,
    })),
  );
  const [arrastando, setArrastando] = useState(false);
  const refEntrada = useRef<HTMLInputElement>(null);
  const refPrevias = useRef<string[]>([]);
  const refAoEnviado = useRef(aoEnviado);

  useEffect(() => {
    refAoEnviado.current = aoEnviado;
  });

  useEffect(() => {
    const prontos = itens.flatMap((item) =>
      item.estado === "pronto" && item.enviado ? [item.enviado] : [],
    );
    refAoEnviado.current?.(prontos);
  }, [itens]);

  // As prévias são object URLs; sem revogar, ficam presas na memória da aba.
  useEffect(() => {
    return () => {
      for (const url of refPrevias.current) URL.revokeObjectURL(url);
    };
  }, []);

  const limiteBytes = tamanhoMaximoMb * MB;
  const enviando = itens.some((item) => item.estado === "enviando");

  function atualizar(chave: string, mudanca: Partial<Item>) {
    setItens((atuais) =>
      atuais.map((item) => (item.chave === chave ? { ...item, ...mudanca } : item)),
    );
  }

  async function processar(arquivo: File, chave: string) {
    try {
      const enviado = await postar(arquivo, endpoint, campoDoArquivo, (porcento) =>
        atualizar(chave, { progresso: porcento }),
      );
      atualizar(chave, { estado: "pronto", progresso: 100, enviado, erro: undefined });
    } catch (erro) {
      atualizar(chave, {
        estado: "erro",
        erro: erro instanceof Error ? erro.message : "Não foi possível enviar.",
      });
    }
  }

  function adicionar(lista: FileList | null) {
    if (!lista || lista.length === 0 || desabilitado) return;
    const escolhidos = multiplo ? Array.from(lista) : Array.from(lista).slice(0, 1);

    // Fora do setState de propósito: criar prévia e disparar POST são efeitos,
    // e o React pode chamar o atualizador duas vezes em desenvolvimento.
    const base = multiplo ? itens : [];
    const espaco =
      maximoDeArquivos === undefined
        ? escolhidos.length
        : Math.max(0, maximoDeArquivos - base.length);
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

      if (!tipoPermitido(arquivo, aceita)) {
        item.estado = "erro";
        item.erro = `Formato não aceito. Envie ${aceita.join(", ")}.`;
      } else if (arquivo.size > limiteBytes) {
        item.estado = "erro";
        item.erro = `Passa de ${tamanhoMaximoMb} MB (tem ${formatarTamanho(arquivo.size)}).`;
      } else {
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
        erro: `Limite de ${maximoDeArquivos} arquivo(s) atingido.`,
      });
    }

    if (!multiplo) {
      for (const antigo of itens) {
        if (antigo.previa?.startsWith("blob:")) URL.revokeObjectURL(antigo.previa);
      }
    }

    setItens([...base, ...novos]);
    for (const item of fila) void processar(item.arquivo, item.chave);

    if (refEntrada.current) refEntrada.current.value = "";
  }

  function remover(chave: string) {
    setItens((atuais) => {
      const alvo = atuais.find((item) => item.chave === chave);
      if (alvo?.previa && alvo.previa.startsWith("blob:")) {
        URL.revokeObjectURL(alvo.previa);
        refPrevias.current = refPrevias.current.filter((url) => url !== alvo.previa);
      }
      return atuais.filter((item) => item.chave !== chave);
    });
  }

  const prontos = itens.flatMap((item) =>
    item.estado === "pronto" && item.enviado ? [item.enviado] : [],
  );

  return (
    <div className={className}>
      <label htmlFor={idEntrada} className="mb-1.5 block text-sm font-semibold text-graf-800">
        {rotulo}
      </label>

      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          if (!desabilitado) setArrastando(true);
        }}
        onDragLeave={(evento) => {
          evento.preventDefault();
          setArrastando(false);
        }}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastando(false);
          adicionar(evento.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
          desabilitado
            ? "cursor-not-allowed border-graf-200 bg-graf-50"
            : arrastando
              ? "border-jb-500 bg-jb-50"
              : "border-graf-300 bg-graf-50/60 hover:border-graf-400",
        )}
      >
        <CloudUpload
          className={cn("mb-3 size-7", arrastando ? "text-jb-600" : "text-graf-500")}
          aria-hidden
        />
        <p className="text-sm font-medium text-graf-800">
          Arraste {multiplo ? "os arquivos" : "o arquivo"} aqui
        </p>
        <p className="mt-0.5 text-sm text-graf-500">ou</p>

        <input
          ref={refEntrada}
          id={idEntrada}
          type="file"
          multiple={multiplo}
          accept={aceita.join(",")}
          disabled={desabilitado}
          aria-describedby={idAjuda}
          onChange={(evento) => adicionar(evento.currentTarget.files)}
          className="peer sr-only"
        />
        <label
          htmlFor={idEntrada}
          className={cn(
            "mt-2 inline-flex min-h-11 cursor-pointer select-none items-center justify-center rounded-lg border border-graf-300 bg-white px-5 text-corpo font-semibold text-graf-800 transition-colors",
            "hover:border-graf-400 hover:bg-graf-50",
            desabilitado && "pointer-events-none opacity-60",
          )}
        >
          Escolher {multiplo ? "arquivos" : "arquivo"}
        </label>

        <p id={idAjuda} className="mt-3 text-xs leading-relaxed text-graf-500">
          {ajuda ?? `Até ${tamanhoMaximoMb} MB por arquivo. Formatos: ${aceita.join(", ")}.`}
        </p>
      </div>

      {itens.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {itens.map((item) => (
            <li
              key={item.chave}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-white p-3",
                item.estado === "erro" ? "border-jb-200 bg-jb-50/50" : "border-graf-200",
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md",
                  item.estado === "erro" ? "bg-jb-100 text-jb-700" : "bg-graf-100 text-graf-500",
                )}
              >
                {item.estado === "erro" ? (
                  <TriangleAlert className="size-5" aria-hidden />
                ) : item.previa ? (
                  /* object URL local, sem passar pelo otimizador do next/image */
                  <img src={item.previa} alt="" className="size-full object-cover" />
                ) : item.mime.startsWith("image/") ? (
                  <ImageIcon className="size-5" aria-hidden />
                ) : (
                  <FileText className="size-5" aria-hidden />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-graf-900">{item.nome}</p>

                {item.estado === "erro" ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-jb-700">{item.erro}</p>
                ) : item.estado === "enviando" ? (
                  <div className="mt-1.5 flex items-center gap-2">
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
                    <span className="tabular w-9 shrink-0 text-right text-xs text-graf-500">
                      {item.progresso}%
                    </span>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-graf-500">
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
      ) : null}

      <p className="sr-only" aria-live="polite">
        {enviando ? "Enviando arquivos." : `${prontos.length} arquivo(s) prontos.`}
      </p>

      {nome
        ? prontos.map((arquivo) => (
            <input key={arquivo.url} type="hidden" name={nome} value={arquivo.url} />
          ))
        : null}
    </div>
  );
}
