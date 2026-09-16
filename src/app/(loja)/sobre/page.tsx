import type { Metadata } from "next";
import { ArrowRight, Clock, MapPin } from "lucide-react";

import { FaixaDeContato } from "@/components/institucional/canais";
import {
  MolduraInstitucional,
  PilhaDeSecoes,
  SecaoInstitucional,
} from "@/components/institucional/moldura";
import {
  CapaCms,
  CorpoCms,
  GaleriaCms,
  VideoCms,
  carregarPaginaCms,
  temTexto,
} from "@/components/institucional/pagina-cms";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta } from "@/components/ui/data";
import { Estatistica, Estatisticas } from "@/components/ui/estatistica";
import { formatarPreco, plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { contagemProva } from "@/lib/prova";
import {
  JsonLd,
  metadataDePagina,
  organizacaoJsonLd,
  trilhaJsonLd,
} from "@/lib/seo";
import { enderecoCompleto, getSettings } from "@/lib/settings";

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

const SLUG = "sobre";
const CAMINHO = "/sobre";

export async function generateMetadata(): Promise<Metadata> {
  const [pagina, s] = await Promise.all([carregarPaginaCms(SLUG), getSettings()]);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Sobre a JB",
    descricao: pagina?.seoDescription || pagina?.lead || s.empresa_resumo,
    caminho: CAMINHO,
    imagem: pagina?.cover?.url ?? null,
  });
}

/** Anos completos de atividade. Sai da configuração, não do chute. */
function anosDeAtividade(desde: string) {
  const ano = Number(desde.trim());
  if (!Number.isInteger(ano) || ano < 1900) return null;
  const diferenca = new Date().getFullYear() - ano;
  return diferenca > 0 ? diferenca : null;
}

export default async function SobrePage() {
  const [pagina, s, servicos, marcas] = await Promise.all([
    carregarPaginaCms(SLUG),
    getSettings(),
    prisma.service.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, description: true, priceCents: true },
    }),
    prisma.brand.count({ where: { published: true } }),
  ]);

  const anos = anosDeAtividade(s.empresa_desde);
  const endereco = enderecoCompleto(s);

  /* Prova objetiva, e só o que é verificável: o ano vem da configuração, as
     contagens vêm do próprio catálogo. Faixa de estatística sem número real
     não existe — some inteira em vez de virar um "—" repetido.

     As contagens passam pelo mesmo critério da home (`src/lib/prova.ts`):
     número pequeno é verdadeiro e mesmo assim trabalha contra quem publica.
     "3 serviços no catálogo" não é autoridade; é uma lista curta com um
     rótulo pomposo. Abaixo do limite a contagem simplesmente não entra, e o
     que a JB faz continua sendo dito em palavras logo abaixo. */
  const numeros = [
    s.empresa_desde
      ? {
          chave: "desde",
          valor: s.empresa_desde,
          rotulo: "Em atividade desde",
          detalhe: anos ? `${plural(anos, "ano", "anos")} atendendo clínicas` : undefined,
          destaque: true,
        }
      : null,
    contagemProva("servicos", servicos.length)
      ? {
          chave: "servicos",
          valor: String(servicos.length),
          rotulo: "Serviços no catálogo",
          detalhe: "Instalação, manutenção e suporte",
          destaque: false,
        }
      : null,
    contagemProva("marcas", marcas)
      ? {
          chave: "marcas",
          valor: String(marcas),
          rotulo: "Marcas no catálogo",
          detalhe: "A assistência atende outras marcas também",
          destaque: false,
        }
      : null,
  ].filter((numero) => numero !== null);

  /* Onde e quando. Não é número, então não entra na faixa de estatística. */
  const operacao = [
    endereco
      ? { icone: MapPin, rotulo: "Base de operação", valor: endereco }
      : null,
    s.horario ? { icone: Clock, rotulo: "Atendimento", valor: s.horario } : null,
  ].filter((linha) => linha !== null);

  return (
    <>
      <JsonLd
        dados={[
          organizacaoJsonLd(s),
          trilhaJsonLd([{ rotulo: "Início", href: "/" }, { rotulo: "Sobre a JB", href: CAMINHO }]),
        ]}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Sobre a JB" }]}
        sobretitulo={pagina?.eyebrow || "Quem somos"}
        titulo={pagina?.title || "Sobre a JB"}
        resumo={pagina?.lead || s.empresa_resumo}
        atualizadoEm={pagina?.updatedAt ?? null}
        acoes={
          <>
            <LinkBotao href="/contato">
              Falar com a JB
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/estrutura" variante="secundario">
              Conhecer a estrutura
            </LinkBotao>
          </>
        }
      >
        <div className="space-y-12 lg:space-y-16">
          {numeros.length > 0 ? (
            <Estatisticas
              colunas={numeros.length === 2 ? 2 : 3}
              className="border-y border-graf-200 py-10 lg:py-12"
            >
              {numeros.map((numero) => (
                <Estatistica
                  key={numero.chave}
                  valor={numero.valor}
                  rotulo={numero.rotulo}
                  detalhe={numero.detalhe}
                  destaque={numero.destaque}
                />
              ))}
            </Estatisticas>
          ) : null}

          <CapaCms imagem={pagina?.cover ?? null} />

          <div className="max-w-3xl">
            {temTexto(pagina?.body) ? (
              <CorpoCms html={pagina?.body ?? ""} />
            ) : (
              /* Sem registro no CMS a página não inventa história: repete
                 apenas o que está configurado no painel. */
              <div className="prose-jb max-w-none">
                <p>
                  A {s.empresa_nome} atende consultórios e clínicas odontológicas
                  {s.empresa_desde ? ` desde ${s.empresa_desde}` : ""}
                  {endereco ? `, com base em ${endereco}` : ""}.
                </p>
                <p>
                  O trabalho cobre o ciclo inteiro do equipamento: venda de novos e
                  seminovos revisados, instalação, manutenção preventiva e corretiva, e o
                  histórico de cada atendimento registrado na Área da Clínica.
                </p>
                {s.horario ? <p>Horário de atendimento: {s.horario}.</p> : null}
              </div>
            )}
          </div>

          {/* Onde e quando, em ficha: dois fatos configurados no painel não
              precisam de dois cartões com chapa vermelha para serem lidos. */}
          {operacao.length > 0 ? (
            <dl className="grid gap-6 rounded-2xl border border-graf-200 bg-surface-muted px-6 py-6 sm:grid-cols-2 sm:gap-8 sm:px-8">
              {operacao.map((linha) => (
                /* O HTML só admite UM nível de <div> dentro de <dl>, e com o par
                   <dt>/<dd> direto dentro dele. A coluna de texto era um segundo
                   <div> e tirava o par da lista de definição — o axe acusa
                   `definition-list` e `dlitem`. O ícone agora é posicionado sobre
                   o recuo, e o <div> tem exatamente o par dentro. */
                <div key={linha.rotulo} className="relative min-w-0 pl-8">
                  <dt className="text-[0.8125rem] leading-tight text-graf-500">
                    <linha.icone
                      className="absolute left-0 top-0.5 size-5 text-graf-500"
                      aria-hidden
                    />
                    {linha.rotulo}
                  </dt>
                  <dd className="mt-1 text-base font-semibold leading-snug text-graf-950">
                    {linha.valor}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <VideoCms videoId={pagina?.videoId ?? null} titulo={pagina?.title || "Sobre a JB"} />

          <PilhaDeSecoes>
            {pagina?.gallery?.length ? (
              <SecaoInstitucional titulo="A JB por dentro">
                <GaleriaCms imagens={pagina.gallery} />
              </SecaoInstitucional>
            ) : null}

            {servicos.length > 0 ? (
              <SecaoInstitucional
                titulo="O que a JB faz"
                descricao="Serviços cadastrados no catálogo. O valor sai no orçamento, conforme o equipamento e o deslocamento."
              >
                <ul className="grid gap-4 sm:grid-cols-2">
                  {servicos.map((servico) => (
                    <li key={servico.id}>
                      <Cartao className="flex h-full flex-col p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h3 className="text-base font-bold text-graf-950">{servico.name}</h3>
                          <Etiqueta tom={servico.priceCents ? "ok" : "neutro"}>
                            {servico.priceCents
                              ? formatarPreco(servico.priceCents)
                              : "Sob orçamento"}
                          </Etiqueta>
                        </div>
                        {servico.description ? (
                          <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graf-600">
                            {servico.description}
                          </p>
                        ) : null}
                      </Cartao>
                    </li>
                  ))}
                </ul>
              </SecaoInstitucional>
            ) : null}

            {marcas > 0 ? (
              <SecaoInstitucional
                titulo="Marcas no catálogo"
                descricao="A assistência técnica atende equipamentos de outras marcas também — informe marca e modelo ao abrir o chamado."
              >
                <div className="flex flex-wrap gap-3">
                  <LinkBotao href="/marcas" variante="secundario">
                    Ver marcas
                  </LinkBotao>
                  <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario">
                    Solicitar assistência
                  </LinkBotao>
                </div>
              </SecaoInstitucional>
            ) : null}
          </PilhaDeSecoes>

          <FaixaDeContato s={s} />
        </div>
      </MolduraInstitucional>
    </>
  );
}
