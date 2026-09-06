import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";

import { CaixaDeAjuda } from "@/components/institucional/canais";
import { ListaDeFaq, type GrupoFaq } from "@/components/institucional/faq-lista";
import { MolduraInstitucional } from "@/components/institucional/moldura";
import { CorpoCms, carregarPaginaCms } from "@/components/institucional/pagina-cms";
import { LinkBotao } from "@/components/ui/button";
import { Vazio } from "@/components/ui/data";
import { prisma } from "@/lib/prisma";
import { JsonLd, faqJsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

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

const SLUG = "faq";
const CAMINHO = "/faq";

/** Rótulo de cada grupo do modelo Faq. Grupo novo cai no nome capitalizado. */
const ROTULO_GRUPO: Record<string, string> = {
  geral: "Geral",
  compra: "Compra e pedido",
  entrega: "Entrega e retirada",
  assistencia: "Assistência técnica",
  produto: "Produtos e equipamentos",
};

const ORDEM_GRUPO = ["geral", "compra", "entrega", "assistencia", "produto"];

function rotuloDoGrupo(chave: string) {
  return ROTULO_GRUPO[chave] ?? chave.charAt(0).toUpperCase() + chave.slice(1);
}

export async function generateMetadata(): Promise<Metadata> {
  const pagina = await carregarPaginaCms(SLUG);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Dúvidas frequentes",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      "Respostas sobre compra, entrega, garantia e assistência técnica de equipamentos odontológicos.",
    caminho: CAMINHO,
  });
}

export default async function FaqPage() {
  const [pagina, s, perguntas] = await Promise.all([
    carregarPaginaCms(SLUG),
    getSettings(),
    prisma.faq.findMany({
      // perguntas presas a um produto aparecem na página do produto, não aqui
      where: { published: true, productId: null },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, question: true, answer: true, group: true },
    }),
  ]);

  const porGrupo = new Map<string, GrupoFaq>();
  for (const item of perguntas) {
    const chave = item.group || "geral";
    const grupo = porGrupo.get(chave) ?? {
      chave,
      rotulo: rotuloDoGrupo(chave),
      perguntas: [],
    };
    grupo.perguntas.push({ id: item.id, pergunta: item.question, resposta: item.answer });
    porGrupo.set(chave, grupo);
  }

  const posicao = (chave: string) => {
    const indice = ORDEM_GRUPO.indexOf(chave);
    return indice === -1 ? ORDEM_GRUPO.length : indice;
  };

  const grupos = [...porGrupo.values()].sort(
    (a, b) => posicao(a.chave) - posicao(b.chave) || a.rotulo.localeCompare(b.rotulo, "pt-BR"),
  );

  return (
    <>
      {perguntas.length > 0 ? (
        <JsonLd
          dados={[
            faqJsonLd(
              perguntas.map((item) => ({ pergunta: item.question, resposta: item.answer })),
            ),
            trilhaJsonLd([
              { rotulo: "Início", href: "/" },
              { rotulo: "Dúvidas frequentes", href: CAMINHO },
            ]),
          ]}
        />
      ) : null}

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Dúvidas frequentes" }]}
        sobretitulo="Perguntas frequentes"
        titulo={pagina?.title || "Dúvidas frequentes"}
        resumo={
          pagina?.lead ||
          "O que a equipe da JB mais responde no dia a dia, sobre compra, prazos, garantia e assistência técnica."
        }
        atualizadoEm={pagina?.updatedAt ?? null}
        lateral={<CaixaDeAjuda s={s} titulo="Não achou sua dúvida?" />}
      >
        <div className="space-y-10">
          <CorpoCms html={pagina?.body ?? ""} />

          {grupos.length === 0 ? (
            <Vazio
              icone={MessagesSquare}
              titulo="Ainda não há perguntas publicadas"
              descricao="As dúvidas mais comuns vão aparecer aqui conforme a equipe as publica no painel. Enquanto isso, é só perguntar direto."
              acao={<LinkBotao href="/contato">Fazer uma pergunta</LinkBotao>}
            />
          ) : (
            <ListaDeFaq grupos={grupos} />
          )}
        </div>
      </MolduraInstitucional>
    </>
  );
}
