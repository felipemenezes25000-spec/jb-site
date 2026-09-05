import type { Metadata } from "next";

import { Vitrine, type ParametrosVitrine } from "@/components/loja/vitrine";

export const metadata: Metadata = {
  title: "Recondicionados JB",
  description: "Equipamentos recuperados na bancada da JB, com o que foi substituído registrado por unidade.",
  alternates: { canonical: "/recondicionados" },
};

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<ParametrosVitrine>;
}) {
  return (
    <Vitrine
      titulo="Recondicionados JB"
      descricao="Equipamentos recuperados na bancada da JB, com o que foi substituído registrado por unidade."
      trilha={[
        { rotulo: "Início", href: "/" },
        { rotulo: "Equipamentos", href: "/loja" },
        { rotulo: "Recondicionados JB" },
      ]}
      parametros={await searchParams}
      filtrosFixos={{ condicao: "recondicionado" }}
      travarCondicao
    />
  );
}
