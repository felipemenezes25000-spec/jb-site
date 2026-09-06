import type { Metadata } from "next";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  PackageOpen,
  Receipt,
  ScanLine,
  Stethoscope,
  ThumbsUp,
  Truck,
  Wrench,
} from "lucide-react";

import { CanaisDeContato } from "@/components/institucional/canais";
import { MapaDaUnidade } from "@/components/institucional/mapa";
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
import { Cartao } from "@/components/ui/data";
import { PassosNumerados, type PassoNumerado } from "@/components/ui/passos";
import { prisma } from "@/lib/prisma";
import { JsonLd, localNegocioJsonLd, metadataDePagina, trilhaJsonLd } from "@/lib/seo";
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

const SLUG = "estrutura";
const CAMINHO = "/estrutura";

/* ============================================================================
   O percurso da bancada

   Nove etapas, na ordem em que acontecem. Isto não é conteúdo editorial — é a
   descrição do processo que a plataforma executa e registra, e por isso mora
   no código e não no CMS: mudar a ordem aqui significaria mudar a operação.

   Cada etapa corresponde a um estado real do domínio (ver docs/dominio.md):
   `solicitacao_recebida`, `triagem`, `em_diagnostico`, `orcamento_enviado`,
   `aprovado`, `em_manutencao`, `testes` e `concluido`. Nenhuma etapa promete
   prazo — prazo depende de peça, de agenda e do defeito.
   ============================================================================ */
const PERCURSO_DA_BANCADA: PassoNumerado[] = [
  {
    titulo: "Recebimento",
    icone: PackageOpen,
    descricao:
      "O equipamento entra com registro de origem, estado aparente e o relato de quem o usa.",
  },
  {
    titulo: "Identificação",
    icone: ScanLine,
    descricao:
      "Marca, modelo e número de série conferidos na etiqueta. É por eles que o histórico se liga ao aparelho certo.",
  },
  {
    titulo: "Diagnóstico",
    icone: Stethoscope,
    descricao:
      "O defeito é reproduzido e investigado antes de qualquer troca. Diagnosticar vem antes de condenar.",
  },
  {
    titulo: "Orçamento",
    icone: Receipt,
    descricao:
      "Peças, serviço e prazo são descritos por escrito, com o que foi encontrado no diagnóstico.",
  },
  {
    titulo: "Aprovação",
    icone: ThumbsUp,
    descricao:
      "A clínica aprova ou recusa pelo site, e a decisão fica registrada. Sem aprovação, nada é executado.",
  },
  {
    titulo: "Reparo",
    icone: Wrench,
    descricao: "O serviço aprovado é executado, com as peças que constam do orçamento.",
  },
  {
    titulo: "Testes",
    icone: ClipboardCheck,
    descricao:
      "O equipamento é testado nas condições de uso antes de sair. O resultado entra na ordem de serviço.",
  },
  {
    titulo: "Relatório",
    icone: FileText,
    descricao:
      "A ordem de serviço discrimina o que foi feito, o que foi trocado e o que ficou pendente.",
  },
  {
    titulo: "Devolução",
    icone: Truck,
    descricao:
      "O aparelho volta para a clínica e o atendimento é fechado na ficha dele, com data e responsável.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const [pagina, s] = await Promise.all([carregarPaginaCms(SLUG), getSettings()]);

  return metadataDePagina({
    titulo: pagina?.seoTitle || pagina?.title || "Onde o equipamento é cuidado",
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
            { rotulo: "Estrutura", href: CAMINHO },
          ]),
        ]}
      />

      <MolduraInstitucional
        trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Estrutura" }]}
        sobretitulo={pagina?.eyebrow || "Estrutura"}
        titulo={pagina?.title || "Onde o equipamento é cuidado"}
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
            <p className="mt-2 text-sm leading-relaxed text-graf-600">
              Visitas à sede são combinadas antes, pelo telefone ou pelo WhatsApp.
            </p>
            <CanaisDeContato s={s} className="mt-4" />
          </Cartao>
        }
      >
        <div className="space-y-12 lg:space-y-16">
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
                  <p>O horário de funcionamento é {s.horario.toLowerCase()}.</p>
                ) : null}
              </div>
            )}
          </div>

          <VideoCms
            videoId={pagina?.videoId ?? null}
            titulo={pagina?.title || "Onde o equipamento é cuidado"}
          />

          <PilhaDeSecoes>
            {pagina?.gallery?.length ? (
              <SecaoInstitucional titulo="A estrutura em imagens">
                <GaleriaCms imagens={pagina.gallery} />
              </SecaoInstitucional>
            ) : null}

            <SecaoInstitucional
              titulo="O percurso de um equipamento na bancada"
              descricao="As nove etapas que todo equipamento recolhido percorre. Nenhuma delas é pulada, e cada uma deixa registro na ficha do aparelho."
            >
              <PassosNumerados
                passos={PERCURSO_DA_BANCADA}
                rotulo="Etapas do atendimento em oficina"
              />
            </SecaoInstitucional>

            {servicos.length > 0 ? (
              <SecaoInstitucional
                titulo="O que sai daqui"
                descricao="Serviços que a estrutura sustenta, do agendamento ao laudo."
              >
                <ul className="grid gap-3 sm:grid-cols-2">
                  {servicos.map((servico) => (
                    <li
                      key={servico.id}
                      className="rounded-xl border border-graf-200 bg-white px-5 py-4"
                    >
                      <p className="text-base font-semibold leading-snug text-graf-950">
                        {servico.name}
                      </p>
                      {servico.description ? (
                        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-graf-600">
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
          </PilhaDeSecoes>
        </div>
      </MolduraInstitucional>
    </>
  );
}
