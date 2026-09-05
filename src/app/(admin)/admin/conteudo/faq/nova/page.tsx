import type { Metadata } from "next";

import { salvarFaq } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { produtosParaEscolha } from "@/components/admin/conteudo/consultas";
import { FormularioFaq } from "@/components/admin/conteudo/formulario-faq";
import { exigirEdicao } from "@/lib/permissoes";

export const metadata: Metadata = {
  title: "Nova pergunta",
};

export default async function PaginaNovaFaq({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  await exigirEdicao("conteudo");
  const { grupo } = await searchParams;
  const produtos = await produtosParaEscolha();

  return (
    <div>
      <CabecalhoDeSecao
        trilha={[
          { rotulo: "Conteúdo", href: "/admin/conteudo" },
          { rotulo: "Perguntas frequentes", href: "/admin/conteudo/faq" },
          { rotulo: "Nova" },
        ]}
        titulo="Nova pergunta frequente"
        descricao="A pergunta entra no fim do grupo escolhido. A ordem pode ser ajustada depois, na listagem."
      />

      <FormularioFaq acao={salvarFaq} produtos={produtos} grupoSugerido={grupo} />
    </div>
  );
}
