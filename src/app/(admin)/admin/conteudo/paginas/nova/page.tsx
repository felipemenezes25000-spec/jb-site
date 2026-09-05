import type { Metadata } from "next";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioPagina } from "@/components/admin/conteudo/formulario-pagina";
import { salvarPagina } from "@/app/acoes/admin-conteudo";
import { exigirEdicao } from "@/lib/permissoes";

export const metadata: Metadata = {
  title: "Nova página",
};

export default async function PaginaNovaPagina() {
  await exigirEdicao("conteudo");
  const biblioteca = await bibliotecaDeImagens();

  return (
    <div>
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Páginas", href: "/admin/conteudo/paginas" },
          { rotulo: "Nova" },
        ]}
        titulo="Nova página"
        descricao="Depois de criar, a página fica disponível no endereço escolhido e você pode montar a galeria."
      />

      <FormularioPagina acao={salvarPagina} capa={null} biblioteca={biblioteca} />
    </div>
  );
}
