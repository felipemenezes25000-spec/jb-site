import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Clock, MapPin, Wrench } from "lucide-react";

import { FaixaDeContato } from "@/components/institucional/canais";
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
import { Cartao, Etiqueta } from "@/components/ui/data";
import { formatarPreco, plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import {
  JsonLd,
  metadataDePagina,
  organizacaoJsonLd,
  trilhaJsonLd,
} from "@/lib/seo";
import { enderecoCompleto, getSettings } from "@/lib/settings";

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

  const fatos = [
    s.empresa_desde
      ? {
          icone: CalendarDays,
          rotulo: "Em atividade desde",
          valor: s.empresa_desde,
          detalhe: anos ? `${plural(anos, "ano", "anos")} atendendo clínicas` : null,
        }
      : null,
    endereco
      ? {
          icone: MapPin,
          rotulo: "Base de operação",
          valor: [s.endereco_cidade, s.endereco_uf].filter(Boolean).join("/"),
          detalhe: s.endereco_bairro || null,
        }
      : null,
    s.horario
      ? { icone: Clock, rotulo: "Atendimento", valor: s.horario, detalhe: null }
      : null,
    servicos.length > 0
      ? {
          icone: Wrench,
          rotulo: "Serviços prestados",
          valor: String(servicos.length),
          detalhe: "Instalação, manutenção e suporte",
        }
      : null,
  ].filter((fato) => fato !== null);

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
        <div className="space-y-12">
          {fatos.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {fatos.map((fato) => (
                <li key={fato.rotulo}>
                  <Cartao className="h-full p-5">
                    <fato.icone className="size-5 text-jb-600" aria-hidden />
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-graf-500">
                      {fato.rotulo}
                    </p>
                    <p className="mt-1 text-lg font-bold leading-snug text-graf-950">
                      {fato.valor}
                    </p>
                    {fato.detalhe ? (
                      <p className="mt-1 text-sm leading-snug text-graf-500">{fato.detalhe}</p>
                    ) : null}
                  </Cartao>
                </li>
              ))}
            </ul>
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
                  histórico de cada atendimento registrado na Minha JB.
                </p>
                {s.horario ? <p>Horário de atendimento: {s.horario}.</p> : null}
              </div>
            )}
          </div>

          <VideoCms videoId={pagina?.videoId ?? null} titulo={pagina?.title || "Sobre a JB"} />

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
                    <Cartao className="flex h-full flex-col p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="text-base font-bold text-graf-950">{servico.name}</h3>
                        <Etiqueta tom={servico.priceCents ? "ok" : "neutro"}>
                          {servico.priceCents
                            ? formatarPreco(servico.priceCents)
                            : "Sob orçamento"}
                        </Etiqueta>
                      </div>
                      {servico.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-graf-600">
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
              <p className="text-base text-graf-700">
                {plural(marcas, "marca publicada", "marcas publicadas")} na loja.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <LinkBotao href="/marcas" variante="secundario">
                  Ver marcas
                </LinkBotao>
                <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario">
                  Solicitar assistência
                </LinkBotao>
              </div>
            </SecaoInstitucional>
          ) : null}

          <FaixaDeContato s={s} />
        </div>
      </MolduraInstitucional>
    </>
  );
}
