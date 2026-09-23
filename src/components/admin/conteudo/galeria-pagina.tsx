"use client";

import { useActionState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

import {
  BotaoAcaoConfirmar,
  BotoesDeOrdem,
  type AcaoDeFormulario,
  type EstadoAcao,
} from "@/components/admin/conteudo/botao-acao";
import { MensagemDoFormulario, erroDoCampo } from "@/components/admin/conteudo/formulario-base";
import {
  MiniaturaMidia,
  SeletorDeMidia,
  type MidiaResumo,
} from "@/components/admin/conteudo/seletor-midia";
import { Botao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { Campo } from "@/components/ui/form";

/* ============================================================================
   Galeria de uma página (PageImage)

   Ordem por botão em vez de arrastar: funciona no teclado, no leitor de tela e
   no celular sem gesto especial, e cada movimento é uma escrita atômica no
   servidor — não existe estado local que possa divergir do banco.
   ============================================================================ */

export type ImagemDaGaleria = {
  id: string;
  caption: string;
  media: MidiaResumo;
};

const VAZIO: EstadoAcao = {};

export function GaleriaDaPagina({
  slug,
  imagens,
  biblioteca,
  acaoAdicionar,
  acaoRemover,
  acaoMover,
}: {
  slug: string;
  imagens: ImagemDaGaleria[];
  biblioteca: MidiaResumo[];
  acaoAdicionar: AcaoDeFormulario;
  acaoRemover: AcaoDeFormulario;
  acaoMover: AcaoDeFormulario;
}) {
  const [estado, executar, pendente] = useActionState(acaoAdicionar, VAZIO);

  return (
    <div className="space-y-5">
      {imagens.length === 0 ? (
        <Vazio
          icone={ImagePlus}
          titulo="Nenhuma imagem na galeria"
          descricao="Adicione imagens abaixo. Elas aparecem no fim da página, na ordem definida aqui."
        />
      ) : (
        <ul className="space-y-3">
          {imagens.map((imagem, indice) => (
            <li
              key={imagem.id}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-graf-200 bg-white p-3 shadow-card sm:flex-nowrap"
            >
              <div className="w-24 shrink-0">
                <MiniaturaMidia midia={imagem.media} tamanho="sm" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-graf-900">
                  {imagem.caption || imagem.media.filename}
                </p>
                <p className="truncate text-apoio text-graf-500">
                  {imagem.caption ? imagem.media.filename : "Sem legenda"}
                  {imagem.media.width && imagem.media.height
                    ? ` · ${imagem.media.width}×${imagem.media.height}`
                    : ""}
                </p>
                <p className="mt-1 text-apoio text-graf-500">
                  Posição {indice + 1} de {imagens.length}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <BotoesDeOrdem
                  acao={acaoMover}
                  id={imagem.id}
                  primeiro={indice === 0}
                  ultimo={indice === imagens.length - 1}
                  rotuloDoItem={`a imagem ${imagem.caption || imagem.media.filename}`}
                />
                <BotaoAcaoConfirmar
                  acao={acaoRemover}
                  valores={{ id: imagem.id }}
                  rotulo="Remover"
                  pergunta="Remover a imagem da galeria?"
                  detalhe="O arquivo continua na biblioteca de mídia; só sai desta página."
                  rotuloConfirmar="Remover"
                  icone={<Trash2 className="size-4" aria-hidden />}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        action={executar}
        className="rounded-xl border border-dashed border-graf-300 bg-graf-50/60 p-4"
      >
        <input type="hidden" name="slug" value={slug} />

        <h3 className="text-sm font-bold text-graf-900">Adicionar imagem</h3>

        <div className="mt-3 grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)] md:items-start">
          <SeletorDeMidia
            nome="mediaId"
            rotulo="Imagem"
            biblioteca={biblioteca}
            erro={erroDoCampo(estado, "mediaId")}
            obrigatorio
          />

          <div className="space-y-4">
            <Campo
              rotulo="Legenda"
              name="caption"
              maxLength={180}
              ajuda="Opcional. Aparece embaixo da imagem."
              autoComplete="off"
            />
            <Botao type="submit" carregando={pendente} variante="secundario">
              <ImagePlus className="size-4" aria-hidden />
              Adicionar à galeria
            </Botao>
          </div>
        </div>

        <MensagemDoFormulario
          estado={estado}
          tituloDoErro="Não foi possível adicionar"
          className="mt-4"
        />
      </form>
    </div>
  );
}
