"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import { salvarMarca, type EstadoAcao } from "@/app/acoes/admin-catalogo";
import { CampoNomeESlug } from "@/components/admin/catalogo/campo-slug";
import { BarraSalvar, Bloco, Grade, RegiaoEstado } from "@/components/admin/catalogo/moldura-form";
import { Botao, LinkBotao } from "@/components/ui/button";
import { EnviarArquivo, type ArquivoEnviado } from "@/components/ui/enviar-arquivo";
import { Area, Campo, Marcador } from "@/components/ui/form";

/* ============================================================================
   Marca

   Cadastro curto: nome, endereço, descrição e logo. O logo é uma mídia da
   biblioteca — guardamos o id, não o arquivo, para a mesma imagem poder ser
   reaproveitada sem duplicar upload.
   ============================================================================ */

export type MarcaEditavel = {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  published: boolean;
  logoId: string | null;
  logoUrl: string | null;
};

export function FormularioMarca({
  marca,
  ordemSugerida,
  somenteLeitura,
}: {
  marca?: MarcaEditavel;
  ordemSugerida?: number;
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarMarca, {});
  const [logo, setLogo] = useState<{ id: string; url: string } | null>(
    marca?.logoId && marca.logoUrl ? { id: marca.logoId, url: marca.logoUrl } : null,
  );

  function receber(arquivos: ArquivoEnviado[]) {
    const ultimo = arquivos[arquivos.length - 1];
    if (ultimo?.id) setLogo({ id: ultimo.id, url: ultimo.url });
  }

  return (
    <Bloco
      titulo={marca ? "Editar marca" : "Nova marca"}
      descricao="A marca aparece no filtro do catálogo e na página de marcas."
    >
      <form action={enviar} className="space-y-8">
        {marca ? <input type="hidden" name="id" value={marca.id} /> : null}
        <input type="hidden" name="logoId" value={logo?.id ?? ""} />
        <RegiaoEstado estado={estado} />

        <fieldset disabled={somenteLeitura} className="space-y-8">
          <CampoNomeESlug
            nomeInicial={marca?.name}
            slugInicial={marca?.slug}
            rotuloNome="Nome da marca"
            prefixoUrl="/marcas/"
            autoFocus={!marca}
            erroNome={estado.campo === "name" ? estado.erro : undefined}
            erroSlug={estado.campo === "slug" ? estado.erro : undefined}
          />

          <Area
            rotulo="Descrição"
            name="description"
            defaultValue={marca?.description ?? ""}
            rows={4}
            maxLength={1200}
            ajuda="Uma apresentação curta do fabricante, exibida na página da marca."
          />

          <Grade>
            <Campo
              rotulo="Ordem"
              name="order"
              type="number"
              inputMode="numeric"
              min={0}
              max={9999}
              defaultValue={marca?.order ?? ordemSugerida ?? 0}
              ajuda="Menor aparece antes na lista de marcas."
            />
            <div className="flex items-end pb-1">
              <Marcador
                name="published"
                value="on"
                defaultChecked={marca?.published ?? true}
                rotulo="Publicada"
                ajuda="Despublicada, some do filtro e da página de marcas."
              />
            </div>
          </Grade>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-graf-800">Logo</p>
            {logo ? (
              <div className="flex flex-wrap items-center gap-4 rounded-lg border border-graf-200 bg-graf-50/60 p-4">
                <img
                  src={logo.url}
                  alt={`Logo de ${marca?.name ?? "nova marca"}`}
                  className="h-16 w-32 rounded border border-graf-200 bg-white object-contain"
                />
                <Botao
                  type="button"
                  variante="perigo"
                  tamanho="sm"
                  onClick={() => setLogo(null)}
                  disabled={somenteLeitura}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Remover logo
                </Botao>
              </div>
            ) : (
              <EnviarArquivo
                rotulo="Enviar logo"
                ajuda="PNG com fundo transparente funciona melhor. Até 8 MB."
                aceita={["image/png", "image/webp", "image/jpeg"]}
                aoEnviado={receber}
              />
            )}
          </div>
        </fieldset>

        {!somenteLeitura ? (
          <BarraSalvar>
            <LinkBotao href="/admin/marcas" variante="secundario">
              Voltar para a lista
            </LinkBotao>
            <Botao type="submit" carregando={enviando}>
              {marca ? "Salvar marca" : "Criar marca"}
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
