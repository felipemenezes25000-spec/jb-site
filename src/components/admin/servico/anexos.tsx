"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/* ============================================================================
   Envio de anexos do backoffice técnico

   Fala com /api/upload, que exige a pasta lógica e devolve a mídia já gravada
   no banco. É por isso que este componente existe em vez do EnviarArquivo do
   kit: aqui o que interessa é o **id** da Media — é ele que as funções de
   domínio (`registrarMidia`, `mediaIds`) esperam —, e a pasta precisa viajar
   junto no mesmo POST.

   Cada arquivo sobe sozinho: um recusado pelo servidor não derruba os outros.
   As ids prontas saem em inputs escondidos, então o formulário em volta pode
   ser um form comum com server action.
   ============================================================================ */

export type PastaDeAnexo = "chamados" | "equipamentos" | "ordens" | "documentos";

export type MidiaEnviada = {
  id: string;
  url: string;
  nome: string;
  mime: string;
  tamanho: number;
};

type Item = {
  chave: string;
  nome: string;
  tamanho: number;
  mime: string;
  previa?: string;
  estado: "enviando" | "pronto" | "erro";
  erro?: string;
  midia?: MidiaEnviada;
};

type Resposta = {
  erro?: string;
  media?: {
    id?: string;
    url?: string;
    filename?: string;
    mime?: string;
    size?: number;
  };
};

const MB = 1024 * 1024;

function tamanhoLegivel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

async function enviar(arquivo: File, pasta: PastaDeAnexo): Promise<MidiaEnviada> {
  const dados = new FormData();
  dados.append("arquivo", arquivo);
  dados.append("pasta", pasta);

  const resposta = await fetch("/api/upload", { method: "POST", body: dados });

  let corpo: Resposta;
  try {
    corpo = (await resposta.json()) as Resposta;
  } catch {
    throw new Error("O servidor respondeu em um formato inesperado.");
  }

  if (!resposta.ok || corpo.erro) {
    throw new Error(corpo.erro ?? "Não foi possível enviar o arquivo.");
  }
  if (!corpo.media?.id || !corpo.media.url) {
    throw new Error("O servidor não devolveu o arquivo gravado.");
  }

  return {
    id: corpo.media.id,
    url: corpo.media.url,
    nome: corpo.media.filename ?? arquivo.name,
    mime: corpo.media.mime ?? arquivo.type,
    tamanho: corpo.media.size ?? arquivo.size,
  };
}

export function Anexos({
  nome,
  pasta,
  rotulo,
  ajuda,
  aceita = "image/jpeg,image/png,image/webp,image/avif,application/pdf",
  multiplo = true,
  maximoMb = 12,
  maximoDeArquivos = 10,
  aoMudar,
  className,
}: {
  /** `name` dos inputs escondidos que carregam as ids das mídias. */
  nome: string;
  pasta: PastaDeAnexo;
  rotulo: string;
  ajuda?: string;
  aceita?: string;
  multiplo?: boolean;
  maximoMb?: number;
  maximoDeArquivos?: number;
  /** Recebe as mídias prontas a cada mudança. */
  aoMudar?: (midias: MidiaEnviada[]) => void;
  className?: string;
}) {
  const base = useId();
  const idEntrada = `${base}-arquivo`;
  const idAjuda = `${base}-ajuda`;
  const [itens, setItens] = useState<Item[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const refEntrada = useRef<HTMLInputElement>(null);
  const refPrevias = useRef<string[]>([]);
  const refMudar = useRef(aoMudar);

  useEffect(() => {
    refMudar.current = aoMudar;
  });

  useEffect(() => {
    refMudar.current?.(itens.flatMap((item) => (item.midia ? [item.midia] : [])));
  }, [itens]);

  // as URLs de prévia são objetos vivos: sem revogar, vazam memória
  useEffect(() => {
    const previas = refPrevias.current;
    return () => {
      for (const url of previas) URL.revokeObjectURL(url);
    };
  }, []);

  function receber(lista: FileList | null) {
    if (!lista || lista.length === 0) return;

    const prontos = itens.filter((item) => item.estado !== "erro").length;
    const cabe = Math.max(0, maximoDeArquivos - prontos);
    const escolhidos = Array.from(lista).slice(0, multiplo ? cabe : Math.min(1, cabe));

    for (const arquivo of escolhidos) {
      const chave = `${arquivo.name}-${arquivo.size}-${Date.now()}-${Math.random()}`;
      const ehImagem = arquivo.type.startsWith("image/");
      const previa = ehImagem ? URL.createObjectURL(arquivo) : undefined;
      if (previa) refPrevias.current.push(previa);

      const novo: Item = {
        chave,
        nome: arquivo.name,
        tamanho: arquivo.size,
        mime: arquivo.type,
        previa,
        estado: "enviando",
      };

      if (arquivo.size > maximoMb * MB) {
        setItens((atual) => [
          ...atual,
          { ...novo, estado: "erro", erro: `Passa de ${maximoMb} MB.` },
        ]);
        continue;
      }

      setItens((atual) => [...atual, novo]);

      void enviar(arquivo, pasta)
        .then((midia) => {
          setItens((atual) =>
            atual.map((item) =>
              item.chave === chave ? { ...item, estado: "pronto", midia } : item,
            ),
          );
        })
        .catch((erro: unknown) => {
          const texto = erro instanceof Error ? erro.message : "Falha no envio.";
          setItens((atual) =>
            atual.map((item) =>
              item.chave === chave ? { ...item, estado: "erro", erro: texto } : item,
            ),
          );
        });
    }

    if (refEntrada.current) refEntrada.current.value = "";
  }

  function remover(chave: string) {
    setItens((atual) => atual.filter((item) => item.chave !== chave));
  }

  const enviando = itens.some((item) => item.estado === "enviando");

  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-semibold text-graf-800">{rotulo}</p>

      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastando(false);
          receber(evento.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
          arrastando ? "border-jb-500 bg-jb-50" : "border-graf-300 bg-graf-50/60",
        )}
      >
        <input
          ref={refEntrada}
          id={idEntrada}
          type="file"
          accept={aceita}
          multiple={multiplo}
          onChange={(evento) => receber(evento.target.files)}
          aria-describedby={ajuda ? idAjuda : undefined}
          className="sr-only"
        />
        <label
          htmlFor={idEntrada}
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-800",
            "transition-colors hover:border-graf-400 hover:bg-graf-50",
            "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-jb-500",
          )}
        >
          <Paperclip className="size-4" aria-hidden />
          Escolher arquivo{multiplo ? "s" : ""}
        </label>
        <p className="mt-2 text-[0.8125rem] text-graf-500">ou arraste e solte aqui</p>
      </div>

      {ajuda ? (
        <p id={idAjuda} className="mt-1.5 text-xs leading-relaxed text-graf-500">
          {ajuda}
        </p>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {enviando ? "Enviando arquivos." : `${itens.filter((i) => i.midia).length} arquivo(s) prontos.`}
      </p>

      {itens.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {itens.map((item) => (
            <li
              key={item.chave}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2",
                item.estado === "erro" ? "border-jb-200 bg-jb-50" : "border-graf-200 bg-white",
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-graf-100 text-graf-500">
                {item.previa ? (
                  // prévia local (object URL): não passa pelo otimizador de imagem
                  <img src={item.previa} alt="" className="size-full object-cover" />
                ) : item.estado === "erro" ? (
                  <TriangleAlert className="size-4 text-jb-600" aria-hidden />
                ) : (
                  <FileText className="size-4" aria-hidden />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-graf-900">{item.nome}</span>
                <span
                  className={cn(
                    "block text-xs",
                    item.estado === "erro" ? "text-jb-700" : "text-graf-500",
                  )}
                >
                  {item.estado === "enviando"
                    ? "Enviando…"
                    : item.estado === "erro"
                      ? item.erro
                      : tamanhoLegivel(item.midia?.tamanho ?? item.tamanho)}
                </span>
              </span>

              {item.estado === "enviando" ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-graf-500" aria-hidden />
              ) : (
                <button
                  type="button"
                  onClick={() => remover(item.chave)}
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-graf-500 transition-colors",
                    "hover:bg-graf-100 hover:text-jb-700",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                  )}
                >
                  <Trash2 className="size-4" aria-hidden />
                  <span className="sr-only">Remover {item.nome}</span>
                </button>
              )}

              {item.midia ? <input type="hidden" name={nome} value={item.midia.id} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Envio de um arquivo só, devolvendo url/mime/tamanho em campos escondidos.
 *
 * Serve ao laudo assinado da OS: `Document` guarda o caminho do arquivo, não a
 * id da mídia, então aqui o que viaja no formulário é o endereço gravado.
 */
export function AnexoUnico({
  prefixo,
  pasta,
  rotulo,
  ajuda,
  aceita = "application/pdf",
  maximoMb = 12,
  className,
}: {
  /** Gera os campos `<prefixo>Url`, `<prefixo>Nome`, `<prefixo>Mime`, `<prefixo>Tamanho`. */
  prefixo: string;
  pasta: PastaDeAnexo;
  rotulo: string;
  ajuda?: string;
  aceita?: string;
  maximoMb?: number;
  className?: string;
}) {
  const [midia, setMidia] = useState<MidiaEnviada | null>(null);

  return (
    <div className={className}>
      <Anexos
        nome={`${prefixo}MediaId`}
        pasta={pasta}
        rotulo={rotulo}
        ajuda={ajuda}
        aceita={aceita}
        multiplo={false}
        maximoMb={maximoMb}
        maximoDeArquivos={1}
        aoMudar={(midias) => setMidia(midias[0] ?? null)}
      />
      <input type="hidden" name={`${prefixo}Url`} value={midia?.url ?? ""} />
      <input type="hidden" name={`${prefixo}Nome`} value={midia?.nome ?? ""} />
      <input type="hidden" name={`${prefixo}Mime`} value={midia?.mime ?? ""} />
      <input type="hidden" name={`${prefixo}Tamanho`} value={String(midia?.tamanho ?? 0)} />
    </div>
  );
}
