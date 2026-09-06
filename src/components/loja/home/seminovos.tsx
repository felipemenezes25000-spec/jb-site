import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, ImageOff, ShieldCheck } from "lucide-react";

import { Etiqueta } from "@/components/ui/data";
import { LinkBotao } from "@/components/ui/button";
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
    <section className="bg-jb-500 py-16 text-white md:py-24 lg:py-28">
      <div className="container-jb max-w-[112rem]">
        <div className="mb-9 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-white/80">
              <span className="h-px w-8 bg-white" aria-hidden />
              Seminovo JB
            </p>
            <h2 className="mt-3 text-section text-white">Você sabe qual máquina está comprando.</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80">
              Cada unidade tem identidade própria. Ano, uso, checklist, condição e garantia aparecem quando estão registrados no cadastro real.
            </p>
          </div>

          <LinkBotao href="/seminovos" variante="claro" tamanho="lg" className="text-jb-700 hover:text-jb-900">
            Ver {plural(total, "seminovo", "seminovos")}
            <ArrowRight className="size-4" aria-hidden />
          </LinkBotao>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <CartaoPrincipal produto={principal} />

          {outros.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              {outros.map((produto) => (
                <li key={produto.slug} className="flex min-w-0">
                  <CartaoSecundario produto={produto} />
                </li>
              ))}
            </ul>
          ) : null}
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

  return fatos.slice(0, 5);
}

function CartaoPrincipal({ produto }: { produto: ProdutoSeminovo }) {
  const foto = fotoDeSeminovo(produto);
  const fatos = fatosDe(produto);
  const unidade = produto.units[0];
  const estado = disponibilidadeDe(produto);

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group grid min-h-[31rem] overflow-hidden rounded-[1.6rem] bg-white text-graf-950 shadow-[0_28px_80px_-38px_rgba(90,0,0,0.45)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]"
    >
      <div className="relative min-h-80 overflow-hidden bg-white lg:min-h-full">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 1024px) 92vw, 48vw"
            className="object-contain p-7 transition-transform duration-700 group-hover:scale-[1.04] sm:p-10"
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

      <div className="flex min-w-0 flex-col justify-center border-t border-jb-100 p-6 sm:p-8 lg:border-l lg:border-t-0 xl:p-9">
        {produto.brand ? <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-jb-700">{produto.brand.name}</p> : null}
        <h3 className="mt-2 text-[clamp(1.7rem,2.3vw,2.6rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-graf-950">{produto.name}</h3>
        {produto.model ? <p className="mt-2 text-sm text-graf-500">{produto.model}</p> : null}

        {fatos.length > 0 ? (
          <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-jb-100 sm:grid-cols-3">
            {fatos.map((fato) => (
              <div key={`${fato.rotulo}-${fato.valor}`} className="bg-white p-3.5">
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-jb-700">{fato.rotulo}</dt>
                <dd className="mt-1 text-sm font-extrabold text-graf-950">{fato.valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {unidade?.conditionNotes.trim() ? <p className="mt-5 line-3 text-sm leading-relaxed text-graf-600">{unidade.conditionNotes}</p> : null}

        <div className="mt-7 border-t border-jb-100 pt-6">
          <p className="text-2xl font-extrabold tracking-tight text-jb-700">
            {produto.allowDirectPurchase && produto.priceCents > 0 ? formatarPreco(produto.priceCents) : "Sob orçamento"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Etiqueta tom={estado.tom} ponto>{estado.texto}</Etiqueta>
            <span className="ml-auto inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-jb-700 transition-transform group-hover:translate-x-1">
              Ver esta unidade
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CartaoSecundario({ produto }: { produto: ProdutoSeminovo }) {
  const foto = fotoDeSeminovo(produto);
  const fatos = fatosDe(produto).slice(0, 3);

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group grid w-full min-w-0 grid-cols-[8rem_minmax(0,1fr)] overflow-hidden rounded-2xl bg-white text-graf-950 transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:grid-cols-1 xl:grid-cols-[9.5rem_minmax(0,1fr)]"
    >
      <div className="relative min-h-44 bg-white sm:min-h-52 xl:min-h-full">
        {foto ? (
          <Image src={foto.url} alt={foto.alt} fill sizes="(max-width: 640px) 36vw, (max-width: 1280px) 46vw, 15vw" className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.05]" />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col justify-center border-l border-jb-100 p-4 sm:border-l-0 sm:border-t xl:border-l xl:border-t-0 xl:p-5">
        <div className="flex items-center gap-2 text-jb-700">
          <ShieldCheck className="size-4" aria-hidden />
          <span className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em]">Seminovo JB</span>
        </div>
        <h3 className="mt-2 line-2 text-lg font-extrabold leading-snug text-graf-950">{produto.name}</h3>

        {fatos.length > 0 ? (
          <ul className="mt-4 space-y-2 text-xs text-graf-600">
            {fatos.map((fato) => (
              <li key={`${fato.rotulo}-${fato.valor}`} className="flex items-center gap-2">
                {fato.rotulo === "Uso" || fato.rotulo === "Ciclos" ? <Gauge className="size-3.5 shrink-0 text-jb-500" aria-hidden /> : <CheckCircle2 className="size-3.5 shrink-0 text-jb-500" aria-hidden />}
                <span className="font-semibold text-jb-700">{fato.rotulo}:</span>
                <span>{fato.valor}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-xs font-extrabold text-jb-700">Ver unidade <ArrowRight className="size-3.5" aria-hidden /></span>
      </div>
    </Link>
  );
}
