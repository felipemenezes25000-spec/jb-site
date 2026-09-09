"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";

import { CrossSellIntencional } from "@/components/loja/produto/cross-sell-intencional";

export default function ProdutoTemplate({ children }: { children: ReactNode }) {
  const params = useParams<{ slug: string }>();
  const slug = typeof params.slug === "string" ? params.slug : "";

  return (
    <>
      {children}
      {slug ? <CrossSellIntencional slug={slug} /> : null}
    </>
  );
}
