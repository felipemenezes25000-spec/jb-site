import type { Metadata } from "next";
import { Ban, MessageSquare, Send, Star, Upload, X } from "lucide-react";

import {
  cancelarConvite,
  despublicarDepoimento,
  dispararConvite,
  publicarDepoimento,
} from "@/app/acoes/admin-avaliacoes";
import { BotaoAcao } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { BotaoGerarConvites } from "@/components/admin/avaliacoes/botao-gerar";
import { Aviso } from "@/components/ui/aviso";
import { Cartao, Etiqueta, Vazio } from "@/components/ui/data";
import { CartaoMetrica, GradeMetricas } from "@/components/ui/metrica";
import { satisfacaoInterna } from "@/lib/avaliacoes";
import { formatarDataHora } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { getSettings, ligado } from "@/lib/settings";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export const metadata: Metadata = { title: "Avaliações" };

const ROTULO_STATUS: Record<string, string> = {
  rascunho: "Em rascunho",
  enviado: "Enviado",
  respondido: "Respondido",
  cancelado: "Cancelado",
  falhou: "Falhou",
};

const TOM_STATUS: Record<string, "ok" | "andamento" | "aguardando" | "neutro" | "alerta"> = {
  rascunho: "andamento",
  enviado: "aguardando",
  respondido: "ok",
  cancelado: "neutro",
  falhou: "alerta",
};

export default async function PaginaAvaliacoes() {
  const usuario = await exigirArea("avaliacoes");
  const podeEscrever = podeEditar(usuario, "avaliacoes");

  const [s, convites, respostas] = await Promise.all([
    getSettings(),
    prisma.reviewRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        kind: true,
        status: true,
        createdAt: true,
        sentAt: true,
        failureReason: true,
        customer: { select: { name: true, email: true } },
        order: { select: { number: true } },
        workOrder: { select: { number: true } },
        review: { select: { id: true } },
      },
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        score: true,
        nps: true,
        comment: true,
        publicConsent: true,
        publishedAt: true,
        displayName: true,
        createdAt: true,
        request: {
          select: {
            kind: true,
            customer: { select: { name: true } },
            order: { select: { number: true } },
            workOrder: { select: { number: true } },
          },
        },
      },
    }),
  ]);

  const envioLigado = ligado(s.avaliacoes_envio);
  const satisfacao = satisfacaoInterna(respostas.map((resposta) => resposta.score));
  const emRascunho = convites.filter((convite) => convite.status === "rascunho").length;

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Conteúdo", href: "/admin/conteudo" }, { rotulo: "Avaliações" }]}
        titulo="Avaliações"
        descricao="Convites, respostas e os depoimentos que o cliente autorizou publicar."
        acoes={podeEscrever ? <BotaoGerarConvites /> : undefined}
      />

      {/* ------------------------------------------------- o portão --- */}
      <Aviso
        tom={envioLigado ? "info" : "atencao"}
        titulo={envioLigado ? "Envio ligado" : "Envio desligado — modo de teste"}
      >
        {envioLigado ? (
          <>
            Os convites saem por e-mail quando você clicar em enviar. Só o clique dispara: nada é
            enviado automaticamente.
          </>
        ) : (
          <>
            A fila é montada normalmente e <strong>ninguém recebe e-mail</strong>. Para começar a
            enviar, ligue &ldquo;Enviar convites de avaliação&rdquo; em Configurações ›
            Avaliações. Enquanto isso, dá para conferir a fila inteira sem risco.
          </>
        )}
      </Aviso>

      <GradeMetricas>
        <CartaoMetrica
          rotulo="Convites em rascunho"
          valor={emRascunho}
          unidade={emRascunho === 1 ? "esperando envio" : "esperando envio"}
          icone={Send}
          tom={emRascunho > 0 ? "info" : "neutro"}
          detalhe={
            envioLigado
              ? "Prontos para enviar."
              : "Não saem enquanto o envio estiver desligado."
          }
        />
        <CartaoMetrica
          rotulo="Respostas"
          valor={respostas.length}
          unidade="recebidas"
          icone={MessageSquare}
          tom={respostas.length > 0 ? "marca" : "neutro"}
        />
        <CartaoMetrica
          rotulo="Satisfação interna"
          valor={satisfacao.calculavel ? satisfacao.media.toLocaleString("pt-BR") : "—"}
          unidade={satisfacao.calculavel ? `de 5, em ${satisfacao.respostas} respostas` : ""}
          icone={Star}
          tom="neutro"
          /* Poucas respostas não viram média. O texto abaixo diz por quê, em
             vez de mostrar um número que descreveria o acaso. */
          detalhe={satisfacao.calculavel ? "Uso interno. Não é publicado." : satisfacao.motivo}
        />
      </GradeMetricas>

      {/* -------------------------------------------------- a fila --- */}
      <section aria-labelledby="fila">
        <h2 id="fila" className="text-title texto-forte">
          Fila de convites
        </h2>

        {convites.length === 0 ? (
          <Vazio
            className="mt-4"
            icone={Send}
            titulo="Nenhum convite ainda"
            descricao="Gere a fila para ver o que está elegível. Gerar não envia nada."
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {convites.map((convite) => (
              <Cartao key={convite.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-corpo font-semibold text-graf-950">
                      {convite.customer.name}
                    </p>
                    <p className="mt-0.5 text-apoio text-graf-500">
                      {convite.kind === "compra" ? "Pedido" : "Atendimento"}{" "}
                      {convite.order?.number ?? convite.workOrder?.number ?? "—"} · criado em{" "}
                      {formatarDataHora(convite.createdAt)}
                      {convite.sentAt ? ` · enviado em ${formatarDataHora(convite.sentAt)}` : ""}
                    </p>
                    {convite.failureReason ? (
                      <p className="mt-1 text-apoio text-jb-700">{convite.failureReason}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Etiqueta tom={TOM_STATUS[convite.status] ?? "neutro"}>
                      {ROTULO_STATUS[convite.status] ?? convite.status}
                    </Etiqueta>

                    {podeEscrever && convite.status === "rascunho" ? (
                      <>
                        <BotaoAcao
                          acao={dispararConvite}
                          valores={{ id: convite.id }}
                          rotulo="Enviar"
                          icone={<Send className="size-4" aria-hidden />}
                          desabilitado={!envioLigado}
                        />
                        <BotaoAcao
                          acao={cancelarConvite}
                          valores={{ id: convite.id }}
                          rotulo="Cancelar"
                          variante="perigo"
                          icone={<Ban className="size-4" aria-hidden />}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              </Cartao>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------------------------------------- as respostas --- */}
      <section aria-labelledby="respostas">
        <h2 id="respostas" className="text-title texto-forte">
          Respostas
        </h2>
        <p className="mt-1 text-corpo leading-relaxed text-graf-600">
          Toda resposta é feedback interno. Só vira depoimento no site quem autorizou — e a nota
          não entra na decisão de publicar: uma crítica autorizada é publicável.
        </p>

        {respostas.length === 0 ? (
          <Vazio
            className="mt-4"
            icone={MessageSquare}
            titulo="Nenhuma resposta ainda"
            descricao="As respostas aparecem aqui assim que os convites forem enviados e respondidos."
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {respostas.map((resposta) => (
              <Cartao key={resposta.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="tabular text-lg font-extrabold text-graf-950">
                        {resposta.score}/5
                      </span>
                      {resposta.nps !== null ? (
                        <span className="text-apoio text-graf-500">
                          NPS {resposta.nps}
                        </span>
                      ) : null}
                      <span className="text-apoio text-graf-500">
                        {resposta.request.customer.name} ·{" "}
                        {resposta.request.order?.number ??
                          resposta.request.workOrder?.number ??
                          "—"}
                      </span>
                    </p>

                    {resposta.comment ? (
                      <p className="mt-2 text-corpo leading-relaxed text-graf-700">
                        {resposta.comment}
                      </p>
                    ) : (
                      <p className="mt-2 text-[0.875rem] italic text-graf-500">
                        Respondeu sem comentário.
                      </p>
                    )}

                    <p className="mt-2 text-apoio text-graf-500">
                      {resposta.publicConsent
                        ? `Autorizou publicar${resposta.displayName ? `, como "${resposta.displayName}"` : ", sem identificação"}.`
                        : "Não autorizou uso público. Fica só aqui."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {resposta.publishedAt ? (
                      <Etiqueta tom="ok">No site</Etiqueta>
                    ) : resposta.publicConsent ? (
                      <Etiqueta tom="aguardando">Aguardando curadoria</Etiqueta>
                    ) : (
                      <Etiqueta tom="neutro">Interno</Etiqueta>
                    )}

                    {podeEscrever && resposta.publicConsent ? (
                      resposta.publishedAt ? (
                        <BotaoAcao
                          acao={despublicarDepoimento}
                          valores={{ id: resposta.id }}
                          rotulo="Retirar do site"
                          variante="perigo"
                          icone={<X className="size-4" aria-hidden />}
                        />
                      ) : (
                        <BotaoAcao
                          acao={publicarDepoimento}
                          valores={{ id: resposta.id }}
                          rotulo="Publicar"
                          icone={<Upload className="size-4" aria-hidden />}
                        />
                      )
                    ) : null}
                  </div>
                </div>
              </Cartao>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
