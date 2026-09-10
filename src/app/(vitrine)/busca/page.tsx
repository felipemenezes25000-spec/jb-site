import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, SearchX, Stethoscope, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Etiqueta, TituloSecao, Trilha, Vazio } from "@/components/ui/data";
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

export const instant = false;

export const metadata: Metadata = {
  ...metadataDePagina({
    titulo: "Busca",
    descricao: "Produtos, conteúdo técnico, serviços e equipamentos da sua clínica em uma única busca.",
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
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1.5 border-b border-graf-200 pb-3">
      <h2 id={`g-${grupo}`} className="text-xl font-extrabold tracking-[-0.02em] text-graf-950">
        {ROTULO_DO_GRUPO[grupo]}
        <span className="tabular ml-2 text-sm font-semibold text-graf-500">{quantidade}</span>
      </h2>
      <p className="max-w-xl text-[0.8125rem] leading-5 text-graf-500">
        {porQueEsteGrupo(grupo, intencao)}
      </p>
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
  consulta: string;
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
            className="foco-jb inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-jb-700 underline-offset-4 hover:underline"
          >
            Ver no catálogo com filtros
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
        <ul className="divide-y divide-graf-150">
          {resultado.conteudo.map((artigo) => (
            <li key={artigo.slug}>
              <Link
                href={`/central-tecnica/${artigo.slug}`}
                className="foco-jb flex min-h-16 items-start gap-3.5 rounded-lg px-1 py-4 transition-colors hover:bg-graf-50 sm:px-3"
              >
                <BookOpen className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-bold text-graf-950">
                    {artigo.titulo}
                  </span>
                  {artigo.chamada ? (
                    <span className="mt-0.5 block text-[0.8125rem] leading-5 text-graf-600">
                      {artigo.chamada}
                    </span>
                  ) : null}
                </span>
              </Link>
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
        <ul className="divide-y divide-graf-150">
          {resultado.servicos.map((servico) => (
            <li key={servico.href}>
              <Link
                href={servico.href}
                className="foco-jb flex min-h-16 items-start gap-3.5 rounded-lg px-1 py-4 transition-colors hover:bg-graf-50 sm:px-3"
              >
                <Wrench className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-bold text-graf-950">
                    {servico.titulo}
                  </span>
                  {servico.descricao ? (
                    <span className="mt-0.5 block text-[0.8125rem] leading-5 text-graf-600">
                      {servico.descricao}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (resultado.meusEquipamentos.length === 0) return null;

  return (
    <section aria-labelledby="g-meus_equipamentos">
      <CabecalhoDoGrupo
        grupo={grupo}
        intencao={resultado.intencao}
        quantidade={resultado.meusEquipamentos.length}
      />
      <ul className="divide-y divide-graf-150">
        {resultado.meusEquipamentos.map((equipamento) => (
          <li key={equipamento.id}>
            <Link
              href={`/minha-jb/equipamentos/${equipamento.id}`}
              className="foco-jb flex min-h-16 items-center justify-between gap-4 rounded-lg px-1 py-4 transition-colors hover:bg-graf-50 sm:px-3"
            >
              <span className="flex min-w-0 items-start gap-3.5">
                <Stethoscope className="mt-0.5 size-4 shrink-0 text-jb-600" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-bold text-graf-950">
                    {equipamento.nome}
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] text-graf-600">
                    {[equipamento.marca, equipamento.modelo].filter(Boolean).join(" ") ||
                      "Marca e modelo não cadastrados"}
                  </span>
                </span>
              </span>
              <Etiqueta tom={equipamento.situacao === "operacional" ? "ok" : "alerta"}>
                {ROTULO_EQUIPAMENTO[equipamento.situacao as keyof typeof ROTULO_EQUIPAMENTO]}
              </Etiqueta>
            </Link>
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
        <Trilha itens={TRILHA} className="mb-5" />
        <TituloSecao
          como="h1"
          sobretitulo="Busca"
          titulo="O que você procura?"
          descricao={
            validada.motivo === "curta"
              ? "Escreva pelo menos três letras para encontrar resultados úteis."
              : "Procure por produto, marca ou modelo. Para assistência técnica, você também pode descrever o sintoma do equipamento."
          }
        />
        <div className="mt-6 flex flex-wrap gap-2.5">
          <LinkBotao href="/loja" variante="secundario" tamanho="sm">
            Ver catálogo
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

  const [resultado, s] = await Promise.all([buscarTudo(validada.consulta), getSettings()]);
  const parcelamento: ParcelamentoMarketplace = {
    max: Math.min(12, Math.max(1, Number(s.parcelas_max) || 1)),
    minimoCents: paraCentavos(s.parcela_minima),
  };
  const ordem = ORDEM_POR_INTENCAO[resultado.intencao];
  const gruposComResultado = ordem.filter((grupo) => temAlgo(grupo, resultado)).length;

  return (
    <>
      <Secao espaco="sm">
        <Trilha itens={TRILHA} className="mb-5" />
        <TituloSecao
          como="h1"
          sobretitulo="Busca"
          titulo={`Resultados para “${validada.consulta}”`}
          descricao={
            resultado.total > 0
              ? `${resultado.total} ${resultado.total === 1 ? "resultado" : "resultados"} em ${gruposComResultado} ${gruposComResultado === 1 ? "categoria" : "categorias"}.`
              : undefined
          }
        />

        {resultado.total === 0 ? (
          <Vazio
            className="mt-7"
            icone={SearchX}
            titulo="Nada encontrado com esse termo"
            descricao="Tente outro nome, marca ou modelo. Se você estiver descrevendo um problema de um equipamento, a equipe técnica também pode ajudar por chamado."
            acao={
              <div className="flex flex-wrap justify-center gap-2">
                <LinkBotao href="/loja" tamanho="sm" variante="secundario">
                  Ver catálogo
                </LinkBotao>
                <LinkBotao href="/assistencia-tecnica/solicitar" tamanho="sm">
                  Abrir chamado
                </LinkBotao>
              </div>
            }
          />
        ) : (
          <div className="mt-7 space-y-9 lg:space-y-11">
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

      {resultado.intencao === "problema" || resultado.intencao === "meu_equipamento" ? (
        <Secao fundo="clara" espaco="sm">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-xl">
              <h2 className="text-xl font-extrabold tracking-[-0.02em] text-graf-950">
                Precisa de ajuda técnica?
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-graf-600">
                Envie o sintoma e, se quiser, uma foto ou vídeo. A equipe recebe o contexto sem você precisar procurar o artigo certo.
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
