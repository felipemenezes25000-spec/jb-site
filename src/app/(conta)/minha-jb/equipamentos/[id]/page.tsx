import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProductCondition } from "@prisma/client";
import {
  CalendarClock,
  CalendarCheck,
  FileText,
  History,
  LifeBuoy,
  Pencil,
  ClipboardCheck,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Destaques, type Destaque } from "@/components/conta/mj-destaques";
import { Historico } from "@/components/conta/mj-historico";
import { ListaDeDocumentos } from "@/components/conta/mj-lista-documentos";
import { Topo } from "@/components/conta/mj-topo";
import { ResultadoDoChecklist } from "@/components/loja/produto/unidade-fisica";
import { SpecGroup } from "@/components/specs/spec-sheet";
import { Aviso } from "@/components/ui/aviso";
import { LinkBotao } from "@/components/ui/button";
import { Cartao, CabecalhoCartao, Etiqueta, type Tom } from "@/components/ui/data";
import { construirFicha } from "@/domain/specs/construir";
import { normalizarTensao } from "@/domain/specs/formatar";
import { ROTULO_CHAMADO, STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { exigirCliente } from "@/lib/auth-cliente";
import {
  ROTULO_EQUIPAMENTO,
  ROTULO_ORIGEM,
  historicoDoEquipamento,
} from "@/lib/equipamento";
import { SELECT_FICHA, paraFicha } from "@/lib/ficha-do-produto";
import { distanciaEmDias, formatarData, plural } from "@/lib/format";
import { ROTULO_CONTRATO, ROTULO_VISITA, STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { ROTULO_OS } from "@/lib/os";
import { IndiceDoEquipamento } from "@/components/conta/mj-indicadores";
import { indiceDeManutencao } from "@/lib/indicadores";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Prontuário do equipamento",
  robots: { index: false, follow: false },
};

const TOM_STATUS: Record<string, Tom> = {
  operacional: "ok",
  em_manutencao: "andamento",
  aguardando_peca: "aguardando",
  inoperante: "alerta",
  desativado: "neutro",
};

const ROTULO_CONDICAO: Record<ProductCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  usado: "Usado",
  recondicionado: "Recondicionado",
};

type Params = Promise<{ id: string }>;

/* ============================================================================
   O prontuário é uma VIEW da ficha do produto, não uma cópia dela

   Esta página tinha a própria lista de campos, digitada à mão: `Marca e
   modelo`, `Voltagem`, `Condição`. O resultado medido na auditoria foi
   "Voltagem: 220" — sem unidade — e "Marca e modelo: Cristófoli" — sem modelo
   — enquanto a página do MESMO produto, dois cliques adiante, dizia "Bivolt
   (110/220 V)", trazia capacidade, bandejas e ciclo, e tinha o laudo de
   inspeção da unidade. A clínica que comprou o equipamento via menos sobre ele
   do que quem ainda não comprou.

   A separação que esta página passa a fazer, e que é a regra:

   · **A ficha técnica pertence ao MODELO.** Ela é herdada por referência, via
     `productId`, e renderizada com o mesmo `SpecGroup` da PDP. Nada é digitado
     de novo aqui: se o cadastro do produto ganhar uma especificação, ela
     aparece no prontuário no mesmo deploy.

   · **Esta unidade tem os fatos dela.** Série, onde fica, quando chegou, até
     quando tem garantia, o que a clínica anotou. Isso não existe no produto e
     não pode ser herdado de lugar nenhum.

   · **O laudo de inspeção pertence à unidade física.** Ele vivia só na
     vitrine, onde some quando a unidade é vendida — exatamente quando ele
     passa a interessar mais, porque agora é o registro do aparelho que está na
     sala da clínica.

   · **Sem produto de origem, a ficha não some.** Equipamento cadastrado pela
     própria clínica não tem `productId`; a ficha é montada dos campos dele
     pelo MESMO `construirFicha`, para que "220" continue lendo "220 V".
   ============================================================================ */

/**
 * Uma linha da ficha. Só é chamada quando existe valor — campo sem dado não
 * vira travessão repetido: ele some, e a ficha fica do tamanho do que se sabe.
 */
function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] gap-x-4 gap-y-1 py-2.5">
      <dt className="text-sm text-graf-500">{rotulo}</dt>
      <dd className="min-w-0 text-sm text-graf-900">{valor}</dd>
    </div>
  );
}

function tomDoChamado(status: string) {
  if (status === "concluido") return "ok" as const;
  if (status === "cancelado") return "neutro" as const;
  if (status === "aguardando_cliente" || status === "aguardando_aprovacao") {
    return "aguardando" as const;
  }
  return "andamento" as const;
}

export default async function EquipamentoPage({ params }: { params: Params }) {
  const [cliente, { id }] = await Promise.all([
    exigirCliente("/minha-jb/equipamentos"),
    params,
  ]);

  const equipamento = await prisma.equipment.findFirst({
    where: { id, customerId: cliente.id },
    include: {
      category: { select: { name: true, slug: true } },
      location: { select: { name: true } },
      order: { select: { number: true } },
      /* A ficha inteira do produto de origem, pelo mesmo `select` da PDP. É o
         "herde por referência": não há campo copiado para `Equipment`, e um
         atributo novo no cadastro aparece aqui sem tocar nesta página. */
      product: { select: { ...SELECT_FICHA, slug: true } },
      media: {
        orderBy: { order: "asc" },
        select: { id: true, media: { select: { url: true, alt: true } } },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, kind: true, title: true, size: true, createdAt: true },
      },
      // o chamado é o que o cliente abre; a OS é o que a equipe executa. As
      // duas listas aparecem separadas porque respondem a perguntas diferentes:
      // "o que eu pedi" e "o que já foi feito no aparelho".
      serviceRequests: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, number: true, status: true, createdAt: true },
      },
      workOrders: {
        orderBy: { openedAt: "desc" },
        take: 5,
        select: {
          id: true,
          number: true,
          status: true,
          openedAt: true,
          closedAt: true,
          workDone: true,
          diagnosis: true,
          requestId: true,
          serviceWarrantyDays: true,
        },
      },
      visits: {
        where: { status: { in: STATUS_VISITA_ABERTOS } },
        orderBy: { dueAt: "asc" },
        take: 3,
        select: { id: true, status: true, dueAt: true, scheduledAt: true },
      },
      contractItems: {
        select: {
          contract: {
            select: {
              id: true,
              number: true,
              status: true,
              startsAt: true,
              endsAt: true,
              plan: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!equipamento) notFound();

  /* ------------------------------------------------- a unidade física

     `Equipment` é o prontuário do cliente; `InventoryUnit` é a peça que passou
     pela bancada da JB, com o laudo de inspeção. Não há chave entre os dois —
     e inventar uma seria pior do que não ter: atribuir o laudo errado a um
     aparelho é afirmar que uma resistência foi trocada numa máquina em que ela
     não foi.

     Então o vínculo é feito por prova, em duas tentativas, nesta ordem:

       1. **Pelo número de série.** É a identificação da peça; se bate, é ela.
       2. **Pelo pedido, e só quando não há ambiguidade.** Se o pedido gerou um
          único prontuário deste produto, a unidade daquele item é esta. Duas
          autoclaves no mesmo pedido param aqui: sem série, não dá para saber
          qual laudo é de qual, e a página não mostra laudo nenhum.
  */
  const serial = equipamento.serialNumber.trim();
  const SELECT_LAUDO = {
    serialNumber: true,
    manufactureYear: true,
    usageHours: true,
    usageCycles: true,
    warrantyMonths: true,
    acquiredFrom: true,
    conditionNotes: true,
    inspectionNotes: true,
    checklist: {
      orderBy: { order: "asc" as const },
      select: { id: true, label: true, result: true, note: true },
    },
  };

  let unidade = null;
  if (equipamento.productId && serial) {
    unidade = await prisma.inventoryUnit.findFirst({
      where: { productId: equipamento.productId, serialNumber: serial },
      select: SELECT_LAUDO,
    });
  }
  if (!unidade && equipamento.productId && equipamento.orderId) {
    const irmaos = await prisma.equipment.count({
      where: { orderId: equipamento.orderId, productId: equipamento.productId },
    });
    if (irmaos === 1) {
      unidade = await prisma.inventoryUnit.findFirst({
        where: {
          productId: equipamento.productId,
          orderItem: { orderId: equipamento.orderId },
        },
        select: SELECT_LAUDO,
      });
    }
  }

  const [historico, chamadosAbertos, chamados12Meses] = await Promise.all([
    historicoDoEquipamento(equipamento.id),
    prisma.serviceRequest.count({
      where: { equipmentId: equipamento.id, status: { in: STATUS_CHAMADO_ABERTOS } },
    }),
    /* Recorrência dos últimos 12 meses — um dos três fatores do índice de
       manutenção. Conta chamado aberto E fechado: o que interessa é quantas
       vezes o aparelho precisou de atendimento, não quantos ainda estão em
       aberto. */
    prisma.serviceRequest.count({
      where: {
        equipmentId: equipamento.id,
        createdAt: { gte: new Date(Date.now() - 365 * 86_400_000) },
      },
    }),
  ]);

  const agora = new Date();
  const garantiaValida = equipamento.warrantyUntil
    ? equipamento.warrantyUntil.getTime() > agora.getTime()
    : null;
  const preventivaAtrasada = equipamento.nextMaintenanceAt
    ? equipamento.nextMaintenanceAt.getTime() < agora.getTime()
    : false;

  const identificacao =
    [equipamento.brandName, equipamento.modelName].filter(Boolean).join(" ") ||
    "Marca e modelo não informados";

  /* ------------------------------------------------------------- a ficha

     Com produto de origem, a ficha é a DELE: capacidade, bandejas, ciclo,
     dimensões, peso, registro Anvisa — tudo o que a PDP mostra, pelo mesmo
     `construirFicha`, sem um campo sequer redigitado neste arquivo.

     Sem produto de origem — equipamento que a clínica cadastrou sozinha — a
     ficha é montada dos campos do próprio prontuário. Ela fica curta, e é o
     que se sabe: o ponto de passar por `construirFicha` mesmo aqui é que
     "220" saia "220 V" e "bivolt" saia "Bivolt (110/220 V)" nos dois casos.
     Era essa a diferença que a auditoria fotografou lado a lado.

     A unidade física entra junto quando foi identificada: série, ano, horas e
     ciclos de uso passam a compor a ficha com procedência "inspeção JB", em
     vez de ficarem fora dela. */
  const dadosDaUnidade = unidade
    ? {
        serialNumber: unidade.serialNumber,
        manufactureYear: unidade.manufactureYear,
        usageHours: unidade.usageHours,
        usageCycles: unidade.usageCycles,
        warrantyMonths: unidade.warrantyMonths,
        acquiredFrom: unidade.acquiredFrom,
      }
    : serial
      ? {
          /* Sem `InventoryUnit`, a série ainda é um fato desta unidade e entra
             na ficha — só não vem acompanhada de laudo. */
          serialNumber: serial,
          manufactureYear: equipamento.manufacturedAt?.getFullYear() ?? null,
          usageHours: null,
          usageCycles: null,
          warrantyMonths: null,
        }
      : null;

  const ficha = equipamento.product
    ? construirFicha(paraFicha(equipamento.product, dadosDaUnidade))
    : construirFicha({
        nome: equipamento.name,
        sku: "",
        modelo: equipamento.modelName,
        condicao: equipamento.condition ?? "",
        marca: equipamento.brandName,
        categoria: equipamento.category
          ? { slug: equipamento.category.slug, nome: equipamento.category.name }
          : null,
        voltagem: equipamento.voltage,
        specs: [],
        unidade: dadosDaUnidade,
      });

  /* A tensão DE USO é um fato da instalação, não do modelo.

     Um modelo bivolt ligado em 220 na sala de esterilização é exatamente a
     informação que o técnico precisa antes de sair. Ela só aparece quando diz
     algo que a ficha do modelo não diz — repetir "Bivolt (110/220 V)" duas
     vezes na mesma tela seria voltar ao problema que a ficha única resolveu. */
  const tensaoDeUso = equipamento.voltage?.trim()
    ? normalizarTensao(equipamento.voltage)
    : null;
  const tensaoDoModelo = equipamento.product?.voltage?.trim()
    ? normalizarTensao(equipamento.product.voltage)
    : null;
  const tensaoPropria =
    equipamento.product && tensaoDeUso && tensaoDeUso !== tensaoDoModelo
      ? tensaoDeUso
      : null;

  /* Idem para marca e modelo: a ficha já os traz do catálogo. A linha só volta
     quando o que está cadastrado no prontuário é OUTRA coisa — aí as duas
     versões precisam aparecer, porque uma delas está errada e quem lê é quem
     sabe qual. */
  const identidadeNaFicha = ficha.grupos.some((grupo) => grupo.id === "identidade");
  const identificacaoDoModelo = equipamento.product
    ? [equipamento.product.brand?.name, equipamento.product.model]
        .filter(Boolean)
        .join(" ")
    : "";
  const identificacaoPropria =
    identidadeNaFicha && identificacao === identificacaoDoModelo ? null : identificacao;

  const itensDoLaudo = unidade?.checklist ?? [];
  const notasDoLaudo = [unidade?.conditionNotes, unidade?.inspectionNotes]
    .map((nota) => nota?.trim() ?? "")
    .filter(Boolean);
  const temLaudo = itensDoLaudo.length > 0 || notasDoLaudo.length > 0;
  const trocados = itensDoLaudo.filter((item) => item.result === "substituido").length;
  const conferidos = itensDoLaudo.filter((item) => item.result !== "nao_aplicavel").length;

  /*
   * Índice de manutenção deste aparelho.
   *
   * A função devolve união discriminada: sem periodicidade cadastrada ou sem
   * saber desde quando o equipamento está no parque, ela responde "não dá para
   * calcular" com a lista do que falta — e o componente mostra isso, em vez de
   * uma nota. Uma nota 100 nesse caso transformaria "ninguém cadastrou" em
   * "está tudo certo".
   */
  const indice = indiceDeManutencao(
    {
      ultimaManutencao: equipamento.lastMaintenanceAt,
      proximaPreventiva: equipamento.nextMaintenanceAt,
      intervaloDias: equipamento.maintenanceIntervalDays,
      chamados12Meses,
      desde: equipamento.purchasedAt ?? equipamento.createdAt,
    },
    agora,
  );

  const lugar = [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · ");

  // o contrato vigente é o que importa na ficha; encerrado vira histórico
  const contrato =
    equipamento.contractItems
      .map((item) => item.contract)
      .find((item) => item.status === "ativo") ??
    equipamento.contractItems[0]?.contract ??
    null;

  /* ------------------------------------------------------------ destaques */

  const destaques: Destaque[] = [];

  if (equipamento.warrantyUntil) {
    destaques.push({
      rotulo: "Garantia",
      valor: garantiaValida ? "Na garantia" : "Garantia encerrada",
      detalhe: `${garantiaValida ? "Válida até" : "Venceu em"} ${formatarData(
        equipamento.warrantyUntil,
      )}`,
      icone: ShieldCheck,
      tom: garantiaValida ? "ok" : "neutro",
    });
  }

  if (equipamento.nextMaintenanceAt) {
    destaques.push({
      rotulo: "Próxima preventiva",
      valor: formatarData(equipamento.nextMaintenanceAt),
      detalhe: preventivaAtrasada
        ? `Atrasada — prevista ${distanciaEmDias(equipamento.nextMaintenanceAt)}`
        : distanciaEmDias(equipamento.nextMaintenanceAt),
      icone: CalendarClock,
      tom: preventivaAtrasada ? "alerta" : "info",
    });
  }

  if (equipamento.lastMaintenanceAt) {
    destaques.push({
      rotulo: "Última manutenção",
      valor: formatarData(equipamento.lastMaintenanceAt),
      detalhe: distanciaEmDias(equipamento.lastMaintenanceAt),
      icone: CalendarCheck,
      tom: "neutro",
    });
  }

  destaques.push({
    rotulo: "Chamados abertos",
    valor: chamadosAbertos,
    detalhe:
      chamadosAbertos > 0
        ? "Atendimento em andamento neste equipamento."
        : "Nenhum atendimento em andamento.",
    icone: LifeBuoy,
    tom: chamadosAbertos > 0 ? "alerta" : "neutro",
  });

  const fichaIncompleta = !equipamento.warrantyUntil && !equipamento.maintenanceIntervalDays;

  return (
    <div>
      <Topo
        voltar={{ href: "/minha-jb/equipamentos", rotulo: "Meus equipamentos" }}
        titulo={equipamento.name}
        etiqueta={
          <Etiqueta tom={TOM_STATUS[equipamento.status] ?? "neutro"}>
            {ROTULO_EQUIPAMENTO[equipamento.status]}
          </Etiqueta>
        }
        descricao={identificacao}
        acoes={
          <>
            <LinkBotao
              href={`/minha-jb/assistencia/novo?equipamento=${equipamento.id}`}
              tamanho="sm"
            >
              <LifeBuoy className="size-4" aria-hidden />
              Abrir chamado
            </LinkBotao>
            <LinkBotao
              href={`/minha-jb/equipamentos/${equipamento.id}/editar`}
              variante="secundario"
              tamanho="sm"
            >
              <Pencil className="size-4" aria-hidden />
              Editar
            </LinkBotao>
          </>
        }
      />

      {/* uma célula sozinha ocupando a largura toda parece caixa esquecida:
          com menos de dois fatos, a ficha e o aviso abaixo já contam a história */}
      {destaques.length >= 2 ? <Destaques itens={destaques} className="mb-6" /> : null}

      {fichaIncompleta ? (
        <Aviso
          tom="info"
          titulo="Complete a ficha e o acompanhamento passa a ser automático"
          className="mb-6"
          acao={
            <LinkBotao
              href={`/minha-jb/equipamentos/${equipamento.id}/editar`}
              variante="secundario"
              tamanho="sm"
            >
              Completar ficha
            </LinkBotao>
          }
        >
          Com a data da garantia e o intervalo de manutenção informados, a JB avisa você
          antes de a preventiva vencer e você vê a garantia sem procurar a nota fiscal.
        </Aviso>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="space-y-6">
          <Cartao>
            <CabecalhoCartao
              titulo="Esta unidade"
              descricao="Os fatos deste aparelho específico: de onde veio, onde está e até quando tem cobertura."
            />
            <dl className="divide-y divide-graf-100 p-5">
              {equipamento.category?.name ? (
                <Linha rotulo="Tipo" valor={equipamento.category.name} />
              ) : null}
              {identificacaoPropria ? (
                <Linha rotulo="Marca e modelo" valor={identificacaoPropria} />
              ) : null}
              {equipamento.serialNumber ? (
                <Linha
                  rotulo="Número de série"
                  valor={<span className="tabular">{equipamento.serialNumber}</span>}
                />
              ) : null}
              {tensaoPropria ? (
                <Linha rotulo="Ligado em" valor={tensaoPropria} />
              ) : null}
              {equipamento.condition ? (
                <Linha rotulo="Condição" valor={ROTULO_CONDICAO[equipamento.condition]} />
              ) : null}
              {lugar ? <Linha rotulo="Onde fica" valor={lugar} /> : null}
              <Linha rotulo="Origem" valor={ROTULO_ORIGEM[equipamento.origin]} />
              {equipamento.order ? (
                <Linha
                  rotulo="Pedido de origem"
                  valor={
                    <Link
                      href={`/minha-jb/pedidos/${equipamento.order.number}`}
                      className="font-semibold text-jb-700 underline-offset-4 hover:underline"
                    >
                      {equipamento.order.number}
                    </Link>
                  }
                />
              ) : null}
              {equipamento.product ? (
                <Linha
                  rotulo="Produto no catálogo"
                  valor={
                    <Link
                      href={`/loja/${equipamento.product.slug}`}
                      className="font-semibold text-jb-700 underline-offset-4 hover:underline"
                    >
                      {equipamento.product.name}
                    </Link>
                  }
                />
              ) : null}
              {equipamento.manufacturedAt ? (
                <Linha
                  rotulo="Fabricado em"
                  valor={formatarData(equipamento.manufacturedAt)}
                />
              ) : null}
              {equipamento.purchasedAt ? (
                <Linha rotulo="Comprado em" valor={formatarData(equipamento.purchasedAt)} />
              ) : null}
              {equipamento.installedAt ? (
                <Linha rotulo="Instalado em" valor={formatarData(equipamento.installedAt)} />
              ) : null}
              {equipamento.warrantyUntil ? (
                <Linha
                  rotulo="Garantia"
                  valor={
                    <span className={garantiaValida ? "text-ok-700" : undefined}>
                      {garantiaValida ? "Válida até " : "Venceu em "}
                      {formatarData(equipamento.warrantyUntil)}
                    </span>
                  }
                />
              ) : null}
              {equipamento.notes ? (
                <Linha
                  rotulo="Observações"
                  valor={<span className="whitespace-pre-line">{equipamento.notes}</span>}
                />
              ) : null}
            </dl>
          </Cartao>

          {ficha.grupos.length > 0 ? (
            <Cartao id="ficha-tecnica" className="scroll-mt-24">
              <CabecalhoCartao
                titulo="Ficha técnica"
                descricao={
                  equipamento.product
                    ? `As ${ficha.total} especificações do modelo, como estão no catálogo da JB.`
                    : `As ${ficha.total} especificações cadastradas para este aparelho.`
                }
                acao={
                  equipamento.product ? (
                    <Link
                      href={`/loja/${equipamento.product.slug}`}
                      className="foco-jb text-sm font-bold text-jb-700 underline-offset-4 hover:underline"
                    >
                      Ver no catálogo
                    </Link>
                  ) : undefined
                }
              />
              <div className="p-5">
                {/* O mesmo `SpecGroup` da PDP, e não uma tabela parecida: se a
                    ficha do produto muda de forma, o prontuário muda junto. */}
                <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
                  {ficha.grupos.map((grupo) => (
                    <SpecGroup key={grupo.id} grupo={grupo} />
                  ))}
                </div>
                {equipamento.product ? (
                  <p className="texto-apoio mt-6 border-t border-graf-100 pt-4 text-graf-500">
                    Herdada de {equipamento.product.name}. Quando a JB corrige uma
                    especificação no catálogo, ela se corrige aqui também — o prontuário
                    lê a ficha do produto, não uma cópia dela.
                  </p>
                ) : null}
              </div>
            </Cartao>
          ) : null}

          {temLaudo ? (
            <Cartao id="laudo" className="scroll-mt-24">
              <CabecalhoCartao
                titulo="Laudo de inspeção desta unidade"
                descricao={
                  itensDoLaudo.length > 0
                    ? `${conferidos} de ${itensDoLaudo.length} conferidos na bancada da JB${
                        trocados > 0
                          ? ` · ${plural(trocados, "peça trocada", "peças trocadas")}`
                          : ""
                      }.`
                    : "O registro que a equipe técnica fez desta unidade, como foi escrito."
                }
              />
              <div className="p-5">
                {/* O laudo não é da vitrine: ele é o registro desta peça física.
                    Ficar só na PDP significava sumir no instante em que a unidade
                    é vendida — que é quando ele passa a valer mais, porque agora
                    o aparelho está na sala da clínica. */}
                {itensDoLaudo.length > 0 ? (
                  <ul className="divide-y divide-graf-100">
                    {itensDoLaudo.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-start justify-between gap-x-5 gap-y-1.5 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-5 text-graf-950">
                            {item.label}
                          </p>
                          {item.note.trim() ? (
                            <p className="texto-apoio mt-0.5 text-graf-600">
                              {item.note.trim()}
                            </p>
                          ) : null}
                        </div>
                        <ResultadoDoChecklist resultado={item.result} />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {notasDoLaudo.length > 0 ? (
                  <div
                    className={
                      itensDoLaudo.length > 0
                        ? "mt-5 space-y-3 border-t border-graf-100 pt-4"
                        : "space-y-3"
                    }
                  >
                    {notasDoLaudo.map((nota) => (
                      <p key={nota} className="text-sm leading-6 text-graf-700">
                        {nota}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </Cartao>
          ) : equipamento.condition && equipamento.condition !== "novo" ? (
            <Cartao>
              <CabecalhoCartao titulo="Laudo de inspeção desta unidade" />
              <p className="flex items-start gap-2.5 p-5 text-sm leading-relaxed text-graf-600">
                <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                <span>
                  A inspeção desta unidade não está publicada aqui. Ela existe na bancada —
                  nenhum seminovo sai da JB sem passar por lá — e a equipe envia o registro
                  item a item se você pedir pelo chamado.
                </span>
              </p>
            </Cartao>
          ) : null}

          {equipamento.media.length > 0 ? (
            <Cartao>
              <CabecalhoCartao titulo="Fotos" />
              <ul className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
                {equipamento.media.map((foto) => (
                  <li
                    key={foto.id}
                    className="relative aspect-4/3 overflow-hidden rounded-lg bg-graf-100"
                  >
                    <Image
                      src={foto.media.url}
                      alt={foto.media.alt || `Foto de ${equipamento.name}`}
                      fill
                      sizes="(max-width: 640px) 45vw, 20vw"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao
              titulo="Histórico"
              descricao="Chamados, ordens de serviço, manutenções e documentos deste equipamento, do mais recente para o mais antigo."
            />
            <div className="p-5">
              {historico.length > 0 ? (
                <Historico itens={historico} />
              ) : (
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-graf-500">
                  <History className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                  <span>
                    O histórico começa agora. Cada chamado, visita e documento deste
                    equipamento passa a aparecer aqui em ordem.
                  </span>
                </p>
              )}
            </div>
          </Cartao>
        </div>

        <div className="space-y-6">
          {/* O índice vem antes da preventiva porque ele resume o que a
              preventiva detalha — e porque, quando não é calculável, ele diz
              exatamente o que falta cadastrar para passar a ser. */}
          <IndiceDoEquipamento indice={indice} />

          <Cartao>
            <CabecalhoCartao titulo="Manutenção preventiva" />
            <div className="space-y-3 p-5 text-sm">
              {equipamento.nextMaintenanceAt ? (
                <p
                  className={
                    preventivaAtrasada
                      ? "font-semibold text-jb-700"
                      : "font-semibold text-graf-900"
                  }
                >
                  {preventivaAtrasada ? "Atrasada desde " : "Prevista para "}
                  {formatarData(equipamento.nextMaintenanceAt)}
                </p>
              ) : (
                <p className="leading-relaxed text-graf-600">
                  Sem data prevista. Informe o intervalo na edição da ficha para a JB
                  acompanhar a próxima visita.
                </p>
              )}

              {equipamento.maintenanceIntervalDays ? (
                <p className="text-graf-600">
                  A cada {equipamento.maintenanceIntervalDays} dias, conforme a ficha.
                </p>
              ) : null}

              {equipamento.visits.length > 0 ? (
                <ul className="space-y-2 border-t border-graf-100 pt-3">
                  {equipamento.visits.map((visita) => {
                    const quando = visita.scheduledAt ?? visita.dueAt;
                    return (
                      <li key={visita.id} className="flex flex-wrap items-center gap-2">
                        <CalendarClock
                          className="size-4 shrink-0 text-graf-500"
                          aria-hidden
                        />
                        <span className="tabular font-semibold text-graf-900">
                          {formatarData(quando)}
                        </span>
                        <Etiqueta tom={visita.status === "agendada" ? "andamento" : "aguardando"}>
                          {ROTULO_VISITA[visita.status]}
                        </Etiqueta>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {contrato ? (
                <div className="border-t border-graf-100 pt-3">
                  <p className="font-semibold text-graf-900">
                    {contrato.plan?.name ?? "Contrato de manutenção"}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-graf-600">
                    <span className="tabular">{contrato.number}</span>
                    <Etiqueta tom={contrato.status === "ativo" ? "ok" : "neutro"}>
                      {ROTULO_CONTRATO[contrato.status]}
                    </Etiqueta>
                  </p>
                  {contrato.endsAt ? (
                    <p className="mt-1 text-graf-500">
                      Cobertura até {formatarData(contrato.endsAt)}.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <LinkBotao
                href="/minha-jb/manutencoes"
                variante="secundario"
                tamanho="sm"
                className="mt-1"
              >
                Ver manutenções
              </LinkBotao>
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Chamados" />
            <div className="p-5 text-sm">
              {equipamento.serviceRequests.length > 0 ? (
                <ul className="divide-y divide-graf-100">
                  {equipamento.serviceRequests.map((chamado) => (
                    <li key={chamado.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <Link
                          href={`/minha-jb/assistencia/${chamado.number}`}
                          className="font-bold text-graf-950 underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                        >
                          {chamado.number}
                        </Link>
                        <Etiqueta tom={tomDoChamado(chamado.status)}>
                          {ROTULO_CHAMADO[chamado.status]}
                        </Etiqueta>
                      </div>
                      <p className="mt-1 text-xs text-graf-500">
                        aberto em {formatarData(chamado.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="leading-relaxed text-graf-600">
                  Nenhum chamado registrado para este equipamento. Se ele parar, fizer
                  ruído estranho ou sair do padrão, abra um chamado — a ficha já vai
                  preenchida.
                </p>
              )}
            </div>
          </Cartao>

          {equipamento.workOrders.length > 0 ? (
            <Cartao>
              <CabecalhoCartao
                titulo="Ordens de serviço"
                descricao="O que a equipe técnica executou no aparelho."
              />
              <ul className="divide-y divide-graf-100 p-5 text-sm">
                {equipamento.workOrders.map((ordem) => (
                  <li key={ordem.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1.5 font-bold text-graf-950">
                        <Wrench className="size-4 text-graf-500" aria-hidden />
                        {ordem.requestId ? (
                          <Link
                            href={`/minha-jb/assistencia/${ordem.requestId}`}
                            className="underline-offset-4 hover:text-jb-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                          >
                            {ordem.number}
                          </Link>
                        ) : (
                          ordem.number
                        )}
                      </span>
                      <Etiqueta
                        tom={
                          ordem.status === "concluida"
                            ? "ok"
                            : ordem.status === "cancelada"
                              ? "neutro"
                              : "andamento"
                        }
                      >
                        {ROTULO_OS[ordem.status]}
                      </Etiqueta>
                    </div>
                    {ordem.workDone || ordem.diagnosis ? (
                      <p className="mt-1.5 line-3 leading-relaxed text-graf-600">
                        {ordem.workDone || ordem.diagnosis}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-graf-500">
                      {ordem.closedAt
                        ? `concluída em ${formatarData(ordem.closedAt)}`
                        : `aberta em ${formatarData(ordem.openedAt)}`}
                      {ordem.status === "concluida" && ordem.serviceWarrantyDays
                        ? ` · garantia do serviço: ${plural(
                            ordem.serviceWarrantyDays,
                            "dia",
                            "dias",
                          )}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Cartao>
          ) : null}

          <Cartao>
            <CabecalhoCartao titulo="Documentos" />
            <div className="p-5">
              {equipamento.documents.length > 0 ? (
                <ListaDeDocumentos documentos={equipamento.documents} />
              ) : (
                <p className="flex items-start gap-2.5 text-sm leading-relaxed text-graf-500">
                  <FileText className="mt-0.5 size-4 shrink-0 text-graf-500" aria-hidden />
                  <span>
                    Laudos, certificados e manuais deste equipamento aparecem aqui quando a
                    equipe da JB os emitir.
                  </span>
                </p>
              )}
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
