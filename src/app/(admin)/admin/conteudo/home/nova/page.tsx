import type { Metadata } from "next";

import { salvarSecaoHome } from "@/app/acoes/admin-conteudo";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { bibliotecaDeImagens } from "@/components/admin/conteudo/consultas";
import { FormularioSecao } from "@/components/admin/conteudo/formulario-secao";
import { exigirEdicao } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

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
