import type { Metadata } from "next";
import type { StaffRole } from "@prisma/client";

import { salvarUsuario } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { FormularioUsuario } from "@/components/admin/conteudo/formulario-usuario";
import { DESCRICAO_PAPEL, ROTULO_PAPEL, exigirEdicao } from "@/lib/permissoes";

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
  title: "Novo acesso",
};

const PAPEIS: StaffRole[] = ["admin", "gestor", "comercial", "tecnico", "editor"];

export default async function PaginaNovoUsuario() {
  await exigirEdicao("usuarios");

  return (
    <div>
      <CabecalhoDeSecao
        trilha={[{ rotulo: "Usuários", href: "/admin/usuarios" }, { rotulo: "Novo acesso" }]}
        titulo="Novo acesso ao painel"
        descricao="Ao salvar, o painel gera uma senha temporária e mostra uma única vez nesta tela."
      />

      <FormularioUsuario
        acao={salvarUsuario}
        papeis={PAPEIS.map((papel) => ({
          valor: papel,
          rotulo: ROTULO_PAPEL[papel],
          descricao: DESCRICAO_PAPEL[papel],
        }))}
        ehVoceMesmo={false}
        ehUltimoAdmin={false}
      />
    </div>
  );
}
