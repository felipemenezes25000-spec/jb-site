import type { Metadata } from "next";

import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioPagina } from "@/components/admin/conteudo/formulario-pagina";
import { salvarPagina } from "@/app/acoes/admin-conteudo";
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
