import type { Metadata } from "next";

import { FormularioMarca } from "@/components/admin/catalogo/formulario-marca";
import { Trilha } from "@/components/ui/data";
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
  title: "Nova marca",
};

export default async function PaginaNovaMarca() {
  await exigirEdicao("produtos");
  const total = await prisma.brand.count();

  return (
    <div className="space-y-6">
      <Trilha
        itens={[
          { rotulo: "Painel", href: "/admin" },
          { rotulo: "Marcas", href: "/admin/marcas" },
          { rotulo: "Nova marca" },
        ]}
      />

      <header>
        <h1 className="text-2xl font-bold leading-tight text-graf-950">Nova marca</h1>
        <p className="mt-1 text-sm text-graf-500">
          Depois de criar, a marca já pode ser escolhida na aba Básico de qualquer produto.
        </p>
      </header>

      <FormularioMarca ordemSugerida={total} />
    </div>
  );
}
