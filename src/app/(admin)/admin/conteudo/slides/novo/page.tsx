import type { Metadata } from "next";

import { salvarSlide } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioSlide } from "@/components/admin/conteudo/formulario-slide";
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
