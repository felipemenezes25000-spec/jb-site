import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";

import { atualizarLead, converterLeadEmCliente } from "@/app/acoes/admin-conteudo";
import { BotaoAcao } from "@/components/admin/conteudo/botao-acao";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { BotaoConverterLead, FormularioLead } from "@/components/admin/conteudo/painel-lead";
import { rotuloLead, tomLead } from "@/components/admin/conteudo/rotulos";
import { Aviso } from "@/components/ui/aviso";
import { Cartao, CabecalhoCartao, Etiqueta } from "@/components/ui/data";
import { formatarCep, formatarDataHora, formatarTelefone, telHref, whatsappHref } from "@/lib/format";
import { exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id }, select: { nome: true } });
  return { title: lead ? `${lead.nome || "Lead"} · Leads` : "Lead" };
}

export default async function PaginaDetalheDoLead({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("leads");
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  const podeEscrever = podeEditar(usuario, "leads");
  const telefone = lead.telefone.trim();
  const endereco = [
    lead.endereco,
    lead.bairro,
    [lead.cidade, lead.estado].filter(Boolean).join("/"),
    lead.cep ? `CEP ${formatarCep(lead.cep)}` : "",
  ]
    .filter(Boolean)
    .join(" — ");

  /** O mesmo e-mail já pode ter virado cliente antes. */
  const clienteExistente = lead.email
    ? await prisma.customer.findUnique({
        where: { email: lead.email.trim().toLowerCase() },
        select: { id: true, name: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Leads", href: "/admin/leads" }, { rotulo: lead.nome || "Contato" }]}
        titulo={lead.nome || "Contato sem nome"}
        descricao={`Recebido em ${formatarDataHora(lead.createdAt)}`}
        etiqueta={
          <Etiqueta tom={tomLead(lead.status)} ponto>
            {rotuloLead(lead.status)}
          </Etiqueta>
        }
        acoes={
          podeEscrever && lead.status !== "atendido" && lead.status !== "convertido" ? (
            // atalho de um clique; `notas` viaja junto porque a ação grava os
            // dois campos e um valor ausente apagaria as anotações
            <BotaoAcao
              acao={atualizarLead}
              valores={{ id: lead.id, status: "atendido", notas: lead.notas }}
              rotulo="Marcar como atendido"
              variante="secundario"
              icone={<CheckCircle2 className="size-4" aria-hidden />}
            />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="space-y-5">
          <Cartao>
            <CabecalhoCartao
              titulo="Mensagem enviada"
              descricao="Texto exatamente como veio do formulário do site."
            />
            <div className="px-5 py-4">
              {lead.obs.trim() ? (
                <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-graf-700">
                  {lead.obs}
                </p>
              ) : (
                <p className="text-sm text-graf-500">
                  O formulário foi enviado sem mensagem — só com os dados de contato.
                </p>
              )}
            </div>
          </Cartao>

          {podeEscrever ? (
            <FormularioLead
              acao={atualizarLead}
              id={lead.id}
              status={lead.status}
              notas={lead.notas}
            />
          ) : (
            <Cartao>
              <CabecalhoCartao titulo="Atendimento" descricao="Seu acesso a este lead é apenas de consulta." />
              <div className="px-5 py-4">
                <p className="text-sm text-graf-500">
                  Situação: <span className="font-medium text-graf-800">{rotuloLead(lead.status)}</span>
                </p>
                {lead.notas.trim() ? (
                  <p className="mt-3 whitespace-pre-line text-sm text-graf-700">{lead.notas}</p>
                ) : (
                  <p className="mt-3 text-sm text-graf-500">Ninguém anotou nada sobre este contato ainda.</p>
                )}
              </div>
            </Cartao>
          )}
        </div>

        <div className="space-y-5">
          <Cartao>
            <CabecalhoCartao titulo="Contato" />
            <ul className="divide-y divide-graf-100">
              <li className="flex items-start gap-3 px-5 py-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] text-graf-500">E-mail</span>
                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="block break-all text-sm font-medium text-jb-700 underline underline-offset-2"
                    >
                      {lead.email}
                    </a>
                  ) : (
                    <span className="block text-sm text-graf-500">Não informado</span>
                  )}
                </span>
              </li>

              <li className="flex items-start gap-3 px-5 py-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] text-graf-500">Telefone</span>
                  {telefone ? (
                    <>
                      <a
                        href={telHref(telefone)}
                        className="block text-sm font-medium text-jb-700 underline underline-offset-2"
                      >
                        {formatarTelefone(telefone)}
                      </a>
                      <a
                        href={whatsappHref(telefone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-11 items-center text-[0.8125rem] font-semibold text-graf-600 underline underline-offset-2 hover:text-jb-700"
                      >
                        Abrir no WhatsApp
                      </a>
                    </>
                  ) : (
                    <span className="block text-sm text-graf-500">Não informado</span>
                  )}
                </span>
              </li>

              <li className="flex items-start gap-3 px-5 py-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[0.8125rem] text-graf-500">Endereço</span>
                  <span className="block text-sm text-graf-800">
                    {endereco || "Não informado"}
                  </span>
                </span>
              </li>

              <li className="px-5 py-3">
                <span className="block text-[0.8125rem] text-graf-500">Aceita novidades por e-mail</span>
                <span className="block text-sm text-graf-800">{lead.news ? "Sim" : "Não"}</span>
              </li>
            </ul>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Virar cliente"
              descricao="Cria o cadastro com estes dados, sem senha — a pessoa define a dela pela recuperação."
            />
            <div className="space-y-3 px-5 py-4">
              {clienteExistente ? (
                <Aviso tom="info" titulo="Já existe cliente com este e-mail">
                  {clienteExistente.name} usa {lead.email}. Criar de novo não é possível: o
                  e-mail do cliente é único.
                </Aviso>
              ) : null}

              {podeEscrever ? (
                <BotaoConverterLead
                  acao={converterLeadEmCliente}
                  id={lead.id}
                  jaConvertido={lead.status === "convertido"}
                />
              ) : (
                <p className="text-sm text-graf-500">
                  Seu acesso aos leads é apenas de consulta.
                </p>
              )}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Origem" descricao="Registrado no envio do formulário." />
            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-2 px-5 py-4 text-sm">
              {lead.ip ? (
                <>
                  <dt className="text-graf-500">Origem do envio</dt>
                  <dd className="break-all text-graf-800">{lead.ip}</dd>
                </>
              ) : null}
              {lead.userAgent ? (
                <>
                  <dt className="text-graf-500">Aparelho</dt>
                  <dd className="break-words text-[0.8125rem] text-graf-600">{lead.userAgent}</dd>
                </>
              ) : null}
              <dt className="text-graf-500">Atualizado</dt>
              <dd className="text-graf-800">{formatarDataHora(lead.updatedAt)}</dd>
            </dl>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
