import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Busca",
  robots: { index: false, follow: true },
};

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  const parametros = await searchParams;
  const bruto = parametros.q;
  const termo = (Array.isArray(bruto) ? bruto[0] : bruto)?.trim() ?? "";

  return (
    <Vitrine
      sobretitulo="Busca"
      titulo={termo ? `Resultados para “${termo}”` : "Buscar no catálogo"}
      descricao={
        termo
          ? undefined
          : "Procure pelo nome do equipamento, pela marca, pelo modelo ou pelo código da peça. Se não aparecer nada, descreva o que a clínica precisa: a equipe responde com preço e prazo."
      }
      trilha={[{ rotulo: "Início", href: "/" }, { rotulo: "Busca" }]}
      caminho="/busca"
      parametros={parametros}
    />
  );
}
