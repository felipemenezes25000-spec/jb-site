import { ChamadaForm } from "@/components/admin/chamada-form";
import { TituloPagina } from "@/components/admin/shell";
import { Etiqueta } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Chamadas da home" };

export default async function ChamadasPage() {
  const [chamadas, biblioteca] = await Promise.all([
    prisma.highlight.findMany({ orderBy: { order: "asc" }, include: { image: true } }),
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, filename: true, alt: true },
    }),
  ]);

  return (
    <>
      <TituloPagina
        titulo="Chamadas da home"
        descricao="As colunas com imagem e título que ficam logo abaixo da frase de destaque."
      />

      <div className="space-y-4">
        {chamadas.map((chamada) => (
          <details
            key={chamada.id}
            className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50">
                {chamada.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={chamada.image.url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-400">sem foto</span>
                )}
              </span>
              <span className="min-w-0 flex-1 font-semibold text-slate-900">{chamada.title}</span>
              {chamada.published ? (
                <Etiqueta tom="verde">no ar</Etiqueta>
              ) : (
                <Etiqueta tom="cinza">oculta</Etiqueta>
              )}
              <span className="text-xs text-slate-400 group-open:hidden">editar</span>
              <span className="hidden text-xs text-slate-400 group-open:inline">fechar</span>
            </summary>
            <div className="border-t border-slate-100 p-6">
              <ChamadaForm
                chamada={{
                  id: chamada.id,
                  title: chamada.title,
                  subtitle: chamada.subtitle ?? "",
                  body: chamada.body ?? "",
                  href: chamada.href ?? "",
                  target: chamada.target,
                  imageId: chamada.imageId,
                  order: chamada.order,
                  published: chamada.published,
                }}
                biblioteca={biblioteca}
              />
            </div>
          </details>
        ))}

        <details className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
            + nova chamada
          </summary>
          <div className="border-t border-slate-100 p-6">
            <ChamadaForm
              chamada={{
                id: "",
                title: "",
                subtitle: "",
                body: "",
                href: "",
                target: "_self",
                imageId: null,
                order: chamadas.length + 1,
                published: true,
              }}
              biblioteca={biblioteca}
            />
          </div>
        </details>
      </div>
    </>
  );
}
