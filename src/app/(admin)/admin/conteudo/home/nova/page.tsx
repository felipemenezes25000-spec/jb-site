import type { Metadata } from "next";

import { salvarSecaoHome } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioSecao } from "@/components/admin/conteudo/formulario-secao";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Nova seção da home",
};

export default async function PaginaNovaSecao() {
  await exigirEdicao("conteudo");

  const [biblioteca, existentes] = await Promise.all([
    bibliotecaDeImagens(),
    prisma.homeSection.findMany({ select: { kind: true } }),
  ]);

  return (
    <div>
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Home", href: "/admin/conteudo/home" },
          { rotulo: "Nova seção" },
        ]}
        titulo="Nova seção da home"
        descricao="A seção entra no fim da página inicial. A posição pode ser ajustada depois, na listagem."
      />

      <FormularioSecao
        acao={salvarSecaoHome}
        imagem={null}
        biblioteca={biblioteca}
        tiposEmUso={existentes.map((secao) => secao.kind)}
      />
    </div>
  );
}
