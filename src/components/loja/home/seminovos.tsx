import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ImageOff } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, TituloSecao } from "@/components/ui/data";
import { GradeConteudoApoio } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import {
  BlocoPreco,
  disponibilidadeDe,
  lerParcelamento,
  type Parcelamento,
} from "@/components/loja/home/comum";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Seminovos revisados

   Seminovo é a parte do catálogo em que o cliente mais precisa de prova, e é
   também onde o dado existe: cada unidade física tem ano, uso, checklist de
   revisão, fotos próprias e as condições escritas.

   Por isso nada aqui é texto de vitrine: os fatos que aparecem no cartão são
   os campos preenchidos daquela unidade, e o painel lateral só promete o que
   as unidades exibidas realmente têm registrado. Campo vazio some — não vira
   travessão repetido.
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
  const [{ produtos, total }, s] = await Promise.all([carregar(), getSettings()]);
  if (produtos.length === 0) return null;

  const parcelamento = lerParcelamento(s);
  const unidades = produtos.flatMap((produto) => produto.units);

  /* O painel lateral só afirma o que estas unidades de fato trazem. */
  const registrado: string[] = [];
  if (unidades.some((u) => u.media.length > 0)) {
    registrado.push("Fotos da unidade que está à venda, não do catálogo do fabricante");
  }
  if (unidades.some((u) => u._count.checklist > 0)) {
    registrado.push("Checklist de revisão, item a item, com o resultado de cada verificação");
  }
  if (unidades.some((u) => u.manufactureYear || u.usageHours || u.usageCycles)) {
    registrado.push("Ano de fabricação e o uso acumulado do equipamento");
  }
  if (unidades.some((u) => u.conditionNotes.trim())) {
    registrado.push("As condições descritas por escrito, inclusive as marcas de uso");
  }
  if (unidades.some((u) => u.warrantyMonths) || produtos.some((p) => p.warrantyMonths)) {
    registrado.push("O prazo de garantia registrado para aquela unidade");
  }

  return (
    <Secao fundo="branco" espaco="lg">
      <TituloSecao
        sobretitulo="Seminovo JB"
        titulo="Seminovo não precisa ser uma aposta"
        descricao="Cada unidade é uma máquina específica, com histórico próprio. O que a JB apurou sobre ela fica registrado e aparece antes da compra."
        acao={
          <LinkBotao href="/seminovos" variante="secundario">
            Ver {plural(total, "seminovo", "seminovos")}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </LinkBotao>
        }
        className="mb-10"
      />

      {registrado.length > 0 ? (
        <GradeConteudoApoio
          conteudo={<ListaSeminovos produtos={produtos} parcelamento={parcelamento} />}
          apoio={
            <div className="rounded-2xl border border-graf-200 bg-surface-muted p-6 lg:p-7">
              <h3 className="text-title text-graf-950">O que fica registrado</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-graf-600">
                Antes de entrar no catálogo, a unidade passa pela equipe técnica. O que foi
                apurado vai para a página dela.
              </p>
              <ul className="mt-6 space-y-3.5 border-t border-graf-200 pt-6">
                {registrado.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-graf-600"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-jb-500" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          }
        />
      ) : (
        /* Sem nada registrado nas unidades, o painel lateral não teria o que
           afirmar — e a lista ocupa a faixa inteira em vez de deixar um vão. */
        <ListaSeminovos produtos={produtos} parcelamento={parcelamento} />
      )}
    </Secao>
  );
}

function ListaSeminovos({
  produtos,
  parcelamento,
}: {
  produtos: ProdutoSeminovo[];
  parcelamento: Parcelamento;
}) {
  return (
    <ul className="grid gap-5">
      {produtos.map((produto) => (
        <li key={produto.slug}>
          <CartaoSeminovo produto={produto} parcelamento={parcelamento} />
        </li>
      ))}
    </ul>
  );
}

function CartaoSeminovo({
  produto,
  parcelamento,
}: {
  produto: ProdutoSeminovo;
  parcelamento: Parcelamento;
}) {
  const unidade = produto.units[0];
  const fotoUnidade = unidade?.media[0]?.media;
  const fotoCatalogo = produto.media[0];
  const foto = fotoUnidade
    ? { url: fotoUnidade.url, alt: fotoUnidade.alt || produto.name, daUnidade: true }
    : fotoCatalogo
      ? {
          url: fotoCatalogo.media.url,
          alt: fotoCatalogo.alt || fotoCatalogo.media.alt || produto.name,
          daUnidade: false,
        }
      : null;

  const estado = disponibilidadeDe(produto);
  const garantia = unidade?.warrantyMonths ?? produto.warrantyMonths;

  const fatos: { rotulo: string; valor: string }[] = [];
  if (unidade?.manufactureYear) {
    fatos.push({ rotulo: "Ano de fabricação", valor: String(unidade.manufactureYear) });
  }
  if (unidade?.usageHours) {
    fatos.push({ rotulo: "Horas de uso", valor: `${unidade.usageHours} h` });
  }
  if (unidade?.usageCycles) {
    fatos.push({ rotulo: "Ciclos registrados", valor: String(unidade.usageCycles) });
  }
  if (unidade && unidade._count.checklist > 0) {
    fatos.push({
      rotulo: "Revisão",
      valor: plural(unidade._count.checklist, "item verificado", "itens verificados"),
    });
  }
  if (garantia) {
    fatos.push({ rotulo: "Garantia", valor: plural(garantia, "mês", "meses") });
  }

  return (
    <Link
      href={`/loja/${produto.slug}`}
      /* A coluna da foto vale 19rem porque a unidade física é o argumento da
         faixa: quem compra seminovo compra AQUELA máquina, e uma miniatura de
         208px com 16px de recuo de cada lado deixava o equipamento do tamanho
         de um ícone. Sem sombra em repouso — a borda basta, e a sombra fica
         para o hover. */
      className="group grid gap-5 rounded-2xl border border-graf-200 bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-jb-200 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500 sm:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] sm:gap-7 sm:p-5"
    >
      <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-gradient-to-b from-graf-50 to-white sm:aspect-square">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 92vw, 304px"
            className="object-contain p-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-graf-300"
          >
            <ImageOff className="size-8" />
          </span>
        )}
        {foto?.daUnidade ? (
          <span className="absolute inset-x-0 bottom-0 bg-graf-950/75 py-2 text-center text-xs font-semibold uppercase tracking-wider text-white">
            Foto desta unidade
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tom="marca">Seminovo JB</Etiqueta>
          <Etiqueta tom={estado.tom} ponto>
            {estado.texto}
          </Etiqueta>
        </div>

        {produto.brand ? (
          <p className="mt-3.5 text-xs font-semibold uppercase tracking-wider text-graf-500">
            {produto.brand.name}
          </p>
        ) : null}

        <h3
          className={cn(
            "line-2 text-lg font-bold leading-snug text-graf-950 group-hover:text-jb-700",
            produto.brand ? "mt-1" : "mt-3.5",
          )}
        >
          {produto.name}
        </h3>

        {produto.model ? (
          <p className="mt-1 truncate text-sm text-graf-500">{produto.model}</p>
        ) : null}

        {fatos.length > 0 ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-graf-100 pt-4">
            {fatos.map((fato) => (
              <div key={fato.rotulo} className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                  {fato.rotulo}
                </dt>
                <dd className="tabular mt-0.5 text-sm font-bold text-graf-900">{fato.valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {unidade?.conditionNotes.trim() ? (
          <p className="mt-4 line-2 text-sm leading-relaxed text-graf-600">
            {unidade.conditionNotes}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
          <BlocoPreco produto={produto} parcelamento={parcelamento} />
          <span className="inline-flex items-center gap-1.5 pb-1 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
            Ver esta unidade
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
