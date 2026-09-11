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
 * Envio das fotos e do vídeo do problema.
 *
 * Manda para `/api/envio`, que é a porta do VISITANTE: ela não exige conta, e
 * é isso que faz este componente existir. `/api/upload` exige sessão — quem
 * está abrindo um chamado sem cadastro não tem nenhuma, e afrouxar aquela
 * rota abriria um depósito de arquivos na internet.
 *
 * O que muda em relação ao contrato anterior: o servidor devolve o id de um
 * `TempUpload`, não o de uma `Media`. O arquivo pertence à sessão de envio
 * daquele navegador até um chamado reivindicá-lo, o que acontece no servidor,
 * dentro de `abrirChamadoPublico`. Por isso não há mais campo escondido com
 * id de mídia: o vínculo não passa pelo formulário, e não passar pelo
 * formulário é o que impede alguém de anexar arquivo alheio digitando um id.
 *
 * A validação daqui é só para dar resposta imediata. A palavra final é do
 * servidor, que confere o conteúdo do arquivo pelos BYTES — não pela extensão
 * do nome nem pelo tipo que o navegador declara.
 */

const MB = 1024 * 1024;

/*
 * Espelha `LIMITES_DO_VISITANTE` de `@/lib/envio-temporario`.
 *
 * Repetido aqui porque aquele módulo é `server-only`. Quando um dos dois
 * mudar, o outro precisa mudar junto — o servidor é quem manda, e divergir só
 * produz a pior experiência possível: a tela deixa escolher um arquivo que o
 * servidor recusa.
 */
const ACEITOS_FOTO = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
];
const ACEITOS_VIDEO = ["video/mp4", "video/quicktime", "video/webm"];
const ACEITOS = [...ACEITOS_FOTO, ...ACEITOS_VIDEO];

const ROTULO_ACEITOS = "JPG, PNG, HEIC, MP4 ou MOV";
const LIMITE_FOTO_MB = 10;
const LIMITE_VIDEO_MB = 40;
const SEGUNDOS_DE_VIDEO = 30;
const MAXIMO_FOTOS = 6;
const MAXIMO_VIDEOS = 1;

function ehVideo(mime: string) {
  return mime.startsWith("video/");
}

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
  arquivo?: { id?: string; kind?: string; durationSeconds?: number | null };
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

    const requisicao = new XMLHttpRequest();
    /* A porta do visitante. Sem `pasta`: o destino é fixo e privado, e deixar
       o navegador escolher pasta é exatamente o que o escopo proíbe. */
    requisicao.open("POST", "/api/envio");

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
      if (!dadosResposta.arquivo?.id) {
        rejeitar(new Error("O arquivo não chegou inteiro. Envie de novo."));
        return;
      }
      resolver({ id: dadosResposta.arquivo.id, nome: arquivo.name });
    });

    requisicao.addEventListener("error", () =>
      rejeitar(new Error("A conexão caiu durante o envio. Tente de novo.")),
    );
    requisicao.addEventListener("abort", () => rejeitar(new Error("Envio cancelado.")));

    requisicao.send(dados);
  });
}

export function EnvioDeFotos({
  maximo = MAXIMO_FOTOS + MAXIMO_VIDEOS,
  className,
}: {
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

      /* Foto e vídeo têm limites diferentes — 10 MB contra 40 MB. Usar um
         número só recusaria vídeo legítimo ou aceitaria foto grande demais
         para o servidor. */
      const limiteMb = ehVideo(arquivo.type) ? LIMITE_VIDEO_MB : LIMITE_FOTO_MB;

      if (!ACEITOS.includes(arquivo.type)) {
        item.estado = "erro";
        item.erro = `Este formato não entra pelo site. Envie ${ROTULO_ACEITOS}.`;
      } else if (arquivo.size > limiteMb * MB) {
        item.estado = "erro";
        item.erro = `Passa de ${limiteMb} MB (tem ${formatarTamanho(arquivo.size)}).`;
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

        <p className="mt-4 text-corpo font-bold text-graf-950">
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
            "mt-5 inline-flex min-h-11 select-none items-center justify-center rounded-lg border px-5 text-corpo font-semibold transition-colors",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-jb-500",
            cheio
              ? "cursor-not-allowed border-graf-200 bg-graf-100 text-graf-500"
              : "cursor-pointer border-graf-300 bg-white text-graf-800 shadow-xs hover:border-graf-400 hover:bg-graf-50",
          )}
        >
          Escolher arquivos
        </label>

        {/* Os limites são ditos ANTES da captura, não depois da recusa. Quem
            vai gravar um vídeo precisa saber dos 30 segundos enquanto ainda
            está com o telefone na mão. */}
        <p id={idAjuda} className="mt-4 text-apoio leading-relaxed text-graf-500">
          Até {MAXIMO_FOTOS} fotos de {LIMITE_FOTO_MB} MB, em {ROTULO_ACEITOS}. Se quiser,
          {" "}
          {MAXIMO_VIDEOS} vídeo de até {SEGUNDOS_DE_VIDEO} segundos e {LIMITE_VIDEO_MB} MB —
          grave só o trecho em que o defeito aparece.
        </p>
      </div>

      {itens.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-apoio font-bold uppercase tracking-[0.06em] text-graf-500">
              Arquivos do chamado
            </p>
            <p className="tabular text-apoio text-graf-500">
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
                      <p className="mt-0.5 text-apoio leading-relaxed text-jb-700">
                        {item.erro}
                      </p>
                      {item.arquivo && !cheio ? (
                        <button
                          type="button"
                          onClick={() => tentarDeNovo(item)}
                          className="-my-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-apoio font-semibold text-jb-700 underline underline-offset-2 transition-colors hover:text-jb-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
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
                      <span className="tabular w-9 shrink-0 text-right text-apoio text-graf-500">
                        {item.progresso}%
                      </span>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-apoio text-graf-500">
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

      {/*
        Não há mais campo escondido com id de arquivo.

        Antes o formulário carregava os ids e o servidor os validava. Agora o
        vínculo acontece pela SESSÃO DE ENVIO, no servidor, dentro de
        `abrirChamadoPublico` — o navegador não diz quais arquivos anexar, e é
        justamente isso que impede alguém de anexar arquivo alheio digitando
        um id no devtools.

        A consequência prática: o que aparece nesta lista é o que está
        guardado para esta sessão, e é o que vai junto quando o chamado for
        aberto.
      */}
    </div>
  );
}
