"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { excluirSolucao, salvarSolucao, type FormState } from "@/app/admin/actions";
import { Editor } from "@/components/admin/editor";
import { EscolhaImagem, type MidiaItem } from "@/components/admin/escolha-imagem";
import { Alternar, Aviso, Campo, Salvar } from "@/components/admin/ui";

type Solucao = {
  slug: string;
  name: string;
  description: string;
  imageId: string | null;
  order: number;
  published: boolean;
};

export function SolucaoForm({
  solucao,
  biblioteca,
}: {
  solucao: Solucao;
  biblioteca: MidiaItem[];
}) {
  const [state, action] = useActionState<FormState, FormData>(async (anterior, formData) => {
    const resultado = await salvarSolucao(anterior, formData);
    if (resultado.ok) toast.success(resultado.ok);
    if (resultado.erro) toast.error(resultado.erro);
    return resultado;
  }, {});

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-8">
        <input type="hidden" name="slug" value={solucao.slug} />

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="grid gap-5 md:grid-cols-[1fr_8rem]">
            <Campo
              label="Nome"
              name="name"
              defaultValue={solucao.name}
              required
              hint="É o texto do cabeçalho da sanfona."
            />
            <Campo
              label="Ordem"
              name="order"
              type="number"
              defaultValue={solucao.order}
              hint="Menor primeiro."
            />
          </div>
          <div className="mt-5">
            <Alternar
              label="Publicada"
              name="published"
              defaultChecked={solucao.published}
              hint="Desmarque para tirar do site sem apagar."
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-5 font-semibold text-slate-900">Equipamentos atendidos</h2>
          <Editor name="description" valorInicial={solucao.description} />
          <p className="mt-3 text-xs text-slate-500">
            É o conteúdo que aparece quando o visitante abre a sanfona.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <EscolhaImagem
            name="imageId"
            label="Foto"
            valorInicial={solucao.imageId}
            biblioteca={biblioteca}
            hint="Opcional. Quando existe, aparece à esquerda do texto."
          />
        </section>

        <Aviso erro={state.erro} ok={state.ok} />

        <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-4 backdrop-blur lg:-mx-8 lg:px-8">
          <Salvar>{solucao.slug ? "Salvar solução" : "Criar solução"}</Salvar>
        </div>
      </form>

      {solucao.slug ? (
        <form
          action={async () => {
            await excluirSolucao(solucao.slug);
          }}
          className="rounded-lg border border-red-200 bg-red-50 p-6"
        >
          <h2 className="font-semibold text-red-900">Excluir solução</h2>
          <p className="mt-1 mb-4 text-sm text-red-800">
            A exclusão é definitiva. Para apenas tirar do ar, desmarque “Publicada”.
          </p>
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
          >
            Excluir definitivamente
          </button>
        </form>
      ) : null}
    </div>
  );
}
