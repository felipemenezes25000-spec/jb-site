import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, ImageOff, ShieldCheck } from "lucide-react";

import { Etiqueta } from "@/components/ui/data";
import { LinkBotao } from "@/components/ui/button";
import { Secao } from "@/components/ui/secao";
import { disponibilidadeDe } from "@/components/loja/home/comum";
import { formatarPreco, plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";

/* ============================================================================
   Seminovo JB

   A seção trata seminovo como um programa próprio da JB, não como apenas mais
   uma categoria. A unidade principal recebe escala grande; ano, uso, checklist
   e garantia aparecem somente quando existem no cadastro real.
   ============================================================================ */

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
    <Secao fundo="grafite" espaco="lg" padraoDeFundo>
      <div className="mb-9 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.14em] text-jb-300">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            Seminovo JB
          </p>
          <h2 className="mt-3 text-section text-white">Você sabe qual máquina está comprando.</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-graf-300">
            Cada unidade tem identidade própria. Quando ano, uso, checklist, condição ou garantia foram registrados, essas informações aparecem antes da compra.
          </p>
        </div>

        <LinkBotao href="/seminovos" variante="contorno-claro" tamanho="lg">
          Ver {plural(total, "seminovo", "seminovos")}
          <ArrowRight className="size-4" aria-hidden />
        </LinkBotao>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)] xl:gap-5">
        <CartaoPrincipal produto={principal} />

        {outros.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 xl:gap-5">
            {outros.map((produto) => (
              <li key={produto.slug} className="flex min-w-0">
                <CartaoSecundario produto={produto} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Secao>
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
  if (unidade && unidade._count.checklist > 0) {
    fatos.push({ rotulo: "Revisão", valor: plural(unidade._count.checklist, "item", "itens") });
  }
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
      className="group grid min-h-[33rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] shadow-[0_32px_90px_-45px_rgba(0,0,0,0.9)] transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.075] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]"
    >
      <div className="relative min-h-80 overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.93)_42%,rgba(255,255,255,0.08)_74%,transparent_80%)] lg:min-h-full">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 1024px) 92vw, 48vw"
            className="object-contain p-7 transition-transform duration-700 group-hover:scale-[1.04] sm:p-10"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-white/25" aria-hidden>
            <ImageOff className="size-12" />
          </span>
        )}

        <div className="absolute left-5 top-5 flex flex-wrap gap-2">
          <Etiqueta tom="marca">Seminovo JB</Etiqueta>
          {foto?.unidade ? <Etiqueta tom="ok">Foto da unidade</Etiqueta> : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-col justify-center border-t border-white/10 p-6 sm:p-8 lg:border-l lg:border-t-0 xl:p-9">
        {produto.brand ? (
          <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-graf-400">
            {produto.brand.name}
          </p>
        ) : null}
        <h3 className="mt-2 text-[clamp(1.7rem,2.3vw,2.6rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-white">
          {produto.name}
        </h3>
        {produto.model ? <p className="mt-2 text-sm text-graf-400">{produto.model}</p> : null}

        {fatos.length > 0 ? (
          <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 sm:grid-cols-3">
            {fatos.map((fato) => (
              <div key={`${fato.rotulo}-${fato.valor}`} className="bg-graf-950/55 p-3.5">
                <dt className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-graf-500">{fato.rotulo}</dt>
                <dd className="mt-1 text-sm font-extrabold text-white">{fato.valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {unidade?.conditionNotes.trim() ? (
          <p className="mt-5 line-3 text-sm leading-relaxed text-graf-300">{unidade.conditionNotes}</p>
        ) : null}

        <div className="mt-7 border-t border-white/10 pt-6">
          <p className="text-2xl font-extrabold tracking-tight text-white">
            {produto.allowDirectPurchase && produto.priceCents > 0
              ? formatarPreco(produto.priceCents)
              : "Sob orçamento"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Etiqueta tom={estado.tom} ponto>
              {estado.texto}
            </Etiqueta>
            <span className="ml-auto inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-jb-300 transition-transform group-hover:translate-x-1">
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
      className="group grid w-full min-w-0 grid-cols-[8rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] transition-[transform,border-color,background-color] duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:grid-cols-1 xl:grid-cols-[9.5rem_minmax(0,1fr)]"
    >
      <div className="relative min-h-44 bg-white/95 sm:min-h-52 xl:min-h-full">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 36vw, (max-width: 1280px) 46vw, 15vw"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col justify-center border-l border-white/10 p-4 sm:border-l-0 sm:border-t xl:border-l xl:border-t-0 xl:p-5">
        <div className="flex items-center gap-2 text-jb-300">
          <ShieldCheck className="size-4" aria-hidden />
          <span className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em]">Seminovo JB</span>
        </div>
        <h3 className="mt-2 line-2 text-lg font-extrabold leading-snug text-white">{produto.name}</h3>

        {fatos.length > 0 ? (
          <ul className="mt-4 space-y-2 text-xs text-graf-300">
            {fatos.map((fato) => (
              <li key={`${fato.rotulo}-${fato.valor}`} className="flex items-center gap-2">
                {fato.rotulo === "Uso" || fato.rotulo === "Ciclos" ? (
                  <Gauge className="size-3.5 shrink-0 text-graf-500" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-3.5 shrink-0 text-graf-500" aria-hidden />
                )}
                <span className="font-semibold text-graf-400">{fato.rotulo}:</span>
                <span>{fato.valor}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-xs font-extrabold text-jb-300">
          Ver unidade
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
