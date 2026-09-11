"use client";

import { FileText, Trash2 } from "lucide-react";

import { anexarMidiaNaOS, removerMidiaDaOS } from "@/app/acoes/admin-servico";
import { Anexos } from "@/components/admin/servico/anexos";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { cn } from "@/lib/utils";

/* ============================================================================
   Fotos antes e depois da OS

   As duas fases são o que sustenta o laudo quando o cliente pergunta o que
   exatamente foi feito. Ficam separadas de propósito: uma pilha única de fotos
   sem ordem não prova nada.

   Remover apaga só o vínculo com a OS — o arquivo continua na biblioteca de
   mídia, porque ele pode estar sendo usado em outro lugar. Mesmo assim a
   remoção pergunta antes: a lixeira fica por cima da miniatura, no caminho do
   dedo de quem só queria abrir a foto, e a prova do serviço sai da OS.
   ============================================================================ */

export type MidiaDaOS = {
  id: string;
  phase: string;
  url: string;
  alt: string;
  mime: string;
  nome: string;
};

export function MidiasDaOS({
  ordemId,
  midias,
  podeEditar,
}: {
  ordemId: string;
  midias: MidiaDaOS[];
  podeEditar: boolean;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Fase
        ordemId={ordemId}
        fase="antes"
        titulo="Antes"
        descricao="Estado em que o equipamento chegou."
        midias={midias.filter((midia) => midia.phase !== "depois")}
        podeEditar={podeEditar}
      />
      <Fase
        ordemId={ordemId}
        fase="depois"
        titulo="Depois"
        descricao="Estado na entrega, com o reparo concluído."
        midias={midias.filter((midia) => midia.phase === "depois")}
        podeEditar={podeEditar}
      />
    </div>
  );
}

function Fase({
  ordemId,
  fase,
  titulo,
  descricao,
  midias,
  podeEditar,
}: {
  ordemId: string;
  fase: "antes" | "depois";
  titulo: string;
  descricao: string;
  midias: MidiaDaOS[];
  podeEditar: boolean;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-graf-900">{titulo}</h3>
        <p className="text-apoio text-graf-500">{descricao}</p>
      </div>

      {midias.length === 0 ? (
        <p className="rounded-lg border border-dashed border-graf-300 bg-graf-50/60 px-3 py-6 text-center text-sm text-graf-500">
          Nenhum arquivo nesta fase.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {midias.map((midia) => (
            <li key={midia.id} className="group relative">
              <a
                href={midia.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "block overflow-hidden rounded-lg border border-graf-200 bg-graf-100",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                )}
              >
                {midia.mime.startsWith("image/") ? (
                  // thumbnail do painel: sem otimizador para não depender do
                  // domínio de origem do arquivo já enviado
                  <img
                    src={midia.url}
                    alt={midia.alt || `Foto ${titulo.toLowerCase()} da ordem de serviço`}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <span className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 px-2 text-center text-graf-600">
                    <FileText className="size-6" aria-hidden />
                    <span className="line-2 text-xs font-medium">{midia.nome}</span>
                  </span>
                )}
              </a>

              {podeEditar ? (
                <FormularioAcao
                  acao={removerMidiaDaOS}
                  esconderBotao
                  className="absolute right-1 top-1 space-y-0"
                >
                  <Oculto nome="ordemId" valor={ordemId} />
                  <Oculto nome="midiaId" valor={midia.id} />
                  <BotaoConfirmar
                    variante="texto"
                    className="h-11 w-11 bg-white/90 px-0 text-graf-600 shadow-card hover:bg-white hover:text-jb-700"
                    title={`Remover anexo ${midia.nome}`}
                    rotulo={
                      <>
                        <Trash2 className="size-4" aria-hidden />
                        <span className="sr-only">Remover anexo {midia.nome}</span>
                      </>
                    }
                    pergunta="Remover este anexo da OS?"
                    detalhe={`"${midia.nome}" deixa de aparecer nesta ordem de serviço. O arquivo continua na biblioteca de mídia, mas o vínculo com a OS precisa ser refeito à mão.`}
                    rotuloConfirmar="Remover"
                  />
                </FormularioAcao>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {podeEditar ? (
        <FormularioAcao
          acao={anexarMidiaNaOS}
          rotulo={`Anexar em "${titulo.toLowerCase()}"`}
          variante="secundario"
          tamanho="sm"
        >
          <Oculto nome="ordemId" valor={ordemId} />
          <Oculto nome="fase" valor={fase} />
          <Anexos
            nome="mediaIds"
            pasta="ordens"
            rotulo={`Arquivos — ${titulo.toLowerCase()}`}
            ajuda="JPG, PNG, WebP, AVIF ou PDF, até 12 MB cada."
          />
        </FormularioAcao>
      ) : null}
    </section>
  );
}
