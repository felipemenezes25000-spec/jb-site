import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/admin/servico/cabecalho";
import { FormularioClienteNovo } from "@/components/admin/vendas/formulario-cliente-novo";
import { exigirEdicao } from "@/lib/permissoes";

export const metadata: Metadata = {
  title: "Novo cliente",
};

/**
 * Cadastro de cliente pelo painel.
 *
 * Existe para o atendimento por telefone: até aqui, o único jeito de um
 * dentista entrar no cadastro era ele mesmo criar conta no site ou fechar um
 * pedido. Quem ligava ficava de fora — e junto com ele o chamado, o orçamento
 * e o contrato que dependem de um cliente para existir.
 *
 * A guarda é de escrita, não de leitura: esta tela só cria. Perfil que abre
 * clientes apenas para consulta nem chega até aqui.
 */
export default async function PaginaNovoCliente() {
  await exigirEdicao("clientes");

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        trilha={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Clientes", href: "/admin/clientes" },
          { rotulo: "Novo" },
        ]}
        titulo="Novo cliente"
        descricao="Para quem chegou por telefone, WhatsApp ou visita — sem esperar que crie conta no site."
      />

      <div className="max-w-3xl">
        <FormularioClienteNovo />
      </div>
    </div>
  );
}
