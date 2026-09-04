"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { salvarPagina, type FormState } from "@/app/admin/actions";
import { Editor } from "@/components/admin/editor";
import { EscolhaImagem, type MidiaItem } from "@/components/admin/escolha-imagem";
import { Area, Aviso, Campo, Salvar } from "@/components/admin/ui";

type Pagina = {
  slug: string;
  title: string;
  lead: string;
  body: string;
  videoId: string;
  coverId: string | null;
  seoTitle: string;
  seoDescription: string;
  editable: boolean;
  galeria: string[];
};

export function PaginaForm({
  pagina,
  biblioteca,
}: {
  pagina: Pagina;
  biblioteca: MidiaItem[];
}) {
  const [state, action] = useActionState<FormState, FormData>(async (anterior, formData) => {
    const resultado = await salvarPagina(anterior, formData);
    if (resultado.ok) toast.success(resultado.ok);
    if (resultado.erro) toast.error(resultado.erro);
    return resultado;
  }, {});

  // as imagens 2 e 3 do layout antigo — aparecem empilhadas abaixo da capa
  const [galeria, setGaleria] = useState<string[]>(pagina.galeria);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="slug" value={pagina.slug} />

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-5 font-semibold text-slate-900">Cabeçalho da página</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <Campo
            label="Título"
            name="title"
            defaultValue={pagina.title}
            required
            hint="Aparece no menu, no <h1> e na trilha de navegação."
          />
          <Campo
            label="Texto de apoio"
            name="lead"
            defaultValue={pagina.lead}
            hint="A linha menor logo abaixo do título."
          />
        </div>
      </section>

      {pagina.editable ? (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-5 font-semibold text-slate-900">Conteúdo</h2>
            <Editor name="body" valorInicial={pagina.body} />
          </section>

          <section className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Imagens da coluna direita</h2>

            <EscolhaImagem
              name="coverId"
              label="Primeira imagem"
              valorInicial={pagina.coverId}
              biblioteca={biblioteca}
            />

            {galeria.map((mediaId, i) => (
              <div key={`${mediaId}-${i}`} className="flex items-end gap-3">
                <EscolhaImagem
                  name="galeria"
                  label={`Imagem ${i + 2}`}
                  valorInicial={mediaId}
                  biblioteca={biblioteca}
                />
                <button
                  type="button"
                  onClick={() => setGaleria((atual) => atual.filter((_, j) => j !== i))}
                  className="mb-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-red-700 transition-colors hover:border-red-300"
                >
                  Excluir espaço
                </button>
              </div>
            ))}

            {galeria.length < 2 ? (
              <button
                type="button"
                onClick={() => setGaleria((atual) => [...atual, ""])}
                className="rounded-md border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 transition-colors hover:border-slate-400"
              >
                + adicionar imagem
              </button>
            ) : null}

            <Campo
              label="Vídeo do YouTube"
              name="videoId"
              defaultValue={pagina.videoId}
              placeholder="ex.: dQw4w9WgXcQ"
              hint="Só o identificador do vídeo, o trecho depois de v= no endereço. Deixe vazio para não exibir."
            />
          </section>
        </>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-5 font-semibold text-slate-900">SEO</h2>
        <div className="space-y-5">
          <Campo
            label="Título para o Google"
            name="seoTitle"
            defaultValue={pagina.seoTitle}
            hint="Aparece na aba do navegador e no resultado de busca."
          />
          <Area
            label="Descrição para o Google"
            name="seoDescription"
            defaultValue={pagina.seoDescription}
            rows={3}
            hint="Até 160 caracteres funciona melhor."
          />
        </div>
      </section>

      <Aviso erro={state.erro} ok={state.ok} />

      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <Salvar>Salvar página</Salvar>
      </div>
    </form>
  );
}
