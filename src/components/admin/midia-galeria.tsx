"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { excluirMidia } from "@/app/admin/actions";

export type Arquivo = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  width: number | null;
  height: number | null;
  size: number;
  usos: number;
};

export function MidiaGaleria({
  arquivos,
  podeExcluir,
}: {
  arquivos: Arquivo[];
  podeExcluir: boolean;
}) {
  const [itens, setItens] = useState(arquivos);
  const [enviando, setEnviando] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function enviar(lista: FileList) {
    setEnviando(true);
    for (const arquivo of Array.from(lista)) {
      const form = new FormData();
      form.append("arquivo", arquivo);
      try {
        const resposta = await fetch("/api/admin/upload", { method: "POST", body: form });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro ?? "Falha no envio.");
        setItens((atuais) => [{ ...dados.media, usos: 0 }, ...atuais]);
      } catch (erro) {
        toast.error(`${arquivo.name}: ${erro instanceof Error ? erro.message : "falhou"}`);
      }
    }
    setEnviando(false);
    if (input.current) input.current.value = "";
    toast.success("Envio concluído.");
  }

  return (
    <>
      <div className="mb-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void enviar(e.target.files);
          }}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={enviando}
          className="rounded-md bg-jb-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-jb-600 disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviar imagens"}
        </button>
        <p className="mt-3 text-xs text-slate-500">JPG, PNG, GIF ou WebP, até 8 MB cada.</p>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {itens.map((arquivo) => (
          <li key={arquivo.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <span className="block aspect-square bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={arquivo.url} alt={arquivo.alt} className="size-full object-cover" />
            </span>
            <div className="p-3">
              <p className="truncate text-xs font-semibold text-slate-700" title={arquivo.filename}>
                {arquivo.filename}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {arquivo.width && arquivo.height ? `${arquivo.width}×${arquivo.height} · ` : ""}
                {(arquivo.size / 1024).toFixed(0)} KB
              </p>
              {arquivo.usos > 0 ? (
                <p className="mt-1 text-[11px] text-emerald-700">em uso em {arquivo.usos} lugar(es)</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">não usada</p>
              )}
              {podeExcluir ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (arquivo.usos > 0 && !window.confirm("Esta imagem está em uso. Excluir mesmo assim?")) return;
                    if (arquivo.usos === 0 && !window.confirm("Excluir esta imagem?")) return;
                    await excluirMidia(arquivo.id);
                    setItens((atuais) => atuais.filter((i) => i.id !== arquivo.id));
                    toast.success("Imagem excluída.");
                  }}
                  className="mt-2 text-xs text-red-700 underline underline-offset-2 hover:text-red-900"
                >
                  Excluir
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
