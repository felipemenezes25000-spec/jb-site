"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FileText, Paperclip, Trash2 } from "lucide-react";

import {
  anexarDocumentoDoPedido,
  removerDocumentoDoPedido,
  type EstadoVendas,
} from "@/app/acoes/admin-vendas";
import { Botao } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { Cartao, CabecalhoCartao, Vazio } from "@/components/ui/data";
import { Campo, Selecao } from "@/components/ui/form";

/* ============================================================================
   Documentos do pedido — nota fiscal, garantia, contrato

   O envio é um formulário comum com `<input type="file">` e server action: sem
   endpoint separado, sem JavaScript obrigatório, e a validação de tipo e
   tamanho acontece do lado do servidor, em @/lib/upload, que confere o conteúdo
   do arquivo e não só a extensão.
   ============================================================================ */

const INICIAL: EstadoVendas = {};

export type DocumentoDoPedido = {
  id: string;
  titulo: string;
  tipo: string;
  endereco: string;
  detalhe: string;
};

function Enviar({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante="secundario" carregando={pending}>
      {children}
    </Botao>
  );
}

export function DocumentosDoPedido({
  pedidoId,
  documentos,
  tipos,
  podeExcluir,
}: {
  pedidoId: string;
  documentos: DocumentoDoPedido[];
  tipos: { valor: string; rotulo: string }[];
  podeExcluir: boolean;
}) {
  const [estadoEnvio, anexar] = useActionState(anexarDocumentoDoPedido, INICIAL);
  const [estadoRemocao, remover] = useActionState(removerDocumentoDoPedido, INICIAL);

  return (
    <Cartao className="print:hidden">
      <CabecalhoCartao
        titulo="Documentos"
        descricao="Nota fiscal, termo de garantia e o que mais o cliente precisar guardar."
      />

      <div className="space-y-5 p-5">
        {documentos.length === 0 ? (
          <Vazio
            icone={FileText}
            titulo="Nenhum documento anexado"
            descricao="A nota fiscal e a garantia ficam disponíveis para o cliente na área dele."
          />
        ) : (
          <ul className="divide-y divide-graf-200 rounded-lg border border-graf-200">
            {documentos.map((documento) => (
              <li
                key={documento.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <a
                    href={documento.endereco}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 font-medium text-graf-900 transition-colors hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                  >
                    <FileText className="size-4 shrink-0 text-graf-500" aria-hidden />
                    <span className="truncate">{documento.titulo}</span>
                  </a>
                  <p className="text-[0.8125rem] text-graf-500">
                    {documento.tipo} · {documento.detalhe}
                  </p>
                </div>

                {podeExcluir ? (
                  <form action={remover}>
                    <input type="hidden" name="documentoId" value={documento.id} />
                    <BotaoConfirmar
                      rotulo="Remover"
                      pergunta={`Remover "${documento.titulo}"?`}
                      detalhe="O arquivo sai do armazenamento e o cliente deixa de vê-lo na área dele."
                      rotuloConfirmar="Remover documento"
                      tamanho="sm"
                      icone={<Trash2 className="size-4" aria-hidden />}
                    />
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <p aria-live="polite" className="min-h-5 text-sm">
          {estadoRemocao.erro ? (
            <span className="font-medium text-jb-700">{estadoRemocao.erro}</span>
          ) : null}
          {estadoRemocao.ok ? (
            <span className="font-medium text-ok-700">{estadoRemocao.ok}</span>
          ) : null}
        </p>

        <form action={anexar} className="space-y-3 border-t border-graf-200 pt-5">
          <input type="hidden" name="pedidoId" value={pedidoId} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              rotulo="Nome do documento"
              name="titulo"
              required
              maxLength={140}
              placeholder="Ex.: Nota fiscal 12.345"
              erro={estadoEnvio.campo === "titulo" ? estadoEnvio.erro : undefined}
            />
            <Selecao rotulo="Tipo" name="tipo" defaultValue="nota_fiscal" required>
              {tipos.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.rotulo}
                </option>
              ))}
            </Selecao>
          </div>

          <div>
            <label
              htmlFor="documento-arquivo"
              className="mb-1.5 block text-sm font-semibold text-graf-800"
            >
              Arquivo
              <span className="ml-0.5 text-jb-600" aria-hidden>
                *
              </span>
            </label>
            <input
              id="documento-arquivo"
              name="arquivo"
              type="file"
              required
              accept="application/pdf,image/jpeg,image/png,image/webp"
              aria-describedby="documento-arquivo-ajuda"
              className="block w-full cursor-pointer rounded-lg border border-graf-450 bg-white text-base sm:text-sm text-graf-700 file:mr-3 file:min-h-11 file:cursor-pointer file:border-0 file:bg-graf-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-graf-800 hover:file:bg-graf-200 focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15"
            />
            <p id="documento-arquivo-ajuda" className="mt-1.5 text-[0.8125rem] text-graf-500">
              PDF ou imagem. O conteúdo é conferido no servidor.
            </p>
          </div>

          <p aria-live="polite" className="min-h-5 text-sm">
            {estadoEnvio.erro ? (
              <span className="font-medium text-jb-700">{estadoEnvio.erro}</span>
            ) : null}
            {estadoEnvio.ok ? (
              <span className="font-medium text-ok-700">{estadoEnvio.ok}</span>
            ) : null}
          </p>

          <Enviar>
            <Paperclip className="size-4" aria-hidden />
            Anexar documento
          </Enviar>
        </form>
      </div>
    </Cartao>
  );
}
