import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FileText,
  History,
  Phone,
  ShieldQuestion,
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

   A promessa é a continuidade: a JB vende, instala, mantém e registra. Por
   isso o hero não termina no preço — a placa do equipamento é seguida da
   faixa "Depois da compra", que diz o que acontece com aquela máquina depois
   que ela chega na clínica.

   Texto à esquerda, catálogo de verdade à direita: a foto do equipamento em
   destaque, com o nome e o preço reais. Não há foto de estrutura nem de
   equipe no acervo da JB — então o hero se apoia no que existe de fato, que
   é o produto, e dá a ele a maior área da tela.

   A placa principal é grande de propósito: equipamento odontológico é objeto
   físico de ticket alto, e miniatura em fundo enorme é o que faz uma loja
   parecer catálogo improvisado.

   Sem produto com foto cadastrada, a coluna da direita simplesmente não
   aparece e o texto ocupa a faixa inteira. Nada de imagem de banco.

   Uma regra vale para a faixa "Depois da compra" inteira, e está em
   docs/evolucao-jb/direcao-visual.md, seção 3: aqui não entra ícone de
   confirmação. Estes itens são o processo que a JB oferece, não etapas já
   cumpridas para esta unidade. Um "check" no hero afirmaria instalação ou
   inspeção que ninguém fez.
   ============================================================================ */

export function Hero({
  configuracoes: s,
  produto,
  parcelamento,
}: {
  configuracoes: SettingsMap;
  /** O equipamento em destaque. Só chega aqui produto com foto cadastrada. */
  produto: ProdutoHome | null;
  parcelamento: Parcelamento;
}) {
  const telefone = s.telefone.trim();

  return (
    <section className="relative isolate overflow-hidden border-b border-graf-200 bg-white">
      <span
        aria-hidden
        className="field-orbit pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(70%_60%_at_78%_8%,#000,transparent)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-graf-50 to-transparent"
      />

      <div
        className={cn(
          "container-jb grid gap-12 py-14 md:py-18 lg:gap-14 lg:py-22 xl:gap-20",
          produto && "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center",
        )}
      >
        {/* --------------------------------------------------------- texto */}
        <div className={cn(!produto && "max-w-3xl")}>
          <p className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-graf-200 bg-white px-4 py-2 text-[0.8125rem] font-semibold text-graf-600 shadow-xs">
            <span className="size-1.5 shrink-0 rounded-full bg-jb-500" aria-hidden />
            <span>Equipamentos + assistência + prontuário técnico</span>
          </p>

          <h1 className="mt-6 text-hero text-balance text-graf-950">
            Comprar é só o começo
            <span className="text-jb-500">.</span>
          </h1>

          {/* Duas frases, e a segunda some no celular: a promessa cabe na
              primeira, e a lista de itens só ajuda quem tem tela para lê-la
              sem empurrar os botões para fora da dobra. */}
          <p className="texto-guia mt-6 max-w-xl text-graf-600">
            A JB vende, instala, mantém e registra o histórico dos equipamentos da sua
            clínica.{" "}
            <span className="hidden sm:inline">
              Compra, garantia, chamados, documentos e manutenções no mesmo lugar.
            </span>
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/loja" tamanho="lg">
              Ver equipamentos
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" tamanho="lg">
              <Wrench className="size-4 shrink-0" aria-hidden />
              Meu equipamento parou
            </LinkBotao>
          </div>

          {/* Terceiro acesso, de propósito menos proeminente: quem já é
              cliente procura a porta, não precisa ser atraído até ela. */}
          <p className="mt-5 text-sm text-graf-600">
            <Link
              href="/minha-jb"
              className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-graf-700 underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              Já sou cliente
              <ArrowRight className="size-3.5 shrink-0" aria-hidden />
              Área da Clínica
            </Link>
          </p>

          {telefone ? (
            <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-graf-600">
              <Phone className="size-4 shrink-0 text-graf-400" aria-hidden />
              <span>Prefere falar agora?</span>
              <a
                href={telHref(telefone)}
                className="inline-flex min-h-11 items-center font-bold text-jb-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                {telefone}
              </a>
              {/* O ponto separador é do desktop, onde a linha inteira cabe.
                  No celular a frase quebra e a linha começava com "·", que
                  lido em voz alta e olhado de perto vira um marcador solto. */}
              {s.horario.trim() ? (
                <span className="text-graf-500 sm:before:mr-1.5 sm:before:content-['·']">
                  {s.horario}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        {/* ------------------------------------------------------- vitrine */}
        {produto ? (
          <div className="relative">
            <VitrinePrincipal produto={produto} parcelamento={parcelamento} />
            <DepoisDaCompra produto={produto} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Placa grande: a foto ocupa a maior área do hero, sem moldura disputando. */
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
      className="group block overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-raised transition-[border-color,box-shadow] duration-200 hover:border-graf-300 hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <div className="relative aspect-16/11 overflow-hidden bg-gradient-to-b from-white to-graf-50">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            /* `preload`, e não o antigo `priority`: a propriedade foi
               descontinuada no Next 16 em favor desta, que diz exatamente o
               que faz — insere o <link rel="preload"> no <head>. Ver
               node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md,
               seções "preload" e "priority". Esta é a única imagem da home
               acima da dobra e é o elemento de LCP em todos os viewports, que
               é a condição para usar preload em vez de loading="eager". */
            preload
            sizes="(max-width: 1024px) 92vw, 52vw"
            className="object-contain p-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] sm:p-7"
          />
        ) : null}
        <span className="absolute left-5 top-5">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-graf-200 px-6 py-6 sm:px-7">
        <div className="min-w-0">
          {produto.brand ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-graf-500">
              {produto.brand.name}
            </p>
          ) : null}
          <p className="mt-1 line-2 text-title text-graf-950">{produto.name}</p>
          <BlocoPreco produto={produto} parcelamento={parcelamento} className="mt-4" />
        </div>

        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
          Ver equipamento
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------- depois da compra */

type ItemPos = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  detalhe: string;
};

/**
 * O que acontece com este equipamento depois que ele chega na clínica.
 *
 * Verbo no futuro em todos os itens, e nenhum ícone de confirmação: nada
 * aqui aconteceu ainda. A garantia é a única informação que varia por
 * produto, e ela só aparece quando `warrantyMonths` está cadastrado — sem
 * cadastro, o item cede a vez para os documentos, que existem para toda
 * compra. Prometer "12 meses" por padrão seria inventar cobertura.
 */
function DepoisDaCompra({ produto }: { produto: ProdutoHome }) {
  const meses = produto.warrantyMonths ?? 0;

  const itens: ItemPos[] = [
    {
      icone: ClipboardList,
      titulo: "Prontuário Técnico JB",
      detalhe: "O equipamento entra na Área da Clínica com número de série e histórico.",
    },
    meses > 0
      ? {
          icone: ShieldQuestion,
          titulo: `Garantia de ${meses} ${meses === 1 ? "mês" : "meses"}`,
          detalhe: "Prazo cadastrado para este equipamento, contado a partir da compra.",
        }
      : {
          icone: FileText,
          titulo: "Documentos reunidos",
          detalhe: "Nota, manual e certificados ficam disponíveis para download.",
        },
    {
      icone: History,
      titulo: "Histórico técnico",
      detalhe: "Cada chamado, orçamento e reparo fica registrado na ficha.",
    },
    {
      icone: CalendarClock,
      titulo: "Preventiva acompanhada",
      detalhe: "A próxima revisão é definida no cadastro, conforme o equipamento.",
    },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-graf-200 bg-surface-muted px-5 py-5 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-graf-500">
        Depois da compra
      </p>

      <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {itens.map((item) => {
          const Icone = item.icone;
          return (
            <li key={item.titulo} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-graf-200 bg-white text-graf-600"
              >
                <Icone className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug text-graf-950">{item.titulo}</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-graf-500">
                  {item.detalhe}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
