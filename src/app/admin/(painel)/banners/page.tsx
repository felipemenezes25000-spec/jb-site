import { BannerForm } from "@/components/admin/banner-form";
import { TituloPagina } from "@/components/admin/shell";
import { Etiqueta } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Banners da home" };

function paraInput(data: Date | null) {
  return data ? data.toISOString().slice(0, 10) : "";
}

export default async function BannersPage() {
  const [banners, biblioteca] = await Promise.all([
    prisma.slide.findMany({ orderBy: { order: "asc" }, include: { image: true } }),
    prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, url: true, filename: true, alt: true },
    }),
  ]);

  const agora = new Date();

  return (
    <>
      <TituloPagina
        titulo="Banners da home"
        descricao="O carrossel do topo. Troca a cada 8 segundos, como no site atual."
      />

      <div className="space-y-4">
        {banners.map((banner) => {
          const vencido = banner.endsAt !== null && banner.endsAt < agora;
          return (
            <details
              key={banner.id}
              className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50">
                <span className="h-12 w-24 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-50">
                  {banner.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner.image.url} alt="" className="size-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 font-semibold text-slate-900">
                  {banner.title || banner.image?.filename || "Banner"}
                </span>
                {!banner.published ? (
                  <Etiqueta tom="cinza">oculto</Etiqueta>
                ) : vencido ? (
                  <Etiqueta tom="ambar">fora do prazo</Etiqueta>
                ) : (
                  <Etiqueta tom="verde">no ar</Etiqueta>
                )}
                <span className="text-xs text-slate-400 group-open:hidden">editar</span>
                <span className="hidden text-xs text-slate-400 group-open:inline">fechar</span>
              </summary>
              <div className="border-t border-slate-100 p-6">
                <BannerForm
                  banner={{
                    id: banner.id,
                    title: banner.title,
                    subtitle: banner.subtitle ?? "",
                    href: banner.href ?? "",
                    imageId: banner.imageId,
                    order: banner.order,
                    published: banner.published,
                    endsAt: paraInput(banner.endsAt),
                  }}
                  biblioteca={biblioteca}
                />
              </div>
            </details>
          );
        })}

        <details className="overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
          <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
            + novo banner
          </summary>
          <div className="border-t border-slate-100 p-6">
            <BannerForm
              banner={{
                id: "",
                title: "",
                subtitle: "",
                href: "",
                imageId: null,
                order: banners.length + 1,
                published: true,
                endsAt: "",
              }}
              biblioteca={biblioteca}
            />
          </div>
        </details>
      </div>
    </>
  );
}
