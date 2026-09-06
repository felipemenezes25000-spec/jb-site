import { LogOut } from "lucide-react";

import { sairCliente } from "@/app/acoes/conta";
import { BotaoSairTopo, RodapeClinica, TopoClinica } from "@/components/clinica/topo";
import { MenuLateral } from "@/components/conta/menu-lateral";
import { STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { exigirCliente } from "@/lib/auth-cliente";
import { STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { naoLidas as contarNaoLidas } from "@/lib/notificacoes";
import { STATUS_ORCAMENTO_ABERTOS } from "@/lib/orcamento";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

/**
 * Casca da Área da Clínica.
 *
 * Depois do login, a área deixa de ser uma página da loja e passa a ser uma
 * aplicação: topo próprio (marca, nome da área, avisos, identidade, saída e a
 * volta para a loja), navegação lateral fixa e um rodapé de três linhas. O
 * cabeçalho de compra — busca de catálogo, mega menu, carrinho e o botão de
 * pedir assistência — não entra aqui: quem está nesta tela já comprou, e
 * aquela barra faz a ferramenta parecer de novo uma página do site.
 *
 * A troca é só de layout. As URLs continuam as mesmas (`/minha-jb/...`), porque
 * `(conta)` é grupo de rota e não aparece no caminho. As telas de entrar,
 * cadastro e recuperação de senha ficaram no grupo `(acesso)`, que continua
 * usando o cabeçalho e o rodapé da loja — quem ainda não entrou está decidindo
 * confiar na JB, e nessa hora o site inteiro precisa estar à mão.
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
    <div className="flex min-h-dvh flex-col bg-surface-muted">
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

      <div className="container-jb w-full flex-1 py-6 lg:py-9">
        <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-9">
          <MenuLateral
            contadores={contadores}
            identidade={{ nome: cliente.name, email: cliente.email }}
            className="mb-6 lg:mb-0"
            sair={
              <form action={sairCliente}>
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-graf-300 bg-white px-4 text-sm font-semibold text-graf-700 transition-colors hover:border-graf-400 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sair da conta
                </button>
              </form>
            }
          />

          <main id="conteudo" className="min-w-0">
            {children}
          </main>
        </div>
      </div>

      <RodapeClinica telefone={s.telefone} whatsapp={s.whatsapp} />
    </div>
  );
}
