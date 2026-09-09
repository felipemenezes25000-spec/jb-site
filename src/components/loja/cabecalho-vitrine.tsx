"use client";

import { usePathname } from "next/navigation";

import { Cabecalho } from "@/components/loja/cabecalho";
import { CabecalhoHomeFlagship } from "@/components/loja/home/cabecalho-home-flagship";

export type PropsCabecalhoVitrine = {
  categorias: { slug: string; name: string; count: number }[];
  condicoes: { slug: string; rotulo: string; total: number }[];
  centralPublicada?: boolean;
  acessoDaConta: React.ReactNode;
  contadorDoCarrinho: React.ReactNode;
  telefone: string;
  whatsapp: string;
  horario: string;
  desde: string;
  cidade: string;
};

export function CabecalhoVitrine(props: PropsCabecalhoVitrine) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <CabecalhoHomeFlagship {...props} />;
  }

  return <Cabecalho {...props} />;
}
