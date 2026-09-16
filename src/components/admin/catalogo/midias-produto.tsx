"use client";

import { useActionState, useRef, useState } from "react";
import { Star } from "lucide-react";

import { salvarMidias, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import { ListaEditavel } from "@/components/admin/catalogo/lista-editavel";
import { BarraSalvar, Bloco, RegiaoEstado, Secao } from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { EnviarArquivo, type ArquivoEnviado } from "@/components/ui/enviar-arquivo";
import { Campo } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/* ============================================================================
   Galeria do produto

   A primeira foto da lista é a capa — é ela que aparece no card da vitrine e
   no compartilhamento. Por isso "definir como capa" é só levar a foto para a
   primeira posição: uma regra visível, sem campo escondido dizendo o
   contrário.

   Texto alternativo é obrigatório em cada foto, aqui e no servidor. Foto de
   equipamento sem descrição deixa quem usa leitor de tela sem a informação
   principal da página.
   ============================================================================ */

export type FotoDoProduto = {
  mediaId: string;
  url: string;
  alt: string;
  nome: string;
};

export function MidiasProduto({
  produtoId,
  iniciais,
  somenteLeitura,
}: {
  produtoId: string;
  iniciais: FotoDoProduto[];
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarMidias, {});
  const [fotos, setFotos] = useState<FotoDoProduto[]>(iniciais);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  // O componente de envio devolve a lista inteira dele a cada mudança; sem
  // memória do que já entrou, uma foto removida daqui voltaria no próximo envio.
  const jaAdicionadas = useRef(new Set(iniciais.map((foto) => foto.url)));

  function receber(arquivos: ArquivoEnviado[]) {
    const novas: FotoDoProduto[] = [];
    for (const arquivo of arquivos) {
      if (!arquivo.id || jaAdicionadas.current.has(arquivo.url)) continue;
      jaAdicionadas.current.add(arquivo.url);
      novas.push({ mediaId: arquivo.id, url: arquivo.url, alt: "", nome: arquivo.nome });
    }
    if (novas.length === 0) return;
    setFotos((atual) => [...atual, ...novas]);
  }

  const semAlt = fotos.filter((foto) => foto.alt.trim() === "").length;
  const bloqueado = semAlt > 0;

  return (
    <Bloco
      titulo="Fotos do produto"
      descricao="A primeira da lista é a capa. Aceita JPG, PNG, WebP e GIF, até 8 MB por arquivo."
    >
      <form
        action={enviar}
        onSubmit={(evento) => {
          setTentouSalvar(true);
          if (bloqueado) evento.preventDefault();
        }}
        className="space-y-6"
      >
        <input type="hidden" name="id" value={produtoId} />
        <input
          type="hidden"
          name="itens"
          value={JSON.stringify(fotos.map((foto) => ({ mediaId: foto.mediaId, alt: foto.alt.trim() })))}
        />

        <RegiaoEstado estado={estado} />

        {!somenteLeitura ? (
          <EnviarArquivo
            rotulo="Adicionar fotos"
            multiplo
            ajuda="Fotos claras do equipamento inteiro e dos detalhes que importam na decisão."
            aoEnviado={receber}
            aceita={["image/jpeg", "image/png", "image/webp", "image/gif"]}
          />
        ) : null}

        <Secao
          titulo={`Galeria (${fotos.length})`}
          descricao="Suba, desça ou remova. O texto alternativo descreve a foto para quem não a vê."
        >
          <ListaEditavel<FotoDoProduto>
            itens={fotos}
            aoMudar={setFotos}
            desabilitado={somenteLeitura}
            nomeDaLinha="foto"
            rotuloAdicionar="Adicionar foto"
            vazio="Nenhuma foto ainda. Envie a primeira acima — sem foto, o produto perde a vitrine."
            // foto só entra pelo envio de arquivo, então a lista não cria linha em branco
            ocultarAdicionar
            novoItem={() => ({ mediaId: "", url: "", alt: "", nome: "" })}
            renderizar={(foto, indice, atualizar) => (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <img
                  src={foto.url}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-lg border border-graf-200 bg-white object-contain"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {indice === 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-jb-50 px-2.5 py-1 text-xs font-bold text-jb-700 ring-1 ring-inset ring-jb-500/20">
                        <Star className="size-3" aria-hidden />
                        Capa
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={somenteLeitura}
                        onClick={() =>
                          setFotos((atual) => {
                            const copia = [...atual];
                            const [movida] = copia.splice(indice, 1);
                            return [movida, ...copia];
                          })
                        }
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-apoio font-semibold text-graf-600",
                          "hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                          "disabled:cursor-not-allowed disabled:text-graf-300",
                        )}
                      >
                        <Star className="size-3.5" aria-hidden />
                        Usar como capa
                      </button>
                    )}
                    <span className="truncate text-apoio text-graf-500">{foto.nome}</span>
                  </div>

                  <Campo
                    rotulo="Texto alternativo"
                    value={foto.alt}
                    onChange={(evento) => atualizar({ alt: evento.target.value })}
                    disabled={somenteLeitura}
                    maxLength={180}
                    required
                    erro={
                      tentouSalvar && foto.alt.trim() === ""
                        ? "Descreva o que aparece na foto."
                        : undefined
                    }
                    ajuda="Ex.: cadeira odontológica vista de lado, com refletor ligado."
                  />
                </div>
              </div>
            )}
          />
        </Secao>

        {!somenteLeitura ? (
          <BarraSalvar
            ajuda={
              bloqueado
                ? `${semAlt} foto(s) ainda sem texto alternativo.`
                : "A capa é a primeira foto da lista."
            }
          >
            <Botao type="submit" carregando={enviando} disabled={bloqueado}>
              Salvar galeria
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
