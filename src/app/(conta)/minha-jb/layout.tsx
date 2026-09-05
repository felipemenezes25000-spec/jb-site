import { LogOut } from "lucide-react";

import { sairCliente } from "@/app/acoes/conta";
import { MenuLateral } from "@/components/conta/menu-lateral";
import { STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { exigirCliente } from "@/lib/auth-cliente";
import { STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { STATUS_ORCAMENTO_ABERTOS } from "@/lib/orcamento";
import { prisma } from "@/lib/prisma";

/**
 * Casca da área do cliente.
 *
 * A sessão é exigida aqui, uma vez, para todas as rotas de /minha-jb — e cada
 * página volta a filtrar pelo `customerId` da sessão nas próprias consultas.
 * São duas camadas de propósito: o layout impede o acesso, o filtro impede a
 * troca de id.
 *
 * Os contadores do menu saem de uma leva só de `count` em paralelo. Eles
 * mostram pendência — o que ainda espera alguém —, nunca o total: "12" em
 * Pedidos seria informação inútil para quem só quer saber o que falta.
 */

/** Um pedido some da contagem quando não há mais nada a acompanhar. */
const PEDIDOS_ENCERRADOS = ["concluido", "cancelado", "reembolsado"] as const;

/** Equipamento que não está operacional puxa a atenção do cliente. */
const EQUIPAMENTOS_EM_ALERTA = ["em_manutencao", "aguardando_peca", "inoperante"] as const;

export default async function MinhaJbLayout({ children }: { children: React.ReactNode }) {
  const cliente = await exigirCliente("/minha-jb");

  const [pedidos, chamados, orcamentos, visitas, equipamentos] = await Promise.all([
    prisma.order.count({
      where: { customerId: cliente.id, status: { notIn: [...PEDIDOS_ENCERRADOS] } },
    }),
    prisma.serviceRequest.count({
      where: { customerId: cliente.id, status: { in: STATUS_CHAMADO_ABERTOS } },
    }),
    prisma.quote.count({
      where: { customerId: cliente.id, status: { in: STATUS_ORCAMENTO_ABERTOS } },
    }),
    prisma.maintenanceVisit.count({
      where: {
        status: { in: STATUS_VISITA_ABERTOS },
        equipment: { customerId: cliente.id },
      },
    }),
    prisma.equipment.count({
      where: { customerId: cliente.id, status: { in: [...EQUIPAMENTOS_EM_ALERTA] } },
    }),
  ]);

  const contadores = {
    "/minha-jb/pedidos": pedidos,
    "/minha-jb/assistencia": chamados,
    "/minha-jb/orcamentos": orcamentos,
    "/minha-jb/manutencoes": visitas,
    "/minha-jb/equipamentos": equipamentos,
  };

  const primeiroNome = cliente.name.trim().split(/\s+/)[0] || "cliente";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-graf-200 pb-5">
        <div className="min-w-0">
          <p className="label-mono text-xs text-jb-600">Minha JB</p>
          <p className="mt-0.5 truncate text-base font-bold text-graf-950">
            Olá, {primeiroNome}
          </p>
          <p className="truncate text-sm text-graf-500">{cliente.email}</p>
        </div>

        <form action={sairCliente}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-700 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
          >
            <LogOut className="size-4" aria-hidden />
            Sair da conta
          </button>
        </form>
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <MenuLateral contadores={contadores} className="mb-7 lg:mb-0" />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
