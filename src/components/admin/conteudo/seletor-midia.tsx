"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { FileText, ImageOff, Images, Search, Trash2, Upload } from "lucide-react";

import { AbasLocais } from "@/components/ui/abas";
import { Botao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { EnviarArquivo, type ArquivoEnviado } from "@/components/ui/enviar-arquivo";
import { Painel } from "@/components/ui/painel";
import { cn } from "@/lib/utils";

/* ============================================================================
   Escolher uma imagem

   Serve a capa da página, o slide, a seção da home e a galeria. Duas formas de
   escolher, na mesma janela: pegar da biblioteca já existente ou enviar um
   arquivo novo — enviar já grava a mídia e devolve o identificador, então o
   arquivo passa a existir na biblioteca no mesmo instante.

   O que viaja no formulário é o ID da mídia, não a URL: assim, se o arquivo for
   trocado depois, quem aponta para ele continua apontando.
   ============================================================================ */

export type MidiaResumo = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export function MiniaturaMidia({
  midia,
  className,
  tamanho = "md",
}: {
  midia: (Pick<MidiaResumo, "url" | "alt" | "filename"> & { mime?: string }) | null;
  className?: string;
  tamanho?: "sm" | "md" | "lg";
}) {
  const alturas = { sm: "h-16", md: "h-28", lg: "h-40" } as const;

  if (!midia) {
    return (
      <div
        className={cn(
          "flex w-full items-center justify-center rounded-lg border border-dashed border-graf-300 bg-graf-50 text-graf-500",
          alturas[tamanho],
          className,
        )}
      >
        <ImageOff className="size-5" aria-hidden />
        <span className="sr-only">Sem imagem</span>
      </div>
    );
  }

  // A biblioteca também guarda PDF; renderizar como <img> daria ícone quebrado.
  if (midia.mime && !midia.mime.startsWith("image/")) {
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-graf-200 bg-graf-50 px-2 text-graf-500",
          alturas[tamanho],
          className,
        )}
      >
        <FileText className="size-5" aria-hidden />
        <span className="line-2 text-center text-[11px] leading-tight">{midia.filename}</span>
      </div>
    );
  }

  return (
    /* imagem do painel interno: sem otimizador, para funcionar igual com
       arquivo local em public/uploads e com arquivo no Vercel Blob */
    <img
      src={midia.url}
      alt={midia.alt || midia.filename}
      loading="lazy"
      decoding="async"
      className={cn(
        "w-full rounded-lg border border-graf-200 bg-graf-50 object-contain",
        alturas[tamanho],
        className,
      )}
    />
  );
}

function GradeDaBiblioteca({
  midias,
  selecionada,
  aoEscolher,
}: {
  midias: MidiaResumo[];
  selecionada: string;
  aoEscolher: (midia: MidiaResumo) => void;
}) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return midias;
    return midias.filter(
      (midia) =>
        midia.filename.toLowerCase().includes(termo) || midia.alt.toLowerCase().includes(termo),
    );
  }, [busca, midias]);

  if (midias.length === 0) {
    return (
      <Vazio
        icone={Images}
        titulo="A biblioteca está vazia"
        descricao="Use a aba Enviar para subir a primeira imagem."
      />
    );
  }

  return (
    <div>
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-graf-500"
          aria-hidden
        />
        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          onKeyDown={(evento) => {
            // o seletor abre dentro de um <form>: Enter aqui enviaria o
            // formulário da página em vez de filtrar a grade
            if (evento.key === "Enter") evento.preventDefault();
          }}
          placeholder="Buscar pelo nome do arquivo ou pela descrição"
          aria-label="Buscar na biblioteca"
          className={cn(
            "h-11 w-full rounded-lg border border-graf-300 bg-white pl-9 pr-3 text-sm text-graf-900",
            "placeholder:text-graf-500 hover:border-graf-400",
            "focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15",
          )}
        />
      </div>

      {filtradas.length === 0 ? (
        <Vazio
          titulo="Nenhum arquivo com esse nome"
          descricao="Tente outro termo ou envie uma imagem nova."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtradas.map((midia) => {
            const ativa = midia.id === selecionada;
            return (
              <li key={midia.id}>
                <button
                  type="button"
                  onClick={() => aoEscolher(midia)}
                  aria-pressed={ativa}
                  className={cn(
                    "block w-full rounded-xl border p-2 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                    ativa
                      ? "border-jb-500 bg-jb-50 ring-1 ring-inset ring-jb-500/20"
                      : "border-graf-200 bg-white hover:border-graf-400",
                  )}
                >
                  <MiniaturaMidia midia={midia} tamanho="md" className="border-0" />
                  <span className="mt-2 block truncate text-xs font-medium text-graf-800">
                    {midia.filename}
                  </span>
                  <span className="block truncate text-[11px] text-graf-500">
                    {midia.alt || "Sem descrição"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function SeletorDeMidia({
  nome,
  rotulo,
  ajuda,
  biblioteca,
  valorInicial = null,
  erro,
  obrigatorio,
  className,
}: {
  /** Nome do campo escondido que leva o ID da mídia no envio. */
  nome: string;
  rotulo: string;
  ajuda?: string;
  biblioteca: MidiaResumo[];
  valorInicial?: MidiaResumo | null;
  erro?: string;
  obrigatorio?: boolean;
  className?: string;
}) {
  const idBase = useId();
  const [escolhida, setEscolhida] = useState<MidiaResumo | null>(valorInicial);
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<MidiaResumo | null>(valorInicial);
  const [enviadas, setEnviadas] = useState<MidiaResumo[]>([]);

  useEffect(() => {
    if (aberto) setRascunho(escolhida);
  }, [aberto, escolhida]);

  const disponiveis = useMemo(() => {
    const vistos = new Set<string>();
    return [...enviadas, ...biblioteca].filter((midia) => {
      if (vistos.has(midia.id)) return false;
      vistos.add(midia.id);
      return true;
    });
  }, [enviadas, biblioteca]);

  function aoEnviado(arquivos: ArquivoEnviado[]) {
    const novas = arquivos
      .filter((arquivo) => Boolean(arquivo.id))
      .map<MidiaResumo>((arquivo) => ({
        id: arquivo.id as string,
        url: arquivo.url,
        filename: arquivo.nome,
        alt: "",
        width: arquivo.largura ?? null,
        height: arquivo.altura ?? null,
      }));

    if (novas.length === 0) return;
    setEnviadas((atuais) => {
      const conhecidos = new Set(atuais.map((midia) => midia.id));
      const inedito = novas.filter((midia) => !conhecidos.has(midia.id));
      return inedito.length ? [...inedito, ...atuais] : atuais;
    });
    setRascunho(novas[novas.length - 1]);
  }

  return (
    <div className={className}>
      <p className="mb-1.5 block text-sm font-semibold text-graf-800" id={`${idBase}-rotulo`}>
        {rotulo}
        {obrigatorio ? (
          <span className="ml-0.5 text-jb-600" aria-hidden>
            *
          </span>
        ) : null}
      </p>

      <div
        className={cn(
          "rounded-xl border bg-white p-3",
          erro ? "border-jb-500" : "border-graf-200",
        )}
      >
        <MiniaturaMidia midia={escolhida} tamanho="lg" />

        <p className="mt-2 truncate text-xs text-graf-500">
          {escolhida ? escolhida.filename : "Nenhuma imagem escolhida"}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Botao
            type="button"
            variante="secundario"
            tamanho="sm"
            onClick={() => setAberto(true)}
            aria-describedby={`${idBase}-rotulo`}
          >
            <Images className="size-4" aria-hidden />
            {escolhida ? "Trocar imagem" : "Escolher imagem"}
          </Botao>
          {escolhida ? (
            <Botao
              type="button"
              variante="texto"
              tamanho="sm"
              onClick={() => setEscolhida(null)}
            >
              <Trash2 className="size-4" aria-hidden />
              Remover
            </Botao>
          ) : null}
        </div>
      </div>

      <input type="hidden" name={nome} value={escolhida?.id ?? ""} />

      {erro ? (
        <p className="mt-1.5 text-sm text-jb-700" role="alert">
          {erro}
        </p>
      ) : ajuda ? (
        <p className="mt-1.5 text-xs leading-relaxed text-graf-500">{ajuda}</p>
      ) : null}

      <Painel
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={rotulo}
        descricao="Escolha um arquivo da biblioteca ou envie um novo."
        tamanho="lg"
        rodape={
          <>
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              type="button"
              disabled={!rascunho}
              onClick={() => {
                setEscolhida(rascunho);
                setAberto(false);
              }}
            >
              Usar esta imagem
            </Botao>
          </>
        }
      >
        <AbasLocais
          rotuloDaLista="Origem da imagem"
          abas={[
            {
              chave: "biblioteca",
              rotulo: "Biblioteca",
              icone: Images,
              contador: disponiveis.length,
              conteudo: (
                <GradeDaBiblioteca
                  midias={disponiveis}
                  selecionada={rascunho?.id ?? ""}
                  aoEscolher={setRascunho}
                />
              ),
            },
            {
              chave: "enviar",
              rotulo: "Enviar",
              icone: Upload,
              conteudo: (
                <div className="space-y-4">
                  <EnviarArquivo
                    rotulo="Arquivo de imagem"
                    aceita={["image/jpeg", "image/png", "image/webp"]}
                    tamanhoMaximoMb={8}
                    aoEnviado={aoEnviado}
                    ajuda="Até 8 MB. JPG, PNG ou WebP. O arquivo entra na biblioteca assim que sobe."
                  />
                  {rascunho ? (
                    <div className="rounded-xl border border-graf-200 bg-graf-50 p-3">
                      <p className="mb-2 text-xs font-semibold text-graf-600">
                        Selecionada agora
                      </p>
                      <MiniaturaMidia midia={rascunho} tamanho="md" />
                      <p className="mt-2 truncate text-xs text-graf-500">{rascunho.filename}</p>
                    </div>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </Painel>
    </div>
  );
}
