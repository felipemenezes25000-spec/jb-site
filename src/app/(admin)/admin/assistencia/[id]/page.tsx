import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ServiceRequestStatus } from "@prisma/client";
import {
  CalendarPlus,
  ClipboardCheck,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  MapPin,
  MonitorCog,
  Phone,
  UserCog,
} from "lucide-react";

import { CabecalhoPagina, Dado, Dados } from "@/components/admin/servico/cabecalho";
import {
  EtiquetaChamado,
  EtiquetaOS,
  EtiquetaOrcamento,
  EtiquetaUrgencia,
} from "@/components/admin/servico/etiquetas";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { Oculto } from "@/components/admin/servico/formulario";
import { ItensDoOrcamento } from "@/components/admin/servico/itens-orcamento";
import { MensagemDoChamado } from "@/components/admin/servico/mensagem-chamado";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { VisitasDoChamado } from "@/components/admin/servico/visitas-do-chamado";
import { LinkBotao } from "@/components/ui/button";
import { CabecalhoCartao, Cartao, LinhaDoTempo, Vazio } from "@/components/ui/data";
import { Marcador } from "@/components/ui/form";
import {
  ROTULO_CHAMADO,
  passosDoChamado,
} from "@/lib/assistencia";
import {
  abrirOrcamentoDoChamado,
  agendarVisitaDoChamado,
  atribuirTecnicoAoChamado,
  criarOrdemDeServico,
  mudarStatusDoChamado,
} from "@/app/acoes/admin-servico";
import {
  formatarDataHora,
  formatarPreco,
  formatarTelefone,
  telHref,
  whatsappHref,
} from "@/lib/format";
import { podeEditar, exigirArea } from "@/lib/permissoes";
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

/**
 * Ficha do chamado de assistência.
 *
 * Tudo que a equipe precisa decidir sobre um atendimento cabe nesta tela: o
 * relato do cliente, o equipamento, as fotos que ele mandou, o histórico e as
 * cinco ações que movem o chamado adiante.
 *
 * A linha do tempo mostra os dois lados. O que é interno aparece marcado como
 * interno — assim ninguém precisa adivinhar se o cliente leu aquele texto.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const chamado = await prisma.serviceRequest.findUnique({
    where: { id },
    select: { number: true },
  });
  return { title: chamado ? `Chamado ${chamado.number}` : "Chamado" };
}

export default async function PaginaChamado({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirArea("assistencia");
  const { id } = await params;

  const chamado = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      category: { select: { name: true } },
      equipment: {
        select: {
          id: true,
          name: true,
          brandName: true,
          modelName: true,
          serialNumber: true,
          status: true,
          warrantyUntil: true,
          location: { select: { name: true } },
          room: true,
        },
      },
      media: {
        orderBy: { order: "asc" },
        select: { id: true, media: { select: { url: true, alt: true, mime: true, filename: true } } },
      },
      events: { orderBy: { createdAt: "desc" } },
      appointments: {
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          status: true,
          addressSummary: true,
          notes: true,
          technician: { select: { id: true, user: { select: { name: true } } } },
        },
      },
      workOrders: {
        orderBy: { openedAt: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          openedAt: true,
          totalCents: true,
          technician: { select: { user: { select: { name: true } } } },
        },
      },
      quotes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          totalCents: true,
          validUntil: true,
        },
      },
    },
  });

  if (!chamado) notFound();

  const editar = podeEditar(usuario, "assistencia");
  const editarOS = podeEditar(usuario, "os");

  const [tecnicos, autores] = await Promise.all([
    prisma.technician.findMany({
      where: { active: true },
      orderBy: { user: { name: "asc" } },
      select: { id: true, user: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: {
        id: {
          in: [...new Set(chamado.events.flatMap((evento) => (evento.userId ? [evento.userId] : [])))],
        },
      },
      select: { id: true, name: true },
    }),
  ]);

  const nomeDoAutor = new Map(autores.map((autor) => [autor.id, autor.name]));

  const endereco = [
    [chamado.addressStreet, chamado.addressNumber].filter(Boolean).join(", "),
    chamado.addressComplement,
    chamado.addressDistrict,
    [chamado.addressCity, chamado.addressState].filter(Boolean).join("/"),
    chamado.addressZip,
  ]
    .filter(Boolean)
    .join(" · ");

  const tecnicoAtual =
    chamado.appointments.find((visita) => visita.technician)?.technician?.id ?? "";

  const equipamentoDescrito =
    chamado.equipment?.name ||
    [chamado.brandName, chamado.modelName].filter(Boolean).join(" ") ||
    "";

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Chamados", href: "/admin/assistencia" },
          { rotulo: chamado.number },
        ]}
        titulo={`Chamado ${chamado.number}`}
        descricao={`Aberto em ${formatarDataHora(chamado.createdAt)}${
          chamado.closedAt ? ` · encerrado em ${formatarDataHora(chamado.closedAt)}` : ""
        }`}
        etiquetas={
          <>
            <EtiquetaChamado status={chamado.status} />
            <EtiquetaUrgencia urgencia={chamado.urgency} />
          </>
        }
        acoes={
          /* A tela que o técnico abre no celular antes de sair. Ela não
             substitui esta: recorta o que importa para a visita e mantém o
             caminho de volta para o histórico completo. */
          <Link
            href={`/admin/assistencia/${chamado.id}/preparo`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-graf-300 bg-white px-3.5 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <ClipboardCheck className="size-4" aria-hidden />
            Preparo da visita
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* =============================================== coluna principal */}
        <div className="space-y-6 lg:col-span-2">
          <Cartao>
            <CabecalhoCartao
              titulo="Solicitação"
              descricao="O que o cliente relatou na abertura"
            />
            <div className="space-y-5 px-5 py-5">
              <Dados>
                <Dado rotulo="Solicitante">
                  {chamado.customer ? (
                    <Link
                      href={`/admin/clientes/${chamado.customer.id}`}
                      className="font-medium text-jb-700 hover:text-jb-500"
                    >
                      {chamado.customer.name}
                    </Link>
                  ) : (
                    <>
                      {chamado.contactName}{" "}
                      <span className="text-apoio text-graf-500">
                        sem conta na Área da Clínica
                      </span>
                    </>
                  )}
                </Dado>
                <Dado rotulo="E-mail">
                  <a
                    href={`mailto:${chamado.contactEmail}`}
                    className="break-all text-jb-700 hover:text-jb-500"
                  >
                    {chamado.contactEmail}
                  </a>
                </Dado>
                <Dado rotulo="Telefone">
                  {chamado.contactPhone ? (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <a href={telHref(chamado.contactPhone)} className="text-jb-700 hover:text-jb-500">
                        {formatarTelefone(chamado.contactPhone)}
                      </a>
                      <a
                        href={whatsappHref(
                          chamado.contactPhone,
                          `Olá! Sobre o chamado ${chamado.number} da JB Soluções Odontológicas.`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-apoio font-semibold text-ok-700 hover:underline"
                      >
                        <Phone className="size-3.5" aria-hidden />
                        WhatsApp
                      </a>
                    </span>
                  ) : null}
                </Dado>
                <Dado rotulo="Tipo de problema">{chamado.problemKind}</Dado>
                <Dado rotulo="Disponibilidade informada">{chamado.availability}</Dado>
                <Dado rotulo="Categoria">{chamado.category?.name}</Dado>
              </Dados>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                  Descrição do problema
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-graf-800">
                  {chamado.description}
                </p>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-graf-500">
                  <MapPin className="size-3.5" aria-hidden />
                  Endereço do atendimento
                </p>
                <p className="mt-1.5 text-sm text-graf-800">
                  {endereco || (
                    <span className="text-graf-500">
                      Sem endereço registrado — confirme com o cliente na triagem.
                    </span>
                  )}
                </p>
              </div>

              {chamado.internalNote ? (
                <div className="rounded-lg bg-graf-50 px-4 py-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-graf-500">
                    <EyeOff className="size-3.5" aria-hidden />
                    Nota interna da abertura
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-graf-700">
                    {chamado.internalNote}
                  </p>
                </div>
              ) : null}
            </div>
          </Cartao>

          {/* ------------------------------------------------ equipamento */}
          <Cartao>
            <CabecalhoCartao
              titulo="Equipamento"
              descricao={
                chamado.equipment
                  ? "Ficha do parque instalado do cliente"
                  : "Informado no formulário, ainda sem ficha no prontuário"
              }
              acao={
                chamado.equipment ? (
                  <LinkBotao
                    href={`/admin/equipamentos/${chamado.equipment.id}`}
                    variante="secundario"
                    tamanho="sm"
                  >
                    <MonitorCog className="size-4" aria-hidden />
                    Abrir prontuário
                  </LinkBotao>
                ) : chamado.customer && podeEditar(usuario, "equipamentos") ? (
                  <LinkBotao
                    href={`/admin/equipamentos/novo?cliente=${chamado.customer.id}`}
                    variante="secundario"
                    tamanho="sm"
                  >
                    Cadastrar no prontuário
                  </LinkBotao>
                ) : undefined
              }
            />
            <div className="px-5 py-5">
              <Dados>
                <Dado rotulo="Equipamento">{equipamentoDescrito}</Dado>
                <Dado rotulo="Marca / modelo">
                  {[
                    chamado.equipment?.brandName || chamado.brandName,
                    chamado.equipment?.modelName || chamado.modelName,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Dado>
                <Dado rotulo="Número de série">
                  {chamado.equipment?.serialNumber || chamado.serialNumber}
                </Dado>
                <Dado rotulo="Local">
                  {[chamado.equipment?.location?.name, chamado.equipment?.room]
                    .filter(Boolean)
                    .join(" · ")}
                </Dado>
              </Dados>
            </div>
          </Cartao>

          {/* ----------------------------------------------------- mídias */}
          <Cartao>
            <CabecalhoCartao
              titulo="Arquivos enviados pelo cliente"
              descricao="Fotos e documentos anexados na abertura do chamado"
            />
            <div className="px-5 py-5">
              {chamado.media.length === 0 ? (
                <p className="text-sm text-graf-500">Nenhum arquivo anexado.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {chamado.media.map((anexo) => (
                    <li key={anexo.id}>
                      <a
                        href={anexo.media.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-lg border border-graf-200 bg-graf-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        {anexo.media.mime.startsWith("image/") ? (
                          <img
                            src={anexo.media.url}
                            alt={anexo.media.alt || "Foto enviada pelo cliente"}
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <span className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 px-2 text-center text-graf-600">
                            <FileText className="size-6" aria-hidden />
                            <span className="line-2 text-apoio font-medium">
                              {anexo.media.filename}
                            </span>
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          {/* ------------------------------------------------- histórico */}
          <Cartao>
            <CabecalhoCartao
              titulo="Histórico"
              descricao="Tudo que aconteceu no chamado, do mais recente ao mais antigo"
            />
            <div className="px-5 py-5">
              {editar ? (
                <div className="mb-6 border-b border-graf-200 pb-6">
                  <MensagemDoChamado chamadoId={chamado.id} />
                </div>
              ) : null}

              {chamado.events.length === 0 ? (
                <p className="text-sm text-graf-500">Nenhum registro ainda.</p>
              ) : (
                <ol className="space-y-4">
                  {chamado.events.map((evento) => (
                    <li key={evento.id} className="flex gap-3">
                      <span
                        aria-hidden
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          evento.visibleToCustomer ? "bg-jb-500" : "bg-graf-300"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-graf-900">
                            {evento.title}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-apoio font-semibold ${
                              evento.visibleToCustomer
                                ? "bg-jb-50 text-jb-700"
                                : "bg-graf-100 text-graf-600"
                            }`}
                          >
                            {evento.visibleToCustomer ? (
                              <Eye className="size-3" aria-hidden />
                            ) : (
                              <EyeOff className="size-3" aria-hidden />
                            )}
                            {evento.visibleToCustomer ? "Visível ao cliente" : "Interno"}
                          </span>
                        </p>
                        {evento.message ? (
                          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-graf-700">
                            {evento.message}
                          </p>
                        ) : null}
                        <p className="mt-1 text-apoio text-graf-500">
                          {formatarDataHora(evento.createdAt)}
                          {evento.userId && nomeDoAutor.get(evento.userId)
                            ? ` · ${nomeDoAutor.get(evento.userId)}`
                            : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Cartao>
        </div>

        {/* ======================================================== ações */}
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao titulo="Ações" descricao="O que move este chamado" />
            <div className="flex flex-col gap-2 px-5 py-5">
              {editar ? (
                <>
                  <PainelAcao
                    rotulo="Mudar status"
                    tamanho="md"
                    larguraTotal
                    titulo="Mudar o status do chamado"
                    descricao="O cliente é avisado quando a mudança é visível para ele."
                    acao={mudarStatusDoChamado}
                    rotuloConfirmar="Gravar status"
                  >
                    <Oculto nome="chamadoId" valor={chamado.id} />
                    <SelecaoAcao rotulo="Novo status" name="status" defaultValue={chamado.status} required>
                      {(Object.keys(ROTULO_CHAMADO) as ServiceRequestStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {ROTULO_CHAMADO[status]}
                        </option>
                      ))}
                    </SelecaoAcao>
                    <AreaAcao
                      rotulo="Observação"
                      name="nota"
                      rows={3}
                      ajuda="Entra na linha do tempo junto com a mudança."
                    />
                    <Marcador
                      name="visivel"
                      defaultChecked
                      rotulo="Mostrar ao cliente"
                      ajuda="Desmarque para mover o chamado sem avisar quem abriu."
                    />
                  </PainelAcao>

                  <PainelAcao
                    rotulo="Atribuir técnico"
                    icone={<UserCog className="size-4" aria-hidden />}
                    tamanho="md"
                    larguraTotal
                    titulo="Técnico responsável"
                    descricao="O técnico é carimbado nas visitas e ordens de serviço em aberto deste chamado."
                    acao={atribuirTecnicoAoChamado}
                    rotuloConfirmar="Atribuir"
                  >
                    <>
                      <Oculto nome="chamadoId" valor={chamado.id} />
                      <SelecaoAcao
                        rotulo="Técnico"
                        name="tecnicoId"
                        defaultValue={tecnicoAtual}
                        ajuda="Precisa existir uma visita agendada ou uma OS aberta para receber o técnico."
                      >
                        <option value="">Sem técnico definido</option>
                        {tecnicos.map((tecnico) => (
                          <option key={tecnico.id} value={tecnico.id}>
                            {tecnico.user.name}
                          </option>
                        ))}
                      </SelecaoAcao>
                      <AreaAcao rotulo="Observação interna" name="nota" rows={2} />
                    </>
                  </PainelAcao>

                  <PainelAcao
                    rotulo="Agendar visita"
                    icone={<CalendarPlus className="size-4" aria-hidden />}
                    tamanho="md"
                    larguraTotal
                    titulo="Agendar visita técnica"
                    descricao="O chamado passa para “visita agendada” e o cliente recebe o aviso."
                    acao={agendarVisitaDoChamado}
                    rotuloConfirmar="Agendar"
                  >
                    <>
                      <Oculto nome="chamadoId" valor={chamado.id} />
                      <CampoAcao
                        rotulo="Início"
                        name="inicio"
                        type="datetime-local"
                        required
                        ajuda="Horário de Brasília."
                      />
                      <CampoAcao
                        rotulo="Término previsto"
                        name="fim"
                        type="datetime-local"
                      />
                      <SelecaoAcao rotulo="Técnico" name="tecnicoId" defaultValue={tecnicoAtual}>
                        <option value="">Definir depois</option>
                        {tecnicos.map((tecnico) => (
                          <option key={tecnico.id} value={tecnico.id}>
                            {tecnico.user.name}
                          </option>
                        ))}
                      </SelecaoAcao>
                      <CampoAcao
                        rotulo="Título da visita"
                        name="titulo"
                        maxLength={180}
                        placeholder={`Visita técnica — chamado ${chamado.number}`}
                      />
                      <AreaAcao
                        rotulo="Observações para o técnico"
                        name="observacoes"
                        rows={3}
                        ajuda="Uso interno. O cliente não vê este texto — para falar com ele, use a mensagem do chamado."
                      />
                    </>
                  </PainelAcao>
                </>
              ) : null}

              {editarOS ? (
                <PainelAcao
                  rotulo="Abrir ordem de serviço"
                  icone={<ClipboardList className="size-4" aria-hidden />}
                  tamanho="md"
                  larguraTotal
                  titulo="Abrir OS a partir deste chamado"
                  descricao="A OS herda equipamento e relato, e o chamado passa para diagnóstico."
                  acao={criarOrdemDeServico}
                  rotuloConfirmar="Abrir OS"
                >
                  <>
                    <Oculto nome="chamadoId" valor={chamado.id} />
                    <SelecaoAcao rotulo="Técnico" name="tecnicoId" defaultValue={tecnicoAtual}>
                      <option value="">Definir depois</option>
                      {tecnicos.map((tecnico) => (
                        <option key={tecnico.id} value={tecnico.id}>
                          {tecnico.user.name}
                        </option>
                      ))}
                    </SelecaoAcao>
                    <AreaAcao
                      rotulo="Defeito relatado"
                      name="defeitoRelatado"
                      rows={3}
                      defaultValue={chamado.description}
                      ajuda="Vem do chamado. Ajuste se a triagem mudou o entendimento."
                    />
                    <CampoAcao
                      rotulo="Garantia do serviço (dias)"
                      name="garantiaDias"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                    />
                  </>
                </PainelAcao>
              ) : null}

              {editar ? (
                <PainelAcao
                  rotulo="Abrir orçamento"
                  icone={<FileText className="size-4" aria-hidden />}
                  tamanho="md"
                  larguraTotal
                  titulo="Montar proposta técnica"
                  descricao="Nasce em rascunho na área de Orçamentos, para revisão antes do envio."
                  acao={abrirOrcamentoDoChamado}
                  rotuloConfirmar="Criar rascunho"
                  tamanhoPainel="lg"
                >
                  <>
                    <Oculto nome="chamadoId" valor={chamado.id} />
                    <ItensDoOrcamento
                      sugestao={equipamentoDescrito ? `Reparo — ${equipamentoDescrito}` : ""}
                    />
                    <CampoAcao
                      rotulo="Validade (dias)"
                      name="validadeDias"
                      type="number"
                      min={0}
                      max={365}
                      step={1}
                      defaultValue={15}
                      inputMode="numeric"
                    />
                    <AreaAcao
                      rotulo="Mensagem para o cliente"
                      name="mensagem"
                      rows={3}
                      ajuda="Aparece no corpo da proposta."
                    />
                    <AreaAcao rotulo="Condições" name="condicoes" rows={2} />
                  </>
                </PainelAcao>
              ) : null}

              {!editar && !editarOS ? (
                <p className="text-sm text-graf-500">
                  Seu acesso a este chamado é apenas de consulta.
                </p>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Etapa do atendimento" descricao="Como o cliente enxerga" />
            <div className="px-5 py-5">
              <LinhaDoTempo passos={passosDoChamado(chamado)} />
            </div>
          </Cartao>

          {/* --------------------------------------------------- visitas */}
          {/* Lista com os gestos ao lado de cada linha: remarcar MOVE o
              agendamento existente em vez de criar um segundo. */}
          <VisitasDoChamado
            visitas={chamado.appointments}
            tecnicos={tecnicos.map((tecnico) => ({ id: tecnico.id, nome: tecnico.user.name }))}
            editar={editar}
          />

          {/* -------------------------------------------------------- OS */}
          <Cartao>
            <CabecalhoCartao titulo="Ordens de serviço" descricao="Execução ligada a este chamado" />
            <div className="px-5 py-5">
              {chamado.workOrders.length === 0 ? (
                <Vazio
                  titulo="Nenhuma OS aberta"
                  descricao="A OS registra peças, mão de obra, checklist e laudo do reparo."
                  className="border-graf-200 bg-transparent py-6"
                />
              ) : (
                <ul className="space-y-2">
                  {chamado.workOrders.map((ordem) => (
                    <li key={ordem.id}>
                      <Link
                        href={`/admin/os/${ordem.id}`}
                        className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-graf-200 px-3 py-2.5 transition-colors hover:border-graf-300 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        <span className="label-mono text-graf-600">{ordem.number}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-graf-700">
                          {ordem.technician?.user.name ?? "Sem técnico"}
                        </span>
                        <span className="tabular text-sm font-semibold text-graf-900">
                          {formatarPreco(ordem.totalCents)}
                        </span>
                        <EtiquetaOS status={ordem.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Cartao>

          {/* ------------------------------------------------- orçamentos */}
          {chamado.quotes.length > 0 ? (
            <Cartao>
              <CabecalhoCartao titulo="Orçamentos" descricao="Propostas geradas neste chamado" />
              <div className="px-5 py-5">
                <ul className="space-y-2">
                  {chamado.quotes.map((orcamento) => (
                    <li key={orcamento.id}>
                      <Link
                        href={`/admin/orcamentos/${orcamento.id}`}
                        className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-graf-200 px-3 py-2.5 transition-colors hover:border-graf-300 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                      >
                        <span className="label-mono text-graf-600">{orcamento.number}</span>
                        <span className="tabular min-w-0 flex-1 text-sm font-semibold text-graf-900">
                          {formatarPreco(orcamento.totalCents)}
                        </span>
                        <EtiquetaOrcamento status={orcamento.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Cartao>
          ) : null}
        </div>
      </div>
    </div>
  );
}
