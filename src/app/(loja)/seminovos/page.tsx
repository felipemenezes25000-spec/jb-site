import type { Metadata } from "next";
import {
  CalendarClock,
  Camera,
  ClipboardCheck,
  Gauge,
  NotebookPen,
  PackageCheck,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

import {
  Vitrine,
  atalhosDeCondicao,
  type ParametrosVitrine,
} from "@/components/loja/vitrine";
import { LinkBotao } from "@/components/ui/button";
import { TituloSecao } from "@/components/ui/data";
import { Grade, colunasParaTotal } from "@/components/ui/grade";
import { Secao } from "@/components/ui/secao";
import { PUBLICADO } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 *
 * `instant = false` desliga a validação de navegação instantânea para este
 * segmento. É a saída documentada para migrar rota a rota
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Following validation"): a casca da loja já foi migrada e prerenderiza, e
 * cada página vai deixando de precisar disto conforme a leitura dela ganha
 * `use cache` ou um `<Suspense>`.
 *
 * A lista do que ainda depende desta linha está em
 * docs/evolucao-jb/cobertura.md, fase 5. Ela é pendência declarada, não
 * conclusão.
 */
export const instant = false;

const CAMINHO = "/seminovos";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Equipamentos", href: "/loja" },
  { rotulo: "Seminovos revisados pela JB" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Seminovos revisados pela JB",
  descricao:
    "Cada anúncio é uma unidade específica: passa pela bancada da JB antes de entrar no catálogo e é publicada com o que a equipe verificou.",
  caminho: CAMINHO,
});

type Fato = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto: string;
};

/**
 * O que a JB de fato registra nas unidades seminovas que estão publicadas.
 *
 * Nenhuma linha desta faixa é escrita à mão: cada uma só entra se existir ao
 * menos uma unidade no catálogo com aquele campo preenchido. Sem seminovo
 * cadastrado, a lista volta vazia e a faixa inteira desaparece — é melhor não
 * falar de revisão nenhuma do que prometer um cuidado que não está anotado
 * em lugar algum.
 */
async function fatosDaRevisao(): Promise<Fato[]> {
  try {
    const unidades = await prisma.inventoryUnit.findMany({
      where: { product: { ...PUBLICADO, condition: "seminovo" } },
      take: 200,
      select: {
        serialNumber: true,
        manufactureYear: true,
        usageHours: true,
        usageCycles: true,
        conditionNotes: true,
        inspectionNotes: true,
        warrantyMonths: true,
        _count: { select: { checklist: true, media: true } },
      },
    });

    if (unidades.length === 0) return [];

    const fatos: Fato[] = [
      {
        icone: PackageCheck,
        titulo: "Uma unidade por anúncio",
        texto:
          "Seminovo não é lote. O equipamento da página é aquele equipamento — com a história dele, e não a de um modelo genérico.",
      },
    ];

    if (unidades.some((u) => (u.serialNumber ?? "").trim() !== "")) {
      fatos.push({
        icone: ScanLine,
        titulo: "Número de série",
        texto:
          "A unidade entra no catálogo identificada pelo número de série, e é a mesma que sai daqui para a sua clínica.",
      });
    }

    if (unidades.some((u) => u.manufactureYear !== null)) {
      fatos.push({
        icone: CalendarClock,
        titulo: "Ano de fabricação",
        texto:
          "Confirmado no próprio equipamento, o ano de fabricação vai para a ficha da unidade. Não confirmado, ele não é publicado.",
      });
    }

    if (unidades.some((u) => u.usageHours !== null || u.usageCycles !== null)) {
      fatos.push({
        icone: Gauge,
        titulo: "Uso acumulado",
        texto:
          "Nos equipamentos que contam horas ou ciclos de trabalho, o número lido na revisão é publicado junto com a unidade.",
      });
    }

    if (unidades.some((u) => u._count.checklist > 0)) {
      fatos.push({
        icone: ClipboardCheck,
        titulo: "Checklist da revisão",
        texto:
          "Item a item: o que foi verificado, o que foi reparado e o que foi substituído antes de o equipamento voltar a ser vendido.",
      });
    }

    if (
      unidades.some(
        (u) => u.conditionNotes.trim() !== "" || u.inspectionNotes.trim() !== "",
      )
    ) {
      fatos.push({
        icone: NotebookPen,
        titulo: "Estado descrito por escrito",
        texto:
          "Marcas de uso, detalhes de acabamento e observações da inspeção, escritos por quem revisou a unidade.",
      });
    }

    if (unidades.some((u) => u._count.media > 0)) {
      fatos.push({
        icone: Camera,
        titulo: "Fotos da unidade",
        texto:
          "Além das imagens do modelo, a página mostra fotos da própria unidade que está à venda.",
      });
    }

    if (unidades.some((u) => u.warrantyMonths !== null && u.warrantyMonths > 0)) {
      fatos.push({
        icone: ShieldCheck,
        titulo: "Garantia da unidade",
        texto:
          "Quando a unidade sai com prazo de garantia da JB, o prazo fica escrito na ficha dela antes da compra.",
      });
    }

    return fatos;
  } catch {
    return [];
  }
}

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const [parametros, atalhos, fatos] = await Promise.all([
    searchParams,
    atalhosDeCondicao("seminovo"),
    fatosDaRevisao(),
  ]);

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <Vitrine
        sobretitulo="Seminovo JB"
        titulo="Seminovos revisados pela JB"
        descricao="Aqui cada anúncio é uma unidade específica, não um modelo de catálogo. O equipamento passa pela bancada da JB antes de ser publicado, e o que a equipe verificou fica escrito na página dele."
        trilha={TRILHA}
        caminho={CAMINHO}
        parametros={parametros}
        filtrosFixos={{ condicao: "seminovo" }}
        atalhos={atalhos}
        rotuloAtalhos="Outras condições"
        travarCondicao
      />

      {/* A faixa só existe quando há o que mostrar: ela é montada a partir dos
          campos realmente preenchidos nas unidades publicadas. */}
      {fatos.length >= 2 ? (
        <Secao fundo="grafite" espaco="lg">
          <TituloSecao
            sobretitulo="Antes de entrar no catálogo"
            titulo="O que fica registrado em cada unidade"
            descricao="Comprar seminovo é uma decisão técnica, e decisão técnica precisa de informação por escrito. É por isso que a revisão de cada equipamento vira registro — e o que não foi registrado não vira promessa."
            acao={
              <LinkBotao href="/assistencia-tecnica" variante="contorno-claro">
                Conheça a assistência técnica
              </LinkBotao>
            }
          />

          <Grade
            como="ul"
            colunas={colunasParaTotal(fatos.length)}
            espaco="lg"
            className="mt-12"
          >
            {fatos.map((fato) => (
              <li key={fato.titulo} className="border-t border-white/15 pt-5">
                <fato.icone className="size-5 text-jb-300" aria-hidden />
                <h3 className="mt-4 text-lg font-bold text-white">{fato.titulo}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-300">
                  {fato.texto}
                </p>
              </li>
            ))}
          </Grade>
        </Secao>
      ) : null}
    </>
  );
}
