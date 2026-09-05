import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { CanaisDeContato } from "@/components/institucional/canais";
import { MapaDaUnidade } from "@/components/institucional/mapa";
import { MolduraInstitucional, SecaoInstitucional } from "@/components/institucional/moldura";
import {
  CapaCms,
  CorpoCms,
  GaleriaCms,
  VideoCms,
  carregarPaginaCms,
  temTexto,
} from "@/components/institucional/pagina-cms";
import { LinkBotao } from "@/components/ui/button";
import { Cartao } from "@/components/ui/data";
import { prisma } from "@/lib/prisma";
import { JsonLd, localNegocioJsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
import { enderecoCompleto, getSettings } from "@/lib/settings";

const SLUG = "estrutura";
const CAMINHO = "/estrutura";

export async function generateMetadata(): Promise<Metadata> {
  const [pagina, s] = await Promise.all([carregarPaginaCms(SLUG), getSettings()]);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Nossa estrutura",
    descricao:
      pagina?.seoDescription ||
      pagina?.lead ||
      `Onde a ${s.empresa_nome} opera e como a bancada técnica atende a sua clínica.`,
    caminho: CAMINHO,
    imagem: pagina?.cover?.url ?? null,
  });
}

export default async function EstruturaPage() {
  const [pagina, s, servicos] = await Promise.all([
    carregarPaginaCms(SLUG),
    getSettings(),
    prisma.service.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, description: true },
    }),
  ]);

  const endereco = enderecoCompleto(s);

  return (
    <>
      <JsonLd
        dados={[
          localNegocioJsonLd(s),
          trilhaJsonLd([
            { rotulo: "Início", href: "/" },
            { rotulo: "Nossa estrutura", href: CAMINHO },
          ]),
        ]}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Nossa estrutura" }]}
        sobretitulo={pagina?.eyebrow || "Estrutura"}
        titulo={pagina?.title || "Nossa estrutura"}
        resumo={
          pagina?.lead ||
          (endereco
            ? `Operação em ${endereco}, com bancada técnica, gestão e estoque de peças.`
            : "Bancada técnica, gestão e estoque de peças para reposição.")
        }
        atualizadoEm={pagina?.updatedAt ?? null}
        acoes={
          <LinkBotao href="/contato">
            Agendar uma visita
            <ArrowRight className="size-4" aria-hidden />
          </LinkBotao>
        }
        lateral={
          <Cartao className="p-5">
            <h2 className="text-base font-bold text-graf-950">Onde encontrar a JB</h2>
            <CanaisDeContato s={s} className="mt-4" />
          </Cartao>
        }
      >
        <div className="space-y-12">
          <CapaCms imagem={pagina?.cover ?? null} />

          <div className="max-w-3xl">
            {temTexto(pagina?.body) ? (
              <CorpoCms html={pagina?.body ?? ""} />
            ) : (
              /* Fallback honesto: só o que está configurado no painel. A
                 descrição dos ambientes é conteúdo de CMS e entra aqui assim
                 que a página "estrutura" for preenchida. */
              <div className="prose-jb max-w-none">
                {endereco ? (
                  <p>
                    A {s.empresa_nome} funciona em {endereco}, de onde saem os atendimentos
                    e onde ficam a bancada técnica e o estoque de peças para reposição.
                  </p>
                ) : null}
                {s.horario ? (
                  <p>
                    O horário de funcionamento é {s.horario.toLowerCase()}. Visitas à sede
                    são combinadas antes pelo telefone ou pelo WhatsApp.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <VideoCms
            videoId={pagina?.videoId ?? null}
            titulo={pagina?.title || "Nossa estrutura"}
          />

          {pagina?.gallery?.length ? (
            <SecaoInstitucional titulo="A estrutura em imagens">
              <GaleriaCms imagens={pagina.gallery} />
            </SecaoInstitucional>
          ) : null}

          {servicos.length > 0 ? (
            <SecaoInstitucional
              titulo="O que sai daqui"
              descricao="Serviços que a estrutura sustenta, do agendamento ao laudo."
            >
              <ul className="grid gap-3 sm:grid-cols-2">
                {servicos.map((servico) => (
                  <li
                    key={servico.id}
                    className="rounded-lg border border-graf-200 bg-white px-4 py-3.5"
                  >
                    <p className="text-sm font-semibold text-graf-900">{servico.name}</p>
                    {servico.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-graf-600">
                        {servico.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </SecaoInstitucional>
          ) : null}

          <SecaoInstitucional titulo="Como chegar">
            <MapaDaUnidade
              src={s.maps_embed}
              endereco={endereco}
              titulo={`Mapa com a localização da ${s.empresa_nome}`}
            />
          </SecaoInstitucional>
        </div>
      </MolduraInstitucional>
    </>
  );
}
