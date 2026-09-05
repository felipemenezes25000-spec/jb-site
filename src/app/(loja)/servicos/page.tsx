import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

import { ORDEM_SERVICO, ROTULO_SERVICO } from "@/components/assistencia/rotulos";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta, Trilha, Vazio } from "@/components/ui/data";
import { formatarPreco } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { JsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

const CAMINHO = "/servicos";

const TRILHA = [
  { rotulo: "Início", href: "/" },
  { rotulo: "Serviços" },
];

export const metadata: Metadata = metadataDePagina({
  titulo: "Serviços técnicos",
  descricao:
    "Instalação, visita técnica, manutenção preventiva e corretiva, treinamento e retirada de equipamentos odontológicos.",
  caminho: CAMINHO,
});

export default async function ServicosPage() {
  const [s, servicos] = await Promise.all([
    getSettings(),
    prisma.service.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        kind: true,
        description: true,
        priceCents: true,
      },
    }),
  ]);

  const grupos = ORDEM_SERVICO.map((tipo) => ({
    tipo,
    rotulo: ROTULO_SERVICO[tipo],
    itens: servicos.filter((servico) => servico.kind === tipo),
  })).filter((grupo) => grupo.itens.length > 0);

  return (
    <div className="container-jb py-8 lg:py-12">
      <JsonLd dados={trilhaJsonLd(TRILHA)} />
      <Trilha itens={TRILHA} className="mb-6" />

      <header className="max-w-2xl">
        <h1 className="text-display leading-tight">Serviços técnicos</h1>
        <p className="mt-4 text-base leading-relaxed text-graf-600">
          O que a equipe da JB executa além do conserto: instalar, revisar, treinar a equipe
          da clínica e retirar equipamento que saiu de uso. Preço base publicado quando o
          serviço tem valor fechado; o resto sai no orçamento, depois de saber o que a
          clínica precisa.
        </p>
      </header>

      {servicos.length === 0 ? (
        <Vazio
          icone={Wrench}
          titulo="Nenhum serviço publicado ainda"
          descricao="Os serviços aparecem aqui conforme são cadastrados no painel. Enquanto isso, descreva o que você precisa e a equipe monta o orçamento."
          acao={<LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>}
          className="mt-10"
        />
      ) : (
        <div className="mt-12 space-y-14">
          {grupos.map((grupo) => (
            <section key={grupo.tipo} aria-labelledby={`grupo-${grupo.tipo}`}>
              <h2
                id={`grupo-${grupo.tipo}`}
                className="mb-6 text-title leading-tight"
              >
                {grupo.rotulo}
              </h2>

              <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grupo.itens.map((servico) => (
                  <li key={servico.id}>
                    <Cartao interativo className="relative flex h-full flex-col p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-graf-950">
                          <Link
                            href={`/servicos/${servico.slug}`}
                            className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                          >
                            {servico.name}
                          </Link>
                        </h3>
                      </div>

                      {servico.description ? (
                        <p className="line-3 mt-2 text-sm leading-relaxed text-graf-600">
                          {servico.description}
                        </p>
                      ) : null}

                      <div className="mt-auto pt-5">
                        {servico.priceCents !== null && servico.priceCents > 0 ? (
                          <>
                            <p className="label-mono uppercase text-graf-500">A partir de</p>
                            <p className="tabular mt-0.5 text-lg font-bold text-graf-950">
                              {formatarPreco(servico.priceCents)}
                            </p>
                          </>
                        ) : (
                          <Etiqueta tom="neutro">Sob orçamento</Etiqueta>
                        )}
                      </div>
                    </Cartao>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- CTA */}
      <section className="mt-16 rounded-2xl border border-graf-200 bg-graf-50 p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="text-title leading-tight">
              Não é bem nenhum destes? Descreva o que precisa.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-graf-600">
              A equipe da JB atende {s.endereco_cidade} e região e monta o orçamento a partir
              do que a sua clínica precisa — inclusive combinações de serviço e peça.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <LinkBotao href="/orcamento?tipo=servico" tamanho="lg">
              Pedir orçamento
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" tamanho="lg">
              Abrir chamado
            </LinkBotao>
          </div>
        </div>
      </section>
    </div>
  );
}
