"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { excluirChamada, salvarChamada, type FormState } from "@/app/admin/actions";
import { EscolhaImagem, type MidiaItem } from "@/components/admin/escolha-imagem";
import { Alternar, Area, Aviso, Campo, Salvar, Selecao } from "@/components/admin/ui";

export type Chamada = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  href: string;
  target: string;
  imageId: string | null;
  order: number;
  published: boolean;
};

/** Uma das três colunas da home (a antiga tabela `home`). */
export function ChamadaForm({
  chamada,
  biblioteca,
}: {
  chamada: Chamada;
  biblioteca: MidiaItem[];
}) {
  const [state, action] = useActionState<FormState, FormData>(async (anterior, formData) => {
    const resultado = await salvarChamada(anterior, formData);
    if (resultado.ok) toast.success(resultado.ok);
    if (resultado.erro) toast.error(resultado.erro);
    return resultado;
  }, {});

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-5">
        <input type="hidden" name="id" value={chamada.id} />

        <div className="grid gap-5 md:grid-cols-[1fr_8rem]">
          <Campo label="Título" name="title" defaultValue={chamada.title} required />
          <Campo label="Ordem" name="order" type="number" defaultValue={chamada.order} />
        </div>

        <Campo label="Subtítulo" name="subtitle" defaultValue={chamada.subtitle} />
        <Area label="Texto" name="body" defaultValue={chamada.body} rows={3} />

        <div className="grid gap-5 md:grid-cols-[1fr_12rem]">
          <Campo
            label="Link"
            name="href"
            defaultValue={chamada.href}
            placeholder="/empresa ou https://…"
          />
          <Selecao label="Abrir" name="target" defaultValue={chamada.target}>
            <option value="_self">Na mesma aba</option>
            <option value="_blank">Em nova aba</option>
          </Selecao>
        </div>

        <EscolhaImagem
          name="imageId"
          label="Imagem"
          valorInicial={chamada.imageId}
          biblioteca={biblioteca}
        />

        <Alternar label="Publicada" name="published" defaultChecked={chamada.published} />

        <Aviso erro={state.erro} ok={state.ok} />
        <Salvar>{chamada.id ? "Salvar chamada" : "Criar chamada"}</Salvar>
      </form>

      {chamada.id ? (
        <form
          action={async () => {
            await excluirChamada(chamada.id);
            toast.success("Chamada excluída.");
          }}
        >
          <button
            type="submit"
            className="text-sm text-red-700 underline underline-offset-2 hover:text-red-900"
          >
            Excluir esta chamada
          </button>
        </form>
      ) : null}
    </div>
  );
}
