"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { excluirSlide, salvarSlide, type FormState } from "@/app/admin/actions";
import { EscolhaImagem, type MidiaItem } from "@/components/admin/escolha-imagem";
import { Alternar, Aviso, Campo, Salvar } from "@/components/admin/ui";

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageId: string | null;
  order: number;
  published: boolean;
  endsAt: string;
};

/** Um banner do carrossel da home (a antiga tabela `area_nobre`). */
export function BannerForm({ banner, biblioteca }: { banner: Banner; biblioteca: MidiaItem[] }) {
  const [state, action] = useActionState<FormState, FormData>(async (anterior, formData) => {
    const resultado = await salvarSlide(anterior, formData);
    if (resultado.ok) toast.success(resultado.ok);
    if (resultado.erro) toast.error(resultado.erro);
    return resultado;
  }, {});

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-5">
        <input type="hidden" name="id" value={banner.id} />

        <EscolhaImagem
          name="imageId"
          label="Imagem do banner"
          valorInicial={banner.imageId}
          biblioteca={biblioteca}
          hint="Use uma imagem larga — ela ocupa a faixa inteira. O original tem 1920×900."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <Campo
            label="Título sobre a imagem"
            name="title"
            defaultValue={banner.title}
            hint="Deixe vazio para mostrar só a imagem, como está hoje."
          />
          <Campo label="Subtítulo" name="subtitle" defaultValue={banner.subtitle} />
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_10rem_8rem]">
          <Campo label="Link ao clicar" name="href" defaultValue={banner.href} />
          <Campo
            label="Sai do ar em"
            name="endsAt"
            type="date"
            defaultValue={banner.endsAt}
            hint="Opcional."
          />
          <Campo label="Ordem" name="order" type="number" defaultValue={banner.order} />
        </div>

        <Alternar label="Publicado" name="published" defaultChecked={banner.published} />

        <Aviso erro={state.erro} ok={state.ok} />
        <Salvar>{banner.id ? "Salvar banner" : "Criar banner"}</Salvar>
      </form>

      {banner.id ? (
        <form
          action={async () => {
            await excluirSlide(banner.id);
            toast.success("Banner excluído.");
          }}
        >
          <button
            type="submit"
            className="text-sm text-red-700 underline underline-offset-2 hover:text-red-900"
          >
            Excluir este banner
          </button>
        </form>
      ) : null}
    </div>
  );
}
