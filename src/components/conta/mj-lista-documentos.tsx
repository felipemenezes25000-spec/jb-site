import type { DocumentKind } from "@prisma/client";
import { Download, FileText } from "lucide-react";

import { ROTULO_DOCUMENTO } from "@/lib/equipamento";
import { formatarData } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Lista de documentos do cliente — usada no pedido, no prontuário do
 * equipamento e na tela de Documentos.
 *
 * O link aponta sempre para a rota autorizada, nunca para o arquivo no
 * storage: quem confere se o documento é seu é o servidor, a cada download.
 */

export type DocumentoDaLista = {
  id: string;
  kind: DocumentKind;
  title: string;
  size: number;
  createdAt: Date;
};

function formatarTamanho(bytes: number) {
  if (bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function ListaDeDocumentos({
  documentos,
  className,
}: {
  documentos: DocumentoDaLista[];
  className?: string;
}) {
  return (
    <ul className={cn("divide-y divide-graf-100", className)}>
      {documentos.map((documento) => {
        const tamanho = formatarTamanho(documento.size);
        return (
          <li
            key={documento.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-graf-100 text-graf-500">
              <FileText className="size-5" aria-hidden />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-graf-900">
                {documento.title}
              </span>
              <span className="mt-0.5 block text-xs text-graf-500">
                {ROTULO_DOCUMENTO[documento.kind]} · {formatarData(documento.createdAt)}
                {tamanho ? ` · ${tamanho}` : ""}
              </span>
            </span>

            <a
              href={`/minha-jb/documentos/${documento.id}/baixar`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <Download className="size-4" aria-hidden />
              Baixar
              <span className="sr-only"> {documento.title}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
