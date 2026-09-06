import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileText,
  Headphones,
  History,
  Phone,
  ShieldQuestion,
  Sparkles,
  Wrench,
} from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import {
  BlocoPreco,
  CONDICAO_HOME,
  fotoDe,
  type Parcelamento,
  type ProdutoHome,
} from "@/components/loja/home/comum";
import { telHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Hero da página principal

   A primeira dobra precisa parecer uma empresa de equipamento de alto ticket,
   não uma listagem administrativa. O fundo grafite dá peso à marca; o vermelho
   fica restrito a ação e ênfase; e o produto real do catálogo continua sendo a
   única imagem do hero — nada de consultório de banco ou número inventado.

   A narrativa comercial agora abre pelo resultado para a clínica e fecha com
   a continuidade que diferencia a JB: venda, instalação, assistência e
   prontuário do equipamento. O produto ocupa uma "mesa de luz" própria para
   funcionar mesmo quando a foto cadastrada tem fundo branco.
   ============================================================================ */

export function Hero({
  configuracoes: s,
  produto,
  parcelamento,
}: {
  configuracoes: SettingsMap;
  produto: ProdutoHome | null;
  parcelamento: Parcelamento;
}) {
  const telefone = s.telefone.trim();

  return (
    <section className="on-dark relative isolate overflow-hidden border-b border-white/10 bg-graf-950">
      {/* Luzes grandes e suaves: profundidade sem transformar a home em landing
          page de SaaS. São puramente decorativas e não carregam imagem. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-24 top-16 -z-10 size-80 rounded-full bg-jb-500/12 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 -z-10 size-[34rem] rounded-full bg-white/7 blur-3xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(115deg,transparent_0%,transparent_44%,rgba(255,255,255,0.035)_44%,rgba(255,255,255,0.035)_44.2%,transparent_44.2%)]"
      />

      <div
        className={cn(
          "container-jb grid gap-12 py-14 sm:py-16 lg:min-h-[42rem] lg:items-center lg:gap-16 lg:py-16 xl:gap-20",
          produto && "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]",
        )}
      >
        <div className={cn(!produto && "max-w-4xl py-8")}>
          <div className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.16em] text-jb-400">
            <span className="h-px w-8 bg-jb-500" aria-hidden />
            Tecnologia, assistência e pós-venda
          </div>

          <h1 className="mt-6 max-w-4xl text-hero text-white">
            Equipamentos que elevam o padrão da{" "}
            <span className="text-jb-400">sua clínica.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-graf-300 sm:text-xl">
            A JB vende, instala, mantém e acompanha o equipamento depois da compra — com
            assistência técnica e histórico reunido na Área da Clínica.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/loja" tamanho="lg" className="shadow-[0_14px_32px_-14px_rgba(224,20,27,0.75)]">
              Ver equipamentos
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </LinkBotao>
            <LinkBotao
              href="/assistencia-tecnica/solicitar"
              variante="contorno-claro"
              tamanho="lg"
            >
              <Wrench className="size-4 shrink-0" aria-hidden />
              Falar com a assistência
            </LinkBotao>
          </div>

          <ul className="mt-9 grid max-w-2xl gap-3 text-sm text-graf-300 sm:grid-cols-3">
            <li className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/7 text-white">
                <Sparkles className="size-4" aria-hidden />
              </span>
              Venda consultiva
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/7 text-white">
                <Wrench className="size-4" aria-hidden />
              </span>
              Assistência JB
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/7 text-white">
                <ClipboardList className="size-4" aria-hidden />
              </span>
              Prontuário técnico
            </li>
          </ul>

          {telefone ? (
            <p className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-graf-400">
              <Phone className="size-4 shrink-0" aria-hidden />
              <span>Prefere falar agora?</span>
              <a
                href={telHref(telefone)}
                className="inline-flex min-h-11 items-center font-bold text-white underline-offset-4 hover:text-jb-300 hover:underline"
              >
                {telefone}
              </a>
              {s.horario.trim() ? (
                <span className="text-graf-400 sm:before:mr-1.5 sm:before:content-['·']">
                  {s.horario}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        {produto ? (
          <div className="relative lg:py-4">
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-white/5 blur-2xl"
            />
            <VitrinePrincipal produto={produto} parcelamento={parcelamento} />
            <DepoisDaCompra produto={produto} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Produto real, tratado como peça de campanha. A fotografia ganha uma mesa de
 * luz clara e o bloco comercial fica no mesmo cartão, sem mini-card flutuando
 * em cima de mini-card.
 */
function VitrinePrincipal({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const foto = fotoDe(produto);
  const condicao = CONDICAO_HOME[produto.condition];

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group block overflow-hidden rounded-[1.75rem] border border-white/15 bg-white shadow-[0_34px_90px_-34px_rgba(0,0,0,0.85)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
    >
      <div className="relative aspect-[16/11] overflow-hidden bg-gradient-to-br from-white via-white to-graf-100">
        <span
          aria-hidden
          className="absolute -right-20 -top-24 size-72 rounded-full bg-jb-100/65 blur-3xl"
        />
        <span
          aria-hidden
          className="absolute -bottom-24 -left-16 size-64 rounded-full bg-graf-200/70 blur-3xl"
        />

        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            preload
            sizes="(max-width: 1024px) 92vw, 52vw"
            className="object-contain p-7 drop-shadow-[0_28px_24px_rgba(20,24,28,0.16)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.045] sm:p-10 lg:p-12"
          />
        ) : null}

        <span className="absolute left-5 top-5 sm:left-6 sm:top-6">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </span>
      </div>

      <div className="grid gap-5 border-t border-graf-200 bg-white px-6 py-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:px-7 sm:py-7">
        <div className="min-w-0">
          {produto.brand ? (
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-graf-500">
              {produto.brand.name}
            </p>
          ) : null}
          <p className="mt-1.5 line-2 text-title text-graf-950">{produto.name}</p>
          {produto.model ? <p className="mt-1 text-sm text-graf-500">{produto.model}</p> : null}
          <BlocoPreco produto={produto} parcelamento={parcelamento} className="mt-4" />
        </div>

        <span className="inline-flex min-h-11 items-center gap-2 font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-1">
          Ver equipamento
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

type ItemPos = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalhe: string;
};

/**
 * Continuidade do produto em uma placa de vidro escura. Continua sem ícone de
 * confirmação: os itens descrevem o que a plataforma fará, não algo que já foi
 * executado nesta unidade.
 */
function DepoisDaCompra({ produto }: { produto: ProdutoHome }) {
  const meses = produto.warrantyMonths ?? 0;

  const itens: ItemPos[] = [
    {
      icone: ClipboardList,
      titulo: "Prontuário Técnico JB",
      detalhe: "Número de série e histórico na Área da Clínica.",
    },
    meses > 0
      ? {
          icone: ShieldQuestion,
          titulo: `Garantia de ${meses} ${meses === 1 ? "mês" : "meses"}`,
          detalhe: "Prazo cadastrado para este equipamento.",
        }
      : {
          icone: FileText,
          titulo: "Documentos reunidos",
          detalhe: "Arquivos da compra no mesmo lugar.",
        },
    {
      icone: History,
      titulo: "Histórico técnico",
      detalhe: "Chamados, orçamentos e reparos registrados.",
    },
    {
      icone: CalendarClock,
      titulo: "Preventiva acompanhada",
      detalhe: "Próxima revisão vinculada ao equipamento.",
    },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-5 backdrop-blur-sm sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-graf-400">
          Depois da compra
        </p>
        <span className="hidden items-center gap-1.5 text-xs font-semibold text-graf-400 sm:inline-flex">
          <Headphones className="size-3.5" aria-hidden />
          Pós-venda integrado
        </span>
      </div>

      <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {itens.map((item) => {
          const Icone = item.icone;
          return (
            <li key={item.titulo} className="flex min-w-0 gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/8 text-jb-300"
              >
                <Icone className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug text-white">{item.titulo}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-graf-400">{item.detalhe}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
