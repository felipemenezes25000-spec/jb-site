import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, SearchX, Stethoscope, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta, TituloSecao, Trilha, Vazio } from "@/components/ui/data";
import { GradeMarketplace } from "@/components/loja/marketplace/grade-marketplace";
import type { ParcelamentoMarketplace } from "@/components/loja/marketplace/tipos";
import { Secao } from "@/components/ui/secao";
import {
  ORDEM_POR_INTENCAO,
  ROTULO_DO_GRUPO,
  porQueEsteGrupo,
  validarConsulta,
  type GrupoDeResultado,
} from "@/lib/busca/intencao";
import { buscarTudo, type ResultadoUniversal } from "@/lib/busca/universal";
import { paraCentavos } from "@/lib/format";
import { ROTULO_EQUIPAMENTO } from "@/lib/rotulos-equipamento";
import { metadataDePagina } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/*
 * Migração para Cache Components — esta rota ainda não foi migrada.
 * Ver docs/evolucao-jb/cobertura.md, fase 5.
 */
export const instant = false;

/* ============================================================================
   Busca universal

   Quatro grupos numa página só: catálogo, Central Técnica, serviços e — para
   quem tem sessão — os equipamentos da própria clínica.

   A intenção da consulta **ordena** os grupos e não esconde nenhum. Quem
   digita "compressor fazendo barulho" vê o texto técnico primeiro e os
   compressores logo abaixo; quem digita "compressor 40 litros" vê o contrário.
   Nenhuma das duas buscas fica sem o outro lado.

   `noindex`: página de resultado não é conteúdo, e uma busca indexada compete
   com a própria categoria que ela lista.
   ============================================================================ */

export const metadata: Metadata = {
  ...metadataDePagina({
    titulo: "Busca",
    descricao: "Equipamentos, textos técnicos, serviços e o prontuário da sua clínica.",
    caminho: "/busca",
  }),
  robots: { index: false, follow: true },
};

const TRILHA = [{ rotulo: "Início", href: "/" }, { rotulo: "Busca" }];

function CabecalhoDoGrupo({
  grupo,
  intencao,
  quantidade,
}: {
  grupo: GrupoDeResultado;
  intencao: ResultadoUniversal["intencao"];
  quantidade: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      {/* O `id` vem daqui e o `aria-labelledby` da seção aponta para ele.
          Sem esta linha o rótulo da seção referencia um id inexistente, e o
          leitor de tela anuncia a região sem nome. */}
      <h2 id={`g-${grupo}`} className="text-title texto-forte">
        {ROTULO_DO_GRUPO[grupo]}
        <span className="tabular ml-2 text-base font-semibold text-graf-500">{quantidade}</span>
      </h2>
      {/* Por que este grupo é útil para ESTA busca. O escopo pede que o
          resultado explique a própria pertinência. */}
      <p className="text-[0.875rem] text-graf-500">{porQueEsteGrupo(grupo, intencao)}</p>
    </div>
  );
}

function Grupo({
  grupo,
  resultado,
  consulta,
  parcelamento,
}: {
  grupo: GrupoDeResultado;
  resultado: ResultadoUniversal;
  /** O termo buscado, para levar junto ao catálogo. */
  consulta: string;
  /** Regras de parcelamento da loja — as mesmas do catálogo. */
  parcelamento: ParcelamentoMarketplace;
}) {
  if (grupo === "produtos") {
    if (resultado.produtos.length === 0) return null;
    return (
      <section aria-labelledby="g-produtos">
        <CabecalhoDoGrupo
          grupo={grupo}
          intencao={resultado.intencao}
          quantidade={resultado.produtos.length}
        />
        <div className="mt-5 max-w-[112rem]">
          <GradeMarketplace produtos={resultado.produtos} parcelamento={parcelamento} />
        </div>

        <p className="mt-4">
          <Link
            href={`/loja?q=${encodeURIComponent(consulta)}`}
            className="foco-jb inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-semibold text-jb-700 underline underline-offset-4 hover:text-jb-500"
          >
            Refinar no catálogo, com filtros
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      </section>
    );
  }

  if (grupo === "conteudo") {
    if (resultado.conteudo.length === 0) return null;
    return (
      <section aria-labelledby="g-conteudo">
        <CabecalhoDoGrupo
          grupo={grupo}
          intencao={resultado.intencao}
          quantidade={resultado.conteudo.length}
        />
        <ul className="mt-4 space-y-3">
          {resultado.conteudo.map((artigo) => (
            <li key={artigo.slug}>
              <Cartao>
              <Link
                href={`/central-tecnica/${artigo.slug}`}
                className="flex items-start gap-3.5 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <BookOpen className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-graf-950">
                    {artigo.titulo}
                  </span>
                  {artigo.chamada ? (
                    <span className="mt-0.5 block text-[0.875rem] leading-relaxed text-graf-600">
                      {artigo.chamada}
                    </span>
                  ) : null}
                </span>
              </Link>
              </Cartao>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (grupo === "servicos") {
    if (resultado.servicos.length === 0) return null;
    return (
      <section aria-labelledby="g-servicos">
        <CabecalhoDoGrupo
          grupo={grupo}
          intencao={resultado.intencao}
          quantidade={resultado.servicos.length}
        />
        <ul className="mt-4 space-y-3">
          {resultado.servicos.map((servico) => (
            <li key={servico.href}>
              <Cartao>
              <Link
                href={servico.href}
                className="flex items-start gap-3.5 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                <Wrench className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-graf-950">
                    {servico.titulo}
                  </span>
                  {servico.descricao ? (
                    <span className="mt-0.5 block text-[0.875rem] leading-relaxed text-graf-600">
                      {servico.descricao}
                    </span>
                  ) : null}
                </span>
              </Link>
              </Cartao>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  /* Equipamentos da própria clínica. A consulta que os produz filtra por
     `customerId` da sessão; sem sessão a lista vem vazia e este bloco não
     existe. Nunca há sugestão de equipamento de terceiro. */
  if (resultado.meusEquipamentos.length === 0) return null;

  return (
    <section aria-labelledby="g-meus_equipamentos">
      <CabecalhoDoGrupo
        grupo={grupo}
        intencao={resultado.intencao}
        quantidade={resultado.meusEquipamentos.length}
      />
      <ul className="mt-4 space-y-3">
        {resultado.meusEquipamentos.map((equipamento) => (
          <li key={equipamento.id}>
            <Cartao>
            <Link
              href={`/minha-jb/equipamentos/${equipamento.id}`}
              className="flex items-center justify-between gap-4 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
            >
              <span className="flex min-w-0 items-start gap-3.5">
                <Stethoscope className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-graf-950">
                    {equipamento.nome}
                  </span>
                  <span className="mt-0.5 block text-[0.875rem] text-graf-600">
                    {[equipamento.marca, equipamento.modelo].filter(Boolean).join(" ") ||
                      "Marca e modelo não cadastrados"}
                  </span>
                </span>
              </span>
              <Etiqueta tom={equipamento.situacao === "operacional" ? "ok" : "alerta"}>
                {ROTULO_EQUIPAMENTO[equipamento.situacao as keyof typeof ROTULO_EQUIPAMENTO]}
              </Etiqueta>
            </Link>
            </Cartao>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  const parametros = await searchParams;
  const bruto = Array.isArray(parametros.q) ? parametros.q[0] : parametros.q;
  const validada = validarConsulta(bruto);

  if (!validada.ok) {
    return (
      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-6" />
        <TituloSecao
          como="h1"
          sobretitulo="Busca"
          titulo="O que você procura?"
          descricao={
            validada.motivo === "curta"
              ? "Escreva pelo menos três letras. Com menos que isso, o resultado seria o catálogo inteiro."
              : "Procure por equipamento, marca, modelo — ou descreva o que está acontecendo com o aparelho. A busca entende as duas coisas."
          }
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkBotao href="/loja" variante="secundario" tamanho="sm">
            Ver o catálogo
          </LinkBotao>
          <LinkBotao href="/central-tecnica" variante="secundario" tamanho="sm">
            Central Técnica
          </LinkBotao>
          <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" tamanho="sm">
            Abrir chamado
          </LinkBotao>
        </div>
      </Secao>
    );
  }

  /* O parcelamento sai da configuração da loja, igual ao catálogo: prometer
     12× aqui e 6× na ficha seria mentira de vitrine. */
  const [resultado, s] = await Promise.all([buscarTudo(validada.consulta), getSettings()]);
  const parcelamento: ParcelamentoMarketplace = {
    max: Math.min(12, Math.max(1, Number(s.parcelas_max) || 1)),
    minimoCents: paraCentavos(s.parcela_minima),
  };
  const ordem = ORDEM_POR_INTENCAO[resultado.intencao];

  return (
    <>
      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-6" />
        <TituloSecao
          como="h1"
          sobretitulo="Busca"
          titulo={`Resultados para “${validada.consulta}”`}
          descricao={
            resultado.total > 0
              ? `${resultado.total} ${resultado.total === 1 ? "resultado" : "resultados"} em ${ordem.filter((grupo) => temAlgo(grupo, resultado)).length} ${ordem.filter((grupo) => temAlgo(grupo, resultado)).length === 1 ? "categoria" : "categorias"}.`
              : undefined
          }
        />

        {resultado.total === 0 ? (
          <Vazio
            className="mt-8"
            icone={SearchX}
            titulo="Nada encontrado com esse termo"
            descricao="Tente outra palavra, ou descreva o que está acontecendo com o equipamento. Se for um sintoma, a equipe responde por chamado — sem exigir cadastro."
            acao={
              <div className="flex flex-wrap justify-center gap-2">
                <LinkBotao href="/loja" tamanho="sm" variante="secundario">
                  Ver o catálogo
                </LinkBotao>
                <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="sm">
                  Abrir chamado
                </LinkBotao>
              </div>
            }
          />
        ) : (
          <div className="mt-8 space-y-10">
            {ordem.map((grupo) => (
              <Grupo
                key={grupo}
                grupo={grupo}
                resultado={resultado}
                consulta={validada.consulta}
                parcelamento={parcelamento}
              />
            ))}
          </div>
        )}
      </Secao>

      {/* Quem buscou um sintoma sai daqui com o caminho do atendimento à
          vista, independentemente de ter achado texto ou não. */}
      {resultado.intencao === "problema" || resultado.intencao === "meu_equipamento" ? (
        <Secao fundo="clara" espaco="sm">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-title texto-forte">Prefere falar com a equipe?</h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">
                Descrever o sintoma por escrito costuma resolver mais rápido do que procurar o
                texto certo — e você pode anexar foto ou vídeo.
              </p>
            </div>
            <LinkBotao href="/assistencia-tecnica/solicitar">
              Abrir chamado
              <ArrowRight className="size-4" aria-hidden />
            </LinkBotao>
          </div>
        </Secao>
      ) : null}
    </>
  );
}

function temAlgo(grupo: GrupoDeResultado, resultado: ResultadoUniversal) {
  if (grupo === "produtos") return resultado.produtos.length > 0;
  if (grupo === "conteudo") return resultado.conteudo.length > 0;
  if (grupo === "servicos") return resultado.servicos.length > 0;
  return resultado.meusEquipamentos.length > 0;
}
