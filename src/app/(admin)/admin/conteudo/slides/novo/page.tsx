import type { Metadata } from "next";

import { salvarSlide } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioSlide } from "@/components/admin/conteudo/formulario-slide";
import { exigirEdicao } from "@/lib/permissoes";

export const metadata: Metadata = {
  title: "Novo slide",
};

export default async function PaginaNovoSlide() {
  await exigirEdicao("conteudo");
  const biblioteca = await bibliotecaDeImagens();

  return (
    <div>
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Slides", href: "/admin/conteudo/slides" },
          { rotulo: "Novo" },
        ]}
        titulo="Novo slide"
        descricao="O slide entra no fim do carrossel. A ordem pode ser ajustada depois, na listagem."
      />

      <FormularioSlide acao={salvarSlide} imagem={null} biblioteca={biblioteca} />
    </div>
  );
}
