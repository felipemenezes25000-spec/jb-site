"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export type MidiaItem = { id: string; url: string; filename: string; alt: string };

/**
 * Campo de imagem com biblioteca e upload — o equivalente ao gerenciador de
 * arquivos do MARS. Guarda o id em um input escondido, que vai no formulário.
 */
export function EscolhaImagem({
  name,
  label,
  valorInicial,
  biblioteca,
  hint,
}: {
  name: string;
  label: string;
  valorInicial?: string | null;
  biblioteca: MidiaItem[];
  hint?: string;
}) {
  const [itens, setItens] = useState(biblioteca);
  const [valor, setValor] = useState(valorInicial ?? "");
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => setItens(biblioteca), [biblioteca]);

  const atual = itens.find((i) => i.id === valor);

  async function enviar(arquivo: File) {
    setEnviando(true);
    const form = new FormData();
    form.append("arquivo", arquivo);
    try {
      const resposta = await fetch("/api/admin/upload", { method: "POST", body: form });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Falha no envio.");
      setItens((atuais) => [dados.media, ...atuais]);
      setValor(dados.media.id);
      setAberto(false);
      toast.success("Imagem enviada.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha no envio.");
    } finally {
      setEnviando(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  return (
    <div>
      <span className="block text-sm font-semibold text-slate-700">{label}</span>
      <input type="hidden" name={name} value={valor} />

      <div className="mt-1.5 flex items-start gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-slate-50">
          {atual ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={atual.url} alt="" className="size-full object-cover" />
          ) : (
            <span className="text-xs text-slate-400">sem imagem</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm transition-colors hover:border-slate-400"
          >
            {aberto ? "Fechar biblioteca" : "Escolher da biblioteca"}
          </button>
          <button
            type="button"
            onClick={() => inputArquivo.current?.click()}
            disabled={enviando}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm transition-colors hover:border-slate-400 disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Enviar do computador"}
          </button>
          {valor ? (
            <button
              type="button"
              onClick={() => setValor("")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-red-700 transition-colors hover:border-red-300"
            >
              Remover
            </button>
          ) : null}
          <input
            ref={inputArquivo}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void enviar(arquivo);
            }}
          />
        </div>
      </div>

      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}

      {aberto ? (
        <ul className="mt-3 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-5 lg:grid-cols-8">
          {itens.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                title={item.filename}
                onClick={() => {
                  setValor(item.id);
                  setAberto(false);
                }}
                className={cn(
                  "block aspect-square w-full overflow-hidden rounded border-2 bg-white transition-colors",
                  item.id === valor ? "border-jb-500" : "border-transparent hover:border-slate-300",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.alt} className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
