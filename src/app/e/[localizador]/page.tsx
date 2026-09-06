import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ClipboardList, ShieldAlert, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Cartao, Etiqueta } from "@/components/ui/data";
import { sessaoCliente } from "@/lib/auth-cliente";
import { sessaoStaff } from "@/lib/auth";
import {
  EXPLICACAO_DA_RECUSA,
  codigoLegivel,
  destinoDoLogin,
  normalizarCodigo,
  quemPodeVer,
  type QuemAcessa,
} from "@/lib/etiqueta";
import { distanciaEmDias, formatarData } from "@/lib/format";
import { podeVer } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";
import { ROTULO_EQUIPAMENTO } from "@/lib/rotulos-equipamento";

/* ============================================================================
   /e/<localizador> — o QR colado no equipamento

   A ordem das operações desta página é a segurança dela:

   1. resolve o localizador;
   2. lê a sessão;
   3. **decide o acesso**;
   4. só então busca o dado.

   A consulta completa da ficha acontece depois da decisão, e não antes. Isso
   importa porque o escopo pede que dado privado não entre no HTML antes da
   autorização — e a forma de garantir isso não é esconder com CSS, é não
   buscar.

   O destino do login é construído aqui, a partir do localizador. Não há
   parâmetro `voltar` lido da URL: um retorno controlado por quem manda o link
   é como se leva alguém autenticado para fora.
   ============================================================================ */

export const instant = false;

/** Nada disto é indexável: é um localizador de bem físico de um cliente. */
export const metadata: Metadata = {
  title: "Prontuário do equipamento",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ localizador: string }> };

function Recusa({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto: string;
  acao?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-12">
      <Cartao className="p-6">
        <p className="flex items-center gap-2 text-sm font-bold text-graf-950">
          <ShieldAlert className="size-4 shrink-0 text-graf-400" aria-hidden />
          {titulo}
        </p>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-600">{texto}</p>
        {acao ? <div className="mt-5">{acao}</div> : null}
      </Cartao>
    </main>
  );
}

export default async function EtiquetaPage({ params }: Props) {
  const { localizador } = await params;
  const codigo = normalizarCodigo(localizador);

  /* Só o mínimo para decidir. Nome, série e histórico ficam para depois da
     autorização — inclusive porque um `select` amplo aqui acabaria vazando no
     HTML por descuido de quem mexer nesta página no futuro. */
  const alvo = await prisma.equipment.findUnique({
    where: { locator: codigo },
    select: { id: true, customerId: true, status: true },
  });

  /* Localizador inexistente e localizador de outro cliente NÃO respondem a
     mesma coisa: o segundo diz que o equipamento é de outra clínica, porque
     essa informação é útil a quem escaneou por engano. O primeiro é 404 —
     dizer "não existe" a quem varre códigos não entrega nada. */
  if (!alvo) notFound();

  const [cliente, staff] = await Promise.all([sessaoCliente(), sessaoStaff()]);

  const quem: QuemAcessa = cliente
    ? { tipo: "cliente", customerId: cliente.id }
    : staff
      ? { tipo: "staff", podeVerEquipamentos: podeVer(staff, "equipamentos") }
      : { tipo: "visitante" };

  const decisao = quemPodeVer(quem, {
    customerId: alvo.customerId,
    desativado: alvo.status === "desativado",
  });

  if (!decisao.permitido) {
    if (decisao.motivo === "sem_sessao") {
      /* O destino é construído, não lido. Ver `destinoDoLogin`. */
      redirect(`/entrar?voltar=${encodeURIComponent(destinoDoLogin(codigo))}`);
    }

    return (
      <Recusa
        titulo="Sem acesso a esta ficha"
        texto={EXPLICACAO_DA_RECUSA[decisao.motivo]}
        acao={
          decisao.motivo === "outro_titular" ? (
            <LinkBotao href="/minha-jb/equipamentos" tamanho="sm">
              Ver os meus equipamentos
            </LinkBotao>
          ) : null
        }
      />
    );
  }

  /* Autorizado. Só agora o dado é buscado. */
  const equipamento = await prisma.equipment.findUnique({
    where: { id: alvo.id },
    select: {
      id: true,
      name: true,
      brandName: true,
      modelName: true,
      serialNumber: true,
      status: true,
      room: true,
      warrantyUntil: true,
      lastMaintenanceAt: true,
      nextMaintenanceAt: true,
      location: { select: { name: true } },
      customer: { select: { name: true } },
      _count: { select: { serviceRequests: true, documents: true } },
    },
  });
  if (!equipamento) notFound();

  const garantiaVigente =
    equipamento.warrantyUntil !== null && equipamento.warrantyUntil.getTime() > Date.now();

  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <p className="label-mono text-xs text-graf-500">JB · Prontuário Técnico</p>
      <h1 className="mt-1 text-title texto-forte">{equipamento.name}</h1>
      <p className="mt-1 text-[0.9375rem] text-graf-600">
        {[equipamento.brandName, equipamento.modelName].filter(Boolean).join(" ") ||
          "Marca e modelo não cadastrados"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Etiqueta tom={equipamento.status === "operacional" ? "ok" : "alerta"}>
          {ROTULO_EQUIPAMENTO[equipamento.status]}
        </Etiqueta>
        {decisao.motivo === "equipe" ? (
          <Etiqueta tom="andamento">Acesso da equipe · {equipamento.customer.name}</Etiqueta>
        ) : null}
      </div>

      <Cartao className="mt-6 p-5">
        <dl className="space-y-2.5 text-[0.9375rem]">
          <Linha
            rotulo="Número de série"
            valor={equipamento.serialNumber || "a atribuir"}
            mono={Boolean(equipamento.serialNumber)}
          />
          <Linha
            rotulo="Onde fica"
            valor={
              [equipamento.location?.name, equipamento.room].filter(Boolean).join(" · ") ||
              "não informado"
            }
          />
          <Linha
            rotulo="Garantia"
            valor={
              equipamento.warrantyUntil
                ? `${garantiaVigente ? "até" : "venceu em"} ${formatarData(equipamento.warrantyUntil)}`
                : "não registrada"
            }
          />
          <Linha
            rotulo="Última manutenção"
            valor={
              equipamento.lastMaintenanceAt
                ? formatarData(equipamento.lastMaintenanceAt)
                : "sem registro"
            }
          />
          <Linha
            rotulo="Próxima preventiva"
            valor={
              equipamento.nextMaintenanceAt
                ? `${formatarData(equipamento.nextMaintenanceAt)} · ${distanciaEmDias(equipamento.nextMaintenanceAt)}`
                : "não programada"
            }
          />
        </dl>
      </Cartao>

      {/* O chamado aberto daqui já sabe de que equipamento se trata. A pessoa
          descreve o problema; o resto o sistema já tem. */}
      <div className="mt-6 space-y-3">
        <LinkBotao
          href={`/minha-jb/assistencia/nova?equipamento=${equipamento.id}`}
          larguraTotal
        >
          <Wrench className="size-4" aria-hidden />
          Abrir chamado para este equipamento
        </LinkBotao>

        <Link
          href={`/minha-jb/equipamentos/${equipamento.id}`}
          className="flex min-h-11 items-center justify-between rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-800 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          <span className="inline-flex items-center gap-2">
            <ClipboardList className="size-4" aria-hidden />
            Ficha completa
            <span className="text-graf-500">
              · {equipamento._count.serviceRequests} chamados ·{" "}
              {equipamento._count.documents} documentos
            </span>
          </span>
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <p className="mt-8 text-center text-[0.75rem] text-graf-400">
        Código {codigoLegivel(codigo)}
      </p>
    </main>
  );
}

function Linha({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt className="text-graf-500">{rotulo}</dt>
      <dd className={mono ? "label-mono text-graf-900" : "font-semibold text-graf-900"}>
        {valor}
      </dd>
    </div>
  );
}
