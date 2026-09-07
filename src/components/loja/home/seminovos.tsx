import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ImageOff, ShieldCheck } from "lucide-react";

import { Etiqueta } from "@/components/ui/data";
import { disponibilidadeDe } from "@/components/loja/home/comum";
import { formatarPreco, plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const DISPONIVEL = { status: "active", condition: "seminovo" } as const;

async function carregar() {
  const [produtos, total] = await Promise.all([
    prisma.product.findMany({
      where: DISPONIVEL,
      orderBy: [{ featured: "desc" }, { stock: "desc" }, { publishedAt: "desc" }],
      take: 3,
      select: {
        slug: true,
        name: true,
        model: true,
        priceCents: true,
        compareAtCents: true,
        allowDirectPurchase: true,
        trackInventory: true,
        stock: true,
        unique: true,
        warrantyMonths: true,
        brand: { select: { name: true } },
        media: {
          orderBy: { order: "asc" },
          take: 1,
          select: { alt: true, media: { select: { url: true, alt: true } } },
        },
        units: {
          where: { status: "disponivel" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            manufactureYear: true,
            usageHours: true,
            usageCycles: true,
            conditionNotes: true,
            warrantyMonths: true,
            media: {
              orderBy: { order: "asc" },
              take: 1,
              select: { media: { select: { url: true, alt: true } } },
            },
            _count: { select: { checklist: true } },
          },
        },
      },
    }),
    prisma.product.count({ where: DISPONIVEL }),
  ]);

  return { produtos, total };
}

type ProdutoSeminovo = Awaited<ReturnType<typeof carregar>>["produtos"][number];

export async function SecaoSeminovos() {
  const { produtos, total } = await carregar();
  if (produtos.length === 0) return null;

  const [principal, ...outros] = produtos;

  return (
    <section className="border-y border-graf-200 bg-white py-16 md:py-20 lg:py-24">
      <div className="container-jb max-w-[112rem]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-700">
              <span className="h-px w-8 bg-jb-500" aria-hidden />
              Seminovos JB
            </p>
            <h2 className="mt-3 text-section text-graf-950">Seminovo sem caixa-preta.</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-graf-500">
              Quando os dados estão cadastrados, você vê ano, uso, revisão, condição e garantia da própria unidade antes de decidir.
            </p>
          </div>

          <Link
            href="/seminovos"
            className="group inline-flex min-h-11 items-center gap-2 self-start text-sm font-extrabold text-jb-700 hover:text-jb-900 lg:self-auto"
          >
            Ver {plural(total, "seminovo", "seminovos")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <div className="mt-9 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
          <CartaoPrincipal produto={principal} />

          {outros.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {outros.map((produto) => (
                <li key={produto.slug} className="flex min-w-0">
                  <CartaoSecundario produto={produto} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="hidden rounded-[1.5rem] bg-jb-50 xl:block" aria-hidden />
          )}
        </div>
      </div>
    </section>
  );
}

function fotoDeSeminovo(produto: ProdutoSeminovo) {
  const unidade = produto.units[0];
  const fotoUnidade = unidade?.media[0]?.media;
  const fotoCatalogo = produto.media[0];

  if (fotoUnidade) return { url: fotoUnidade.url, alt: fotoUnidade.alt || produto.name, unidade: true };
  if (fotoCatalogo) {
    return {
      url: fotoCatalogo.media.url,
      alt: fotoCatalogo.alt || fotoCatalogo.media.alt || produto.name,
      unidade: false,
    };
  }
  return null;
}

function fatosDe(produto: ProdutoSeminovo) {
  const unidade = produto.units[0];
  const garantia = unidade?.warrantyMonths ?? produto.warrantyMonths;
  const fatos: { rotulo: string; valor: string }[] = [];

  if (unidade?.manufactureYear) fatos.push({ rotulo: "Ano", valor: String(unidade.manufactureYear) });
  if (unidade?.usageHours) fatos.push({ rotulo: "Uso", valor: `${unidade.usageHours} h` });
  if (unidade?.usageCycles) fatos.push({ rotulo: "Ciclos", valor: String(unidade.usageCycles) });
  if (unidade && unidade._count.checklist > 0) fatos.push({ rotulo: "Revisão", valor: plural(unidade._count.checklist, "item", "itens") });
  if (garantia) fatos.push({ rotulo: "Garantia", valor: plural(garantia, "mês", "meses") });

  return fatos.slice(0, 4);
}

function CartaoPrincipal({ produto }: { produto: ProdutoSeminovo }) {
  const foto = fotoDeSeminovo(produto);
  const fatos = fatosDe(produto);
  const unidade = produto.units[0];
  const estado = disponibilidadeDe(produto);

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group grid min-h-[29rem] overflow-hidden rounded-[1.6rem] bg-[#111214] text-white shadow-[0_30px_80px_-46px_rgba(85,0,0,0.52)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]"
    >
      <div className="relative min-h-72 overflow-hidden bg-[linear-gradient(145deg,#fff_0%,#f7f7f7_100%)] lg:min-h-full">
        <div className="absolute -right-16 -top-20 size-72 rounded-full border-[3rem] border-jb-100" aria-hidden />
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 1024px) 92vw, 48vw"
            className="object-contain p-7 transition-transform duration-700 group-hover:scale-[1.045] sm:p-9"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-jb-200" aria-hidden>
            <ImageOff className="size-12" />
          </span>
        )}

        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          <Etiqueta tom="marca">Seminovo JB</Etiqueta>
          {foto?.unidade ? <Etiqueta tom="ok">Foto da unidade</Etiqueta> : null}
        </div>
      </div>

      <div className="relative flex min-w-0 flex-col justify-center p-6 sm:p-8 lg:p-9">
        <div className="absolute right-0 top-0 h-1 w-28 bg-jb-500" aria-hidden />
        {produto.brand ? <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-jb-300">{produto.brand.name}</p> : null}
        <h3 className="mt-2 text-[clamp(1.75rem,2.4vw,2.7rem)] font-black leading-[1.04] tracking-[-0.04em] text-white">{produto.name}</h3>
        {produto.model ? <p className="mt-2 text-sm text-white/55">{produto.model}</p> : null}

        {fatos.length > 0 ? (
          <dl className="mt-7 grid grid-cols-2 gap-2">
            {fatos.map((fato) => (
              <div key={`${fato.rotulo}-${fato.valor}`} className="rounded-xl border border-white/10 bg-white/[0.045] p-3.5">
                <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white/45">{fato.rotulo}</dt>
                <dd className="mt-1 text-sm font-extrabold text-white">{fato.valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {unidade?.conditionNotes.trim() ? <p className="mt-5 line-2 text-sm leading-relaxed text-white/60">{unidade.conditionNotes}</p> : null}

        <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-6">
          <div>
            <p className="text-2xl font-black tracking-tight text-white">
              {produto.allowDirectPurchase && produto.priceCents > 0 ? formatarPreco(produto.priceCents) : "Sob orçamento"}
            </p>
            <div className="mt-2"><Etiqueta tom={estado.tom} ponto>{estado.texto}</Etiqueta></div>
          </div>
          <span className="flex size-11 items-center justify-center rounded-full bg-jb-500 text-white transition-transform group-hover:translate-x-1" aria-hidden>
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function CartaoSecundario({ produto }: { produto: ProdutoSeminovo }) {
  const foto = fotoDeSeminovo(produto);
  const fatos = fatosDe(produto).slice(0, 2);

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group grid w-full min-w-0 grid-cols-[8.5rem_minmax(0,1fr)] overflow-hidden rounded-[1.4rem] border border-graf-200 bg-white transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-jb-200 hover:shadow-[0_18px_48px_-38px_rgba(90,0,0,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 sm:grid-cols-1 xl:grid-cols-[10rem_minmax(0,1fr)]"
    >
      <div className="relative min-h-44 bg-[#fafafa] sm:min-h-52 xl:min-h-full">
        {foto ? (
          <Image src={foto.url} alt={foto.alt} fill sizes="(max-width: 640px) 36vw, (max-width: 1280px) 46vw, 15vw" className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.05]" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-jb-200" aria-hidden><ImageOff className="size-9" /></span>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center border-l border-graf-100 p-4 sm:border-l-0 sm:border-t xl:border-l xl:border-t-0 xl:p-5">
        <div className="flex items-center gap-2 text-jb-700">
          <ShieldCheck className="size-4" aria-hidden />
          <span className="text-[0.64rem] font-extrabold uppercase tracking-[0.12em]">Seminovo JB</span>
        </div>
        <h3 className="mt-2 line-2 text-lg font-extrabold leading-snug text-graf-950">{produto.name}</h3>

        {fatos.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[0.75rem] text-graf-500">
            {fatos.map((fato) => (
              <li key={`${fato.rotulo}-${fato.valor}`} className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 shrink-0 text-jb-500" aria-hidden />
                <span><strong className="text-graf-700">{fato.rotulo}:</strong> {fato.valor}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <span className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-xs font-extrabold text-jb-700">
          Ver unidade <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
