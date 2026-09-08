import { LogOut } from "lucide-react";

import { sairCliente } from "@/app/acoes/conta";
import styles from "@/app/(conta)/minha-jb/area-clinica.module.css";
import { BotaoSairTopo, RodapeClinica, TopoClinica } from "@/components/clinica/topo";
import { MenuLateral } from "@/components/conta/menu-lateral";
import { STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { exigirCliente } from "@/lib/auth-cliente";
import { STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { naoLidas as contarNaoLidas } from "@/lib/notificacoes";
import { STATUS_ORCAMENTO_ABERTOS } from "@/lib/orcamento";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const instant = false;

const PEDIDOS_ENCERRADOS = ["concluido", "cancelado", "reembolsado"] as const;
const EQUIPAMENTOS_EM_ALERTA = ["em_manutencao", "aguardando_peca", "inoperante"] as const;

export default async function MinhaJbLayout({ children }: { children: React.ReactNode }) {
  const cliente = await exigirCliente();

  const [pedidos, chamados, orcamentos, visitas, equipamentos, avisos, s] = await Promise.all([
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
    contarNaoLidas({ customerId: cliente.id }),
    getSettings(),
  ]);

  const contadores = {
    "/minha-jb/pedidos": pedidos,
    "/minha-jb/assistencia": chamados,
    "/minha-jb/orcamentos": orcamentos,
    "/minha-jb/manutencoes": visitas,
    "/minha-jb/equipamentos": equipamentos,
  };

  return (
    <div className={`flex min-h-dvh flex-col text-graf-900 ${styles.shell}`}>
      <TopoClinica
        nome={cliente.name}
        email={cliente.email}
        naoLidas={avisos}
        sair={
          <form action={sairCliente}>
            <BotaoSairTopo />
          </form>
        }
      />

      <div className="w-full flex-1 lg:pl-[16rem]">
        <div className="mx-auto w-full max-w-[140rem] px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-7 xl:px-7 2xl:px-8">
          <MenuLateral
            contadores={contadores}
            identidade={{ nome: cliente.name, email: cliente.email }}
            className="mb-5 lg:mb-0"
            sair={
              <form action={sairCliente}>
                <button
                  type="submit"
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-graf-200 bg-white px-4 text-xs font-semibold text-graf-700 transition-all hover:border-graf-300 hover:bg-graf-50 hover:text-graf-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sair da conta
                </button>
              </form>
            }
          />

          <main id="conteudo" className="min-w-0 pb-6">
            {children}
          </main>
        </div>
      </div>

      <RodapeClinica telefone={s.telefone} whatsapp={s.whatsapp} />
    </div>
  );
}
