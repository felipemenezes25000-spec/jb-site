import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";

import { CabecalhoAssistencia } from "@/components/assistencia/apoio";
import { ORDEM_SERVICO, ROTULO_SERVICO } from "@/components/assistencia/rotulos";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta, Trilha, Vazio } from "@/components/ui/data";
import { Grade, colunasParaTotal } from "@/components/ui/grade";
import { FaixaChamada, Secao } from "@/components/ui/secao";
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

  /**
   * Um cartão por serviço, numa grade só.
   *
   * A página agrupava por tipo, com um título de seção por grupo. Como cada
   * tipo tem, na prática, um serviço cadastrado, o resultado era um título
   * grande repetindo o nome do cartão logo abaixo — e um cartão sozinho numa
   * fileira de três, com dois terços de tela vazia, cinco vezes seguidas.
   *
   * O tipo continua visível: virou o degrau em caixa alta dentro do próprio
   * cartão. A ordem de `ORDEM_SERVICO` continua valendo, então serviços do
   * mesmo tipo seguem vizinhos quando a JB cadastrar mais de um.
   */
  const ordenados = [...servicos].sort((a, b) => {
    const posicao = ORDEM_SERVICO.indexOf(a.kind) - ORDEM_SERVICO.indexOf(b.kind);
    return posicao !== 0 ? posicao : a.name.localeCompare(b.name, "pt-BR");
  });

  return (
    <>
      <JsonLd dados={trilhaJsonLd(TRILHA)} />

      <CabecalhoAssistencia
        trilha={<Trilha itens={TRILHA} />}
        sobretitulo="Equipe técnica"
        titulo="Serviços técnicos"
        resumo="O que a equipe da JB executa além do conserto: instalar, revisar, treinar a equipe da clínica e retirar equipamento que saiu de uso. Preço base publicado quando o serviço tem valor fechado; o resto sai no orçamento, depois de saber o que a clínica precisa."
      />

      <Secao espaco="md">
        {servicos.length === 0 ? (
          <Vazio
            icone={Wrench}
            titulo="Nenhum serviço publicado ainda"
            descricao="Os serviços aparecem aqui conforme são cadastrados no painel. Enquanto isso, descreva o que você precisa e a equipe monta o orçamento."
            acao={<LinkBotao href="/orcamento">Pedir orçamento</LinkBotao>}
          />
        ) : (
          <Grade como="ul" colunas={colunasParaTotal(ordenados.length)} espaco="md">
            {ordenados.map((servico) => (
              <li key={servico.id}>
                <Cartao interativo className="relative flex h-full flex-col p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-jb-600">
                    {ROTULO_SERVICO[servico.kind]}
                  </p>

                  <h2 className="mt-2 text-lg font-bold leading-snug text-graf-950">
                    <Link
                      href={`/servicos/${servico.slug}`}
                      className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                    >
                      {servico.name}
                    </Link>
                  </h2>

                  {servico.description ? (
                    <p className="line-3 mt-2 text-sm leading-relaxed text-graf-600">
                      {servico.description}
                    </p>
                  ) : null}

                  <div className="mt-auto flex items-end justify-between gap-4 border-t border-graf-100 pt-5">
                    <div>
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

                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-jb-700">
                      Ver serviço
                      <ArrowRight className="size-4 shrink-0" aria-hidden />
                    </span>
                  </div>
                </Cartao>
              </li>
            ))}
          </Grade>
        )}
      </Secao>

      <FaixaChamada
        fundo="clara"
        titulo="Não é bem nenhum destes? Descreva o que precisa."
        descricao={`A equipe da JB atende ${s.endereco_cidade} e região e monta o orçamento a partir do que a sua clínica precisa — inclusive combinações de serviço e peça.`}
        acoes={
          <>
            <LinkBotao href="/orcamento?tipo=servico" tamanho="lg">
              Pedir orçamento
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao
              href="/assistencia-tecnica/solicitar"
              variante="secundario"
              tamanho="lg"
            >
              Abrir chamado
            </LinkBotao>
          </>
        }
      />
    </>
  );
}
