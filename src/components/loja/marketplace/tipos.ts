import type { ProductCondition } from "@prisma/client";

import type { DestaqueTecnico } from "@/lib/marketplace/destaques-card";

export type ProdutoMarketplaceCard = {
  /** Chave do produto. O botão de guardar precisa dela para o formulário. */
  id: string;
  slug: string;
  name: string;
  model: string;
  condition: ProductCondition;
  priceCents: number;
  compareAtCents: number | null;
  allowDirectPurchase: boolean;
  trackInventory: boolean;
  stock: number;
  unique: boolean;
  brandName: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  imageAlt: string;
  destaques: DestaqueTecnico[];
};

export type ParcelamentoMarketplace = { max: number; minimoCents: number };
