import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Boxes, Headphones, ListChecks } from "lucide-react";

import { IconeCategoria } from "@/components/ui/icone";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const PUBLICADO = { status: "active" } as const;
const MINIMO_PARA_CONTAR = 4;

/**
 * Foto curada por categoria, usada quando o painel ainda não subiu uma imagem
 * própria. Vem antes da foto do produto porque é o recorte pensado para este
 * bloco — fundo claro, produto isolado e sombra de contato.
 */
const FOTO_CURADA: Record<string, string> = {
  bioseguranca: "/images/categorias/bioseguranca.webp",
  profilaxia: "/images/categorias/profilaxia.webp",
  cirurgia: "/images/categorias/cirurgia.webp",
  "unidade-basica-de-tratamento": "/images/categorias/unidade-basica-de-tratamento.webp",
};

const VANTAGENS = [
  {
    icone: Boxes,
    titulo: "Encontre mais rápido",
    apoio: "Categorização pensada para a rotina da clínica.",
  },
  {
    icone: ListChecks,
    titulo: "Compare com clareza",
    apoio: "Veja os modelos que realmente fazem sentido.",
  },
  {
    icone: Headphones,
    titulo: "Conte com nossa equipe",
    apoio: "Orientação técnica em todas as etapas.",
  },
] as const;

async function carregar() {
  return prisma.category.findMany({
    where: { published: true, parentId: null, products: { some: PUBLICADO } },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
    take: 4,
    select: {
      slug: true,
      name: true,
      icon: true,
      image: { select: { url: true, alt: true } },
      _count: { select: { products: { where: PUBLICADO } } },
      products: {
        where: { ...PUBLICADO, media: { some: {} } },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 1,
        select: {
          media: {
            orderBy: { order: "asc" },
            take: 1,
            select: { alt: true, media: { select: { url: true, alt: true } } },
          },
        },
      },
    },
  });
}

type CategoriaHome = Awaited<ReturnType<typeof carregar>>[number];

function fotoCategoria(categoria: CategoriaHome) {
  if (categoria.image) {
    return { url: categoria.image.url, alt: categoria.image.alt ?? categoria.name };
  }

  const curada = FOTO_CURADA[categoria.slug];
  if (curada) return { url: curada, alt: categoria.name };

  const fotoProduto = categoria.products[0]?.media[0];
  if (fotoProduto) {
    return {
      url: fotoProduto.media.url,
      alt: fotoProduto.alt ?? fotoProduto.media.alt ?? categoria.name,
    };
  }

  return null;
}

function detalheCategoria(categoria: CategoriaHome) {
  const total = categoria._count.products;
  return total >= MINIMO_PARA_CONTAR
    ? plural(total, "equipamento disponível", "equipamentos disponíveis")
    : "Explore os equipamentos disponíveis.";
}

export async function SecaoCategorias() {
  const categorias = await carregar();
  if (categorias.length === 0) return null;

  const [principal, ...outras] = categorias;

  return (
    <section className="relative isolate overflow-hidden bg-[#fffdfc] py-16 min-[768px]:py-20 min-[1024px]:py-24">
      {/* Fundo: halo quente, arcos finíssimos e o consultório entrando pelas bordas. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(215,25,32,0.06),transparent_30%),radial-gradient(circle_at_6%_54%,rgba(215,25,32,0.05),transparent_26%),linear-gradient(150deg,#fff_0%,#fffafa_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[22rem] -top-[30rem] size-[62rem] rounded-full border border-jb-200/60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-[15rem] -top-[24rem] size-[48rem] rounded-full border-[2.6rem] border-jb-50/70"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[24rem] -left-[18rem] size-[44rem] rounded-full border border-jb-100"
        aria-hidden
      />

      <div
        className="pointer-events-none absolute -left-10 bottom-0 hidden w-[clamp(10rem,13vw,15rem)] opacity-70 blur-[2px] min-[1280px]:block"
        aria-hidden
      >
        <Image
          src="/images/next-step/clinic-chair-left.webp"
          alt=""
          width={260}
          height={566}
          sizes="240px"
          className="h-auto w-full object-contain"
        />
      </div>

      <p
        className="pointer-events-none absolute left-[5rem] top-[8.5rem] hidden text-[0.6rem] font-semibold uppercase leading-[1.9] tracking-[0.3em] text-graf-400 min-[1600px]:block"
        aria-hidden
      >
        Equipamentos
        <br />
        para o seu
        <br />
        melhor amanhã
        <span className="mt-4 block h-px w-6 bg-graf-300" />
      </p>

      <p
        className="pointer-events-none absolute right-[3.5rem] top-[3rem] hidden text-right text-[0.6rem] font-semibold uppercase leading-[1.9] tracking-[0.3em] text-graf-400 min-[1600px]:block"
        aria-hidden
      >
        Tecnologia
        <br />
        que impulsiona
        <br />
        sorrisos
      </p>

      <p
        className="pointer-events-none absolute bottom-[4rem] right-[3.5rem] hidden text-right text-[0.6rem] font-semibold uppercase leading-[1.9] tracking-[0.3em] text-graf-400 min-[1600px]:block"
        aria-hidden
      >
        Parceria
        <br />
        em todas
        <br />
        as etapas
      </p>

      <div className="container-jb relative z-10 max-w-[112rem] min-[1600px]:px-[9rem]">
        {/* ── Cabeçalho editorial ─────────────────────────────────────────── */}
        <div className="grid gap-7 min-[1024px]:grid-cols-[minmax(0,1fr)_auto] min-[1024px]:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 shrink-0 bg-jb-600" aria-hidden />
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-jb-700">
                Compre por categoria
              </p>
            </div>
            <h2 className="mt-4 max-w-[19ch] text-[clamp(2.5rem,3.8vw,4.4rem)] font-black leading-[0.96] tracking-[-0.055em] text-graf-950">
              <span className="block">Menos procura.</span>
              <span className="block">
                <span className="text-jb-700">Mais clareza</span> para escolher.
              </span>
            </h2>
            <p className="mt-4 max-w-[38rem] text-[1.02rem] leading-[1.55] text-graf-500">
              Entre pela necessidade da clínica e chegue mais rápido aos modelos que realmente fazem
              sentido comparar.
            </p>
          </div>

          <Link
            href="/loja"
            className="group foco-jb inline-flex min-h-11 items-center gap-2 self-start rounded-xs text-sm font-extrabold text-jb-700 transition-colors hover:text-jb-900 min-[1024px]:self-end"
          >
            Ver catálogo completo
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>

        {/* ── Destaque + lista ────────────────────────────────────────────── */}
        <div className="mt-9 grid gap-4 min-[1024px]:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)] min-[1024px]:gap-5">
          <CategoriaPrincipal categoria={principal} />

          {outras.length > 0 ? (
            <ul className="grid gap-4 min-[1024px]:gap-5">
              {outras.map((categoria, indice) => (
                <li key={categoria.slug} className="min-w-0">
                  <CategoriaCompacta categoria={categoria} numero={indice + 2} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* ── Faixa de vantagens ──────────────────────────────────────────── */}
        <div className="mt-10 grid gap-6 border-t border-graf-100 pt-8 min-[768px]:grid-cols-3 min-[768px]:gap-0 min-[768px]:divide-x min-[768px]:divide-graf-100">
          {VANTAGENS.map(({ icone: IconeVantagem, titulo, apoio }, indice) => (
            <div
              key={titulo}
              className={`flex items-start gap-4 ${
                indice === 0
                  ? "min-[768px]:pr-8"
                  : indice === 1
                    ? "min-[768px]:px-8"
                    : "min-[768px]:pl-8"
              }`}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-jb-50 text-jb-600">
                <IconeVantagem className="size-[1.05rem]" aria-hidden />
              </span>
              <p className="text-[0.72rem] font-black uppercase tracking-[0.14em] text-graf-800">
                {titulo}
                <span className="mt-1.5 block text-[0.82rem] font-normal normal-case tracking-normal text-graf-500">
                  {apoio}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoriaPrincipal({ categoria }: { categoria: CategoriaHome }) {
  const foto = fotoCategoria(categoria);

  return (
    <Link
      href={`/categoria/${categoria.slug}`}
      className="group relative grid min-h-[29rem] overflow-hidden rounded-[2rem] bg-[#111214] text-white shadow-[0_30px_76px_-50px_rgba(55,0,0,0.55)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-jb-500 min-[640px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_58%_46%,rgba(226,22,30,0.5),transparent_38%),radial-gradient(circle_at_16%_92%,rgba(150,6,14,0.35),transparent_36%),linear-gradient(118deg,#0c0c0e_0%,#150609_54%,#2a070b_100%)]"
        aria-hidden
      />
      <div className="absolute -left-24 top-1/2 size-[26rem] -translate-y-1/2 rounded-full border border-jb-500/25" aria-hidden />
      <div className="absolute -left-10 top-1/2 size-[17rem] -translate-y-1/2 rounded-full border border-jb-500/15" aria-hidden />

      <div className="relative z-10 flex min-w-0 flex-col justify-end p-7 min-[640px]:p-8 min-[1024px]:p-10">
        <span className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-jb-300">
          Categoria em destaque
        </span>
        <h3 className="mt-3 max-w-[9ch] text-[clamp(2.1rem,3.4vw,3.7rem)] font-black leading-[0.94] tracking-[-0.055em] text-white">
          {categoria.name}
        </h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
          {detalheCategoria(categoria)}
        </p>
        <span className="mt-7 inline-flex min-h-[3.25rem] w-fit items-center gap-4 rounded-full bg-gradient-to-b from-jb-500 to-jb-700 py-2 pl-7 pr-2.5 text-sm font-bold text-white shadow-[0_18px_36px_-16px_rgba(235,20,29,0.85)] transition-transform group-hover:-translate-y-0.5">
          Explorar categoria
          <span className="flex size-9 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-1">
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </span>

        <div className="mt-8 hidden items-center gap-5 text-[0.55rem] font-semibold uppercase leading-[1.7] tracking-[0.22em] text-white/40 min-[1024px]:flex">
          <span>
            Mais
            <br />
            segurança
          </span>
          <span className="h-7 w-px bg-white/15" aria-hidden />
          <span>
            Mais
            <br />
            eficiência
          </span>
          <span className="h-7 w-px bg-white/15" aria-hidden />
          <span>
            Mais
            <br />
            tranquilidade
          </span>
        </div>
      </div>

      <div className="relative min-h-72 overflow-hidden bg-[linear-gradient(150deg,#fff_0%,#fbf7f7_100%)] min-[640px]:min-h-full">
        <div className="absolute -right-20 -top-24 size-72 rounded-full border-[3rem] border-jb-50" aria-hidden />
        <div className="absolute -right-6 top-1/2 size-[19rem] -translate-y-1/2 rounded-full border border-jb-100" aria-hidden />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_46%_54%,rgba(215,25,32,0.07),transparent_42%)]"
          aria-hidden
        />

        <p
          className="absolute right-6 top-6 z-10 hidden text-right text-[0.55rem] font-semibold uppercase leading-[1.8] tracking-[0.24em] text-graf-400 min-[1280px]:block"
          aria-hidden
        >
          Clínicas
          <br />
          mais seguras
          <br />
          sempre
          <span className="ml-auto mt-2.5 block h-px w-5 bg-jb-500" />
        </p>

        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 100vw, 40vw"
            className="object-contain p-[9%] transition-transform duration-700 group-hover:scale-[1.05]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-jb-500" aria-hidden>
            <IconeCategoria nome={categoria.icon} className="size-20" />
          </span>
        )}
      </div>
    </Link>
  );
}

function CategoriaCompacta({ categoria, numero }: { categoria: CategoriaHome; numero: number }) {
  const foto = fotoCategoria(categoria);

  return (
    <Link
      href={`/categoria/${categoria.slug}`}
      className="group grid min-h-[9.3rem] grid-cols-[minmax(0,1fr)_9.5rem] overflow-hidden rounded-[1.5rem] border border-graf-100 bg-white shadow-[0_18px_50px_-44px_rgba(70,0,0,0.35)] transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-jb-200 hover:shadow-[0_24px_54px_-38px_rgba(80,0,0,0.42)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 min-[640px]:grid-cols-[minmax(0,1fr)_12.5rem]"
    >
      <div className="flex min-w-0 flex-col justify-center p-5 min-[640px]:p-7">
        <div className="flex items-center gap-3">
          <span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-jb-600">
            0{numero}
          </span>
          <span className="h-px w-6 bg-graf-200" aria-hidden />
        </div>
        <div className="mt-2 flex items-center gap-4">
          <h3 className="min-w-0 text-xl font-black tracking-[-0.038em] text-graf-950 transition-colors group-hover:text-jb-700 min-[640px]:text-[1.6rem]">
            {categoria.name}
          </h3>
          <span className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-full border border-graf-100 bg-white text-jb-600 shadow-[0_10px_22px_-16px_rgba(17,24,39,0.5)] transition-[transform,border-color] duration-300 group-hover:translate-x-1 group-hover:border-jb-200">
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
        <p className="mt-2 text-[0.8rem] leading-relaxed text-graf-500">
          {detalheCategoria(categoria)}
        </p>
      </div>

      <div className="relative overflow-hidden bg-[linear-gradient(160deg,#fff_0%,#fbf8f8_100%)]">
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_52%_50%,rgba(215,25,32,0.06),transparent_46%)]"
          aria-hidden
        />
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="200px"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.07]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-jb-400" aria-hidden>
            <IconeCategoria nome={categoria.icon} className="size-10" />
          </span>
        )}
      </div>
    </Link>
  );
}
