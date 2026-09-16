"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, ImageOff, Save, Trash2 } from "lucide-react";

import {
  BotaoAcaoConfirmar,
  type AcaoDeFormulario,
  type EstadoAcao,
} from "@/components/admin/conteudo/botao-acao";
import { MensagemDoFormulario } from "@/components/admin/conteudo/formulario-base";
import { MiniaturaMidia } from "@/components/admin/conteudo/seletor-midia";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/button";
import { BotaoCopiar } from "@/components/ui/copiar";
import { Vazio } from "@/components/ui/data";
import { EnviarArquivo } from "@/components/ui/enviar-arquivo";
import { Campo, Marcador } from "@/components/ui/form";
import { Painel } from "@/components/ui/painel";
import { cn } from "@/lib/utils";

/* ============================================================================
   Biblioteca de mídia

   Uma grade de arquivos e uma gaveta de detalhes. O que existe de regra aqui é
   a exclusão: um arquivo em uso não é apagado, e a gaveta diz em quantos
   lugares ele aparece antes de a pessoa tentar.

   As imagens são exibidas sem o otimizador do Next porque a biblioteca mistura
   arquivo local (public/uploads) e arquivo remoto (Vercel Blob), e são
   miniaturas de uso interno.
   ============================================================================ */

export type MidiaDaBiblioteca = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  folder: string;
  criadaEm: string;
  credit: string;
  hasPeople: boolean;
  /** Data em que a autorização foi obtida, já formatada. Vazio = não há. */
  autorizadaEm: string;
  autorizadaPor: string;
  usageNote: string;
  /** Quantas vezes o arquivo é referenciado em todo o sistema. */
  usos: number;
  /** Onde ele está sendo usado, em palavras. */
  ondeUsa: string[];
};

const VAZIO: EstadoAcao = {};

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function FormularioDescricao({
  midia,
  acao,
}: {
  midia: MidiaDaBiblioteca;
  acao: AcaoDeFormulario;
}) {
  const [estado, executar, pendente] = useActionState(acao, VAZIO);

  return (
    <form action={executar} className="space-y-4" key={midia.id}>
      <input type="hidden" name="id" value={midia.id} />
      <Campo
        rotulo="Descrição da imagem"
        name="alt"
        maxLength={180}
        defaultValue={midia.alt}
        ajuda="Descreva o que a imagem mostra. É o texto lido por quem usa leitor de tela."
      />

      <Campo
        rotulo="Crédito"
        name="credit"
        maxLength={120}
        defaultValue={midia.credit}
        ajuda="Quem fotografou. Vazio não vira 'Foto: JB' — a linha some."
      />

      {/* ------------------------------------------- autorização ---

          Foto com gente não vai ao ar sem alguém ter perguntado. A caixa
          registra o fato; a data registra o ato. Uma vez gravada, a
          autorização permanece — desmarcar "tem pessoa" não apaga o que
          aconteceu. */}
      <div className="space-y-3 rounded-lg border border-graf-200 bg-graf-50 p-3.5">
        <Marcador
          rotulo="Há pessoa identificável na imagem"
          name="hasPeople"
          defaultChecked={midia.hasPeople}
          ajuda="Equipe, cliente, paciente — qualquer pessoa reconhecível."
        />

        {midia.autorizadaEm ? (
          <p className="text-[0.8125rem] leading-relaxed text-graf-600">
            Autorização registrada em {midia.autorizadaEm}
            {midia.autorizadaPor ? `, por ${midia.autorizadaPor}` : ""}.
          </p>
        ) : (
          <Marcador
            rotulo="A autorização de uso de imagem foi obtida"
            name="autorizar"
            ajuda="Marque só depois de a pessoa ter autorizado de fato. A data é gravada agora."
          />
        )}

        <Campo
          rotulo="Restrições de uso"
          name="usageNote"
          maxLength={300}
          defaultValue={midia.usageNote}
          ajuda="O que foi combinado. Ex.: 'só no site', 'sem redes sociais'."
        />

        {midia.hasPeople && !midia.autorizadaEm ? (
          <p className="text-[0.8125rem] font-semibold leading-relaxed text-jb-700">
            Esta imagem tem pessoa identificável e ainda não pode ser publicada.
          </p>
        ) : null}
      </div>

      <MensagemDoFormulario estado={estado} tituloDoErro="Não foi possível salvar" />
      <Botao type="submit" variante="secundario" tamanho="sm" carregando={pendente}>
        <Save className="size-4" aria-hidden />
        Salvar cadastro
      </Botao>
    </form>
  );
}

export function BibliotecaDeMidia({
  midias,
  pastas,
  acaoSalvar,
  acaoExcluir,
  podeEditar,
}: {
  midias: MidiaDaBiblioteca[];
  pastas: string[];
  acaoSalvar: AcaoDeFormulario;
  acaoExcluir: AcaoDeFormulario;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const aberta = useMemo(
    () => midias.find((midia) => midia.id === abertoId) ?? null,
    [abertoId, midias],
  );

  // o arquivo saiu da lista (excluído em outra aba, ou agora mesmo): fecha
  useEffect(() => {
    if (abertoId && !aberta) setAbertoId(null);
  }, [abertoId, aberta]);

  return (
    <div className="space-y-6">
      {podeEditar ? (
        <EnviarArquivo
          rotulo="Enviar arquivos para a biblioteca"
          multiplo
          aceita={["image/jpeg", "image/png", "image/webp"]}
          tamanhoMaximoMb={8}
          aoEnviado={(arquivos) => {
            if (arquivos.length > 0) router.refresh();
          }}
          ajuda="Até 8 MB por arquivo. JPG, PNG ou WebP. O arquivo entra na lista assim que sobe."
        />
      ) : null}

      {midias.length === 0 ? (
        <Vazio
          icone={ImageOff}
          titulo="Nenhum arquivo na biblioteca"
          descricao={
            podeEditar
              ? "Envie a primeira imagem no campo acima."
              : "Ainda não há imagens enviadas."
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {midias.map((midia) => (
            <li key={midia.id}>
              <button
                type="button"
                onClick={() => setAbertoId(midia.id)}
                className={cn(
                  "block w-full rounded-xl border border-graf-200 bg-white p-2 text-left shadow-card transition-colors",
                  "hover:border-graf-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                )}
              >
                <MiniaturaMidia midia={midia} tamanho="md" className="border-0" />
                {/* Nome de arquivo longo cabe em duas linhas antes de cortar —
                    no celular uma linha só mostrava menos da metade. O `title`
                    entrega o nome inteiro a quem passar o mouse. */}
                <span
                  title={midia.filename}
                  className="line-2 mt-2 block break-all text-[0.8125rem] font-semibold text-graf-900"
                >
                  {midia.filename}
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-graf-500">
                  <span className="truncate">{formatarTamanho(midia.size)}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-0.5 font-semibold",
                      midia.usos > 0 ? "bg-ok-50 text-ok-700" : "bg-graf-100 text-graf-600",
                    )}
                  >
                    {midia.usos > 0 ? `${midia.usos} uso${midia.usos > 1 ? "s" : ""}` : "sem uso"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pastas.length > 1 ? (
        <p className="text-[0.8125rem] text-graf-500">
          Pastas nesta biblioteca: {pastas.join(", ")}. A pasta é definida por quem envia o
          arquivo e serve para separar as origens.
        </p>
      ) : null}

      <Painel
        aberto={Boolean(aberta)}
        aoFechar={() => setAbertoId(null)}
        titulo={aberta?.filename ?? "Arquivo"}
        lado="direita"
        tamanho="md"
      >
        {aberta ? (
          <div className="space-y-6">
            <MiniaturaMidia midia={aberta} tamanho="lg" />

            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-graf-500">Formato</dt>
              <dd className="text-graf-800">{aberta.mime}</dd>
              <dt className="text-graf-500">Tamanho</dt>
              <dd className="text-graf-800">{formatarTamanho(aberta.size)}</dd>
              <dt className="text-graf-500">Dimensões</dt>
              <dd className="text-graf-800">
                {aberta.width && aberta.height ? `${aberta.width} × ${aberta.height} px` : "—"}
              </dd>
              <dt className="text-graf-500">Pasta</dt>
              <dd className="text-graf-800">{aberta.folder}</dd>
              <dt className="text-graf-500">Enviado em</dt>
              <dd className="text-graf-800">{aberta.criadaEm}</dd>
            </dl>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-graf-800">Endereço do arquivo</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-graf-100 px-3 py-2 font-mono text-xs text-graf-700">
                  {aberta.url}
                </code>
                <BotaoCopiar texto={aberta.url} rotulo="Copiar endereço" />
                <a
                  href={aberta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-graf-700 transition-colors hover:bg-graf-100 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  Abrir
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </div>
            </div>

            {podeEditar ? <FormularioDescricao midia={aberta} acao={acaoSalvar} /> : null}

            <div className="border-t border-graf-200 pt-5">
              {aberta.usos > 0 ? (
                <Aviso tom="atencao" titulo="Arquivo em uso">
                  Este arquivo aparece em: {aberta.ondeUsa.join(", ")}. Troque a imagem nesses
                  lugares antes de excluir.
                </Aviso>
              ) : podeEditar ? (
                <BotaoAcaoConfirmar
                  acao={acaoExcluir}
                  valores={{ id: aberta.id }}
                  rotulo="Excluir arquivo"
                  pergunta="Excluir este arquivo da biblioteca?"
                  detalhe="O arquivo sai da biblioteca e do armazenamento. Não dá para desfazer."
                  rotuloConfirmar="Excluir"
                  icone={<Trash2 className="size-4" aria-hidden />}
                  tamanho="md"
                />
              ) : (
                <p className="text-sm text-graf-500">
                  Seu perfil abre a biblioteca somente para consulta.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Painel>
    </div>
  );
}
