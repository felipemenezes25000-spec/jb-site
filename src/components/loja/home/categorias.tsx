import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Boxes, Headphones, ListChecks } from "lucide-react";

import { IconeCategoria } from "@/components/ui/icone";
import { stripTags } from "@/lib/html";
import { plural } from "@/lib/format";
import { unificarPorNome } from "@/lib/homonimos";
import { prisma } from "@/lib/prisma";

const PUBLICADO = { status: "active" } as const;

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
    /* Oito para escolher quatro: cadastros de mesmo nome são juntados depois
       da consulta, e sem folga a fileira poderia terminar com três. */
    take: 8,
    select: {
      slug: true,
      name: true,
      description: true,
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

  const fotoProduto = categoria.products[0]?.media[0];
  if (fotoProduto) {
    return {
      url: fotoProduto.media.url,
      alt: fotoProduto.alt ?? fotoProduto.media.alt ?? categoria.name,
    };
  }

  return null;
}

/**
 * Os primeiros itens listados na descrição da categoria.
 *
 * O cadastro guarda a descrição como lista HTML ("<ul><li>Autoclaves</li>…"),
 * que é exatamente o que interessa dizer no cartão: o que tem lá dentro.
 */
function itensDaCategoria(descricao: string): string[] {
  const itens = descricao.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (!itens) return [];

  return itens
    .map((item) => stripTags(item).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * A linha de apoio do cartão de categoria.
 *
 * Antes as quatro categorias repetiam "Explore os equipamentos disponíveis."
 * sempre que tivessem menos de quatro produtos — quatro cartões, a mesma
 * frase, nenhuma informação. O cadastro já lista o que cada categoria reúne,
 * então é isso que aparece; sem lista, a contagem real, que ao menos difere
 * de uma categoria para outra.
 */
function detalheCategoria(categoria: CategoriaHome) {
  const itens = itensDaCategoria(categoria.description ?? "");
  if (itens.length) return itens.slice(0, 3).join(" · ");

  const total = categoria._count.products;
  return plural(total, "equipamento disponível", "equipamentos disponíveis");
}

export async function SecaoCategorias() {
  const linhas = await carregar();
  /* Duas categorias chamadas "Biossegurança" viravam dois cartões iguais
     lado a lado. Aqui viram um, com a soma dos equipamentos — o mesmo
     tratamento que a barra de filtros e os atalhos da coleção dão. */
  const categorias = unificarPorNome(
    linhas.map((linha) => ({ ...linha, nome: linha.name, quantidade: linha._count.products })),
  ).slice(0, 4);
  if (categorias.length === 0) return null;

  const [principal, ...outras] = categorias;

  return (
    <section className="relative isolate overflow-hidden bg-[#fffdfc] py-16 min-[768px]:py-20">
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




      <div className="revelar container-jb relative z-10 max-w-[112rem]">
        {/* ── Cabeçalho editorial ─────────────────────────────────────────── */}
        <div className="grid gap-7 min-[1024px]:grid-cols-[minmax(0,1fr)_auto] min-[1024px]:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-8 shrink-0 bg-jb-600" aria-hidden />
              <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-jb-700">
                Compre por categoria
              </p>
            </div>
            <h2 className="manchete mt-4 max-w-[19ch] text-[clamp(2rem,3vw,3.25rem)] text-graf-950">
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
            className="group foco-jb inline-flex min-h-11 items-center gap-2 self-start rounded-lg text-sm font-extrabold text-jb-700 transition-colors hover:text-jb-900 min-[1024px]:self-end"
          >
            Ver catálogo completo
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </Link>
        </div>

        {/* ── Destaque + lista ────────────────────────────────────────────── */}
        <div className="mt-10 grid gap-4 min-[1024px]:grid-cols-[minmax(0,1.16fr)_minmax(26rem,0.84fr)] min-[1024px]:gap-5">
          <CategoriaPrincipal categoria={principal} />

          {outras.length > 0 ? (
            <ul className="grid gap-4 min-[1024px]:grid-rows-3 min-[1024px]:gap-5">
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

/* ============================================================================
   A categoria em destaque

   Era um bloco preto virando vermelho profundo — a mesma peça que o hero
   tinha, e o mesmo problema: `direcao-visual.md` reserva vermelho para sinal e
   grafite para uma ou duas faixas por página, e esta é a terceira camada
   pesada da home. Pior, ela ficava LADO A LADO com três cartões brancos, então
   a fileira lia como duas linguagens diferentes na mesma grade.

   Agora é o mesmo cartão dos três vizinhos, num tamanho maior: branco, borda
   fina, foto grande à direita. O que a distingue é a escala e o botão cheio —
   não o fundo.

   Saiu junto a máscara radial que dissolvia a foto no fundo do painel: ela foi
   feita para recorte sobre claro e, com fotografia, comia a borda da peça.
   ============================================================================ */

function CategoriaPrincipal({ categoria }: { categoria: CategoriaHome }) {
  const foto = fotoCategoria(categoria);

  return (
    <Link
      href={`/categoria/${categoria.slug}`}
      className="group relative grid min-h-[30rem] placa overflow-hidden transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-graf-400 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-jb-500 min-[640px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] min-[1024px]:min-h-[24.5rem]"
    >
      <div className="relative z-10 flex min-w-0 flex-col justify-center p-7 min-[640px]:p-8 min-[1024px]:p-10">
        <span className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-jb-700">
          Categoria em destaque
        </span>
        <h3 className="mt-3 text-[clamp(1.9rem,2.9vw,3.3rem)] font-black leading-[0.96] tracking-[-0.05em] text-graf-950 [overflow-wrap:normal] hyphens-none">
          {categoria.name}
        </h3>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-graf-500">
          {detalheCategoria(categoria)}
        </p>
        <span className="mt-7 micro inline-flex min-h-12 w-fit items-center gap-4 rounded-lg bg-jb-500 py-2 pl-6 pr-2.5 text-white transition-[transform,background-color] duration-200 group-hover:-translate-y-0.5 group-hover:bg-jb-600">
          Explorar categoria
          <span className="flex size-9 items-center justify-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-1">
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </span>

        {/* Três atributos em fio fino. Antes eram três blocos de duas linhas
            numa fileira sem quebra: o terceiro saía pela borda do cartão e a
            palavra aparecia cortada ("tranquilidad"). */}
        <ul className="mt-8 hidden flex-wrap items-center gap-x-5 gap-y-2 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-graf-500 min-[1024px]:flex">
          <li>Mais segurança</li>
          <li aria-hidden className="h-3 w-px bg-graf-200" />
          <li>Mais eficiência</li>
          <li aria-hidden className="h-3 w-px bg-graf-200" />
          <li>Mais tranquilidade</li>
        </ul>
      </div>

      <div
        data-palco-imagem-produto
        className="relative min-h-72 overflow-hidden border-t border-graf-100 min-[640px]:min-h-full min-[640px]:border-l min-[640px]:border-t-0"
        style={{
          background:
            "linear-gradient(180deg, #ffffff 0%, #ffffff 58%, var(--color-graf-50) 100%)",
        }}
      >
        {foto ? (
          <Image
            data-imagem-produto
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 100vw, 40vw"
            className="object-contain p-[7%] transition-transform duration-700 ease-out-quint group-hover:scale-[1.04]"
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
      className="group grid h-full min-h-[8.4rem] grid-cols-[minmax(0,1fr)_9.5rem] placa overflow-hidden transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-graf-400 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 min-[640px]:grid-cols-[minmax(0,1fr)_14.5rem]"
    >
      <div className="flex min-w-0 flex-col justify-center p-5 min-[640px]:p-7">
        <div className="flex items-center gap-3">
          <span className="text-[0.6875rem] font-black uppercase tracking-[0.16em] text-jb-600">
            0{numero}
          </span>
          <span className="h-px w-6 bg-graf-200" aria-hidden />
        </div>
        <div className="mt-2 flex items-center gap-4">
          <h3 className="min-w-0 text-xl font-black leading-[1.1] tracking-[-0.038em] text-graf-950 transition-colors group-hover:text-jb-700 [overflow-wrap:normal] hyphens-none min-[640px]:text-[1.55rem]">
            {categoria.name}
          </h3>
          <span className="ml-auto flex size-10 shrink-0 items-center justify-center rounded-lg border border-hairline bg-white text-jb-600 transition-[transform,border-color] duration-300 group-hover:translate-x-1 group-hover:border-jb-200">
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
        <p className="mt-2 text-[0.8rem] leading-relaxed text-graf-500">
          {detalheCategoria(categoria)}
        </p>
      </div>

      <div data-palco-imagem-produto className="relative overflow-hidden bg-[#f6f3f4]">
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(50%_56%_at_50%_50%,transparent_42%,rgba(246,243,244,0.9)_84%,#f6f3f4_100%)]"
          aria-hidden
        />

        {foto ? (
          <Image
            data-imagem-produto
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="240px"
            className="object-contain transition-transform duration-500 group-hover:scale-[1.06]"
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
