"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileText, ImagePlus, Trash2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Anexos do cliente (fotos e PDFs) para chamados e equipamentos.
 *
 * Existe separado do `EnviarArquivo` do kit porque a rota pública
 * `/api/upload` exige o campo `pasta` no corpo do envio — é ela que decide o
 * que o cliente pode mandar e onde o arquivo cai. O componente do kit manda só
 * o arquivo.
 *
 * O que sai daqui para o formulário é o **id da mídia** já gravada, em inputs
 * escondidos: a server action nunca recebe URL digitada, e sim uma linha de
 * `Media` que o servidor criou. Sem JavaScript o bloco não aparece — anexo é
 * opcional em todos os formulários que o usam, então nada trava.
 */

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
};

type Resposta = {
  erro?: string;
  media?: { id?: string; url?: string; filename?: string; mime?: string };
};

const MB = 1024 * 1024;

const TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
];

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / MB).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function enviar(
  arquivo: File,
  pasta: string,
  aoProgresso: (porcento: number) => void,
): Promise<{ id: string; url: string }> {
  return new Promise((resolver, rejeitar) => {
    const corpo = new FormData();
    corpo.append("arquivo", arquivo);
    corpo.append("pasta", pasta);

    const requisicao = new XMLHttpRequest();
    requisicao.open("POST", "/api/upload");
    requisicao.upload.addEventListener("progress", (evento) => {
      if (evento.lengthComputable) {
        aoProgresso(Math.round((evento.loaded / evento.total) * 100));
      }
    });
    requisicao.addEventListener("load", () => {
      let dados: Resposta = {};
      try {
        dados = JSON.parse(requisicao.responseText) as Resposta;
      } catch {
        rejeitar(new Error("O servidor respondeu em um formato inesperado."));
        return;
      }
      if (requisicao.status < 200 || requisicao.status >= 300 || dados.erro) {
        rejeitar(new Error(dados.erro ?? `Falha no envio (erro ${requisicao.status}).`));
        return;
      }
      if (!dados.media?.id || !dados.media.url) {
        rejeitar(new Error("O servidor não devolveu o arquivo salvo."));
        return;
      }
      resolver({ id: dados.media.id, url: dados.media.url });
    });
    requisicao.addEventListener("error", () =>
      rejeitar(new Error("Sem conexão com o servidor.")),
    );
    requisicao.send(corpo);
  });
}

export function Anexos({
  nome,
  rotulo = "Fotos e documentos",
  ajuda = "JPG, PNG, WebP ou PDF. Até 8 MB por imagem e 16 MB por PDF.",
  pasta,
  maximo = 6,
  className,
}: {
  /** Nome dos inputs escondidos que levam os ids das mídias ao formulário. */
  nome: string;
  rotulo?: string;
  ajuda?: string;
  /** Pasta lógica aceita para o cliente em /api/upload. */
  pasta: "chamados" | "equipamentos";
  maximo?: number;
  className?: string;
}) {
  const idEntrada = useId();
  const idAjuda = `${idEntrada}-ajuda`;
  const [itens, setItens] = useState<Item[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const refEntrada = useRef<HTMLInputElement>(null);
  const refPrevias = useRef<string[]>([]);

  useEffect(() => {
    const previas = refPrevias.current;
    return () => {
      for (const url of previas) URL.revokeObjectURL(url);
    };
  }, []);

  function atualizar(chave: string, mudanca: Partial<Item>) {
    setItens((atuais) =>
      atuais.map((item) => (item.chave === chave ? { ...item, ...mudanca } : item)),
    );
  }

  async function processar(arquivo: File, chave: string) {
    try {
      const salvo = await enviar(arquivo, pasta, (porcento) =>
        atualizar(chave, { progresso: porcento }),
      );
      atualizar(chave, { estado: "pronto", progresso: 100, mediaId: salvo.id });
    } catch (erro) {
      atualizar(chave, {
        estado: "erro",
        erro: erro instanceof Error ? erro.message : "Não foi possível enviar.",
      });
    }
  }

  function adicionar(escolhidos: FileList | null) {
    if (!escolhidos || escolhidos.length === 0) return;

    const espaco = Math.max(0, maximo - itens.filter((i) => i.estado !== "erro").length);
    const aceitos = Array.from(escolhidos).slice(0, espaco);
    const sobra = Array.from(escolhidos).slice(espaco);

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

      if (!TIPOS_ACEITOS.includes(arquivo.type)) {
        item.estado = "erro";
        item.erro = "Formato não aceito. Envie JPG, PNG, WebP ou PDF.";
      } else {
        fila.push({ arquivo, chave });
      }
      novos.push(item);
    }

    for (const arquivo of sobra) {
      novos.push({
        chave: `sobra-${Date.now()}-${arquivo.name}-${Math.random().toString(36).slice(2, 8)}`,
        nome: arquivo.name,
        tamanho: arquivo.size,
        mime: arquivo.type,
        progresso: 0,
        estado: "erro",
        erro: `Limite de ${maximo} arquivos atingido.`,
      });
    }

    setItens((atuais) => [...atuais, ...novos]);
    for (const item of fila) void processar(item.arquivo, item.chave);
    if (refEntrada.current) refEntrada.current.value = "";
  }

  function remover(chave: string) {
    setItens((atuais) => {
      const alvo = atuais.find((item) => item.chave === chave);
      if (alvo?.previa) {
        URL.revokeObjectURL(alvo.previa);
        refPrevias.current = refPrevias.current.filter((url) => url !== alvo.previa);
      }
      return atuais.filter((item) => item.chave !== chave);
    });
  }

  const prontos = itens.filter((item) => item.estado === "pronto");
  const enviando = itens.some((item) => item.estado === "enviando");

  return (
    <div className={className}>
      <label
        htmlFor={idEntrada}
        className="mb-1.5 block text-sm font-semibold text-graf-800"
      >
        {rotulo}
      </label>

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
          "rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          // o input é sr-only; sem isto, quem chega nele pelo teclado não vê
          // foco nenhum na tela
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
          arrastando ? "border-jb-500 bg-jb-50" : "border-graf-300 bg-graf-50/60",
        )}
      >
        <ImagePlus className="mx-auto size-6 text-graf-500" aria-hidden />
        {/*
          O gatilho é um botão, não um segundo <label>: dois rótulos apontando
          para o mesmo input fazem o leitor de tela ler os dois juntos como
          nome do campo.
        */}
        <p className="mt-2 text-sm text-graf-600">
          Arraste os arquivos aqui ou{" "}
          <button
            type="button"
            onClick={() => refEntrada.current?.click()}
            className="rounded-sm font-semibold text-jb-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            escolha do seu aparelho
          </button>
          .
        </p>
        <p id={idAjuda} className="mt-1 text-xs text-graf-500">
          {ajuda}
        </p>
        <input
          ref={refEntrada}
          id={idEntrada}
          type="file"
          multiple
          accept={TIPOS_ACEITOS.join(",")}
          aria-describedby={idAjuda}
          onChange={(evento) => adicionar(evento.target.files)}
          className="sr-only"
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {enviando
          ? "Enviando arquivos."
          : prontos.length > 0
            ? `${prontos.length} arquivo(s) prontos para envio.`
            : ""}
      </p>

      {itens.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {itens.map((item) => (
            <li
              key={item.chave}
              className="flex items-center gap-3 rounded-lg border border-graf-200 bg-white p-2.5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-graf-100">
                {item.previa ? (
                  // eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:), não passa pelo otimizador
                  <img
                    src={item.previa}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <FileText className="size-5 text-graf-500" aria-hidden />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-graf-900">
                  {item.nome}
                </span>
                {item.estado === "erro" ? (
                  <span className="mt-0.5 flex items-start gap-1.5 text-xs text-jb-700">
                    <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                    {item.erro}
                  </span>
                ) : item.estado === "enviando" ? (
                  <span className="mt-1 block">
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-graf-200">
                      <span
                        className="block h-full rounded-full bg-jb-500 transition-[width]"
                        style={{ width: `${item.progresso}%` }}
                      />
                    </span>
                    <span className="mt-1 block text-xs text-graf-500">
                      Enviando… {item.progresso}%
                    </span>
                  </span>
                ) : (
                  <span className="mt-0.5 block text-xs text-graf-500">
                    Pronto · {formatarTamanho(item.tamanho)}
                  </span>
                )}
              </span>

              {item.estado === "pronto" && item.mediaId ? (
                <input type="hidden" name={nome} value={item.mediaId} />
              ) : null}

              <button
                type="button"
                onClick={() => remover(item.chave)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-graf-500 transition-colors hover:bg-graf-100 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <Trash2 className="size-4" aria-hidden />
                <span className="sr-only">Remover {item.nome}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
