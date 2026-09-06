import type { Metadata } from "next";

import { salvarFaq } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { produtosParaEscolha } from "@/components/admin/conteudo/consultas";
import { FormularioFaq } from "@/components/admin/conteudo/formulario-faq";
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
