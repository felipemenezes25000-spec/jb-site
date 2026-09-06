import type { Metadata } from "next";

import { CabecalhoPagina } from "@/components/admin/servico/cabecalho";
import { FormularioClienteNovo } from "@/components/admin/vendas/formulario-cliente-novo";
import { exigirEdicao } from "@/lib/permissoes";

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
