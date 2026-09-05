import type { Metadata } from "next";
import type { StaffRole } from "@prisma/client";

import { salvarUsuario } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { FormularioUsuario } from "@/components/admin/conteudo/formulario-usuario";
import { DESCRICAO_PAPEL, ROTULO_PAPEL, exigirEdicao } from "@/lib/permissoes";

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
