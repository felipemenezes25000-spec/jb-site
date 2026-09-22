import {
  Armchair,
  Droplets,
  Gauge,
  Package,
  Thermometer,
  Waves,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { IdEquipamento } from "@/lib/diagnostico";

/** Um ícone por equipamento, o mesmo no diagnóstico e na grade da home. */
export const ICONE_DO_EQUIPAMENTO: Record<IdEquipamento, LucideIcon> = {
  autoclave: Thermometer,
  compressor: Wind,
  "bomba-vacuo": Gauge,
  cadeira: Armchair,
  seladora: Package,
  destilador: Droplets,
  lavadora: Waves,
  outro: Wrench,
};

/**
 * Foto de cada equipamento, quando existe uma boa.
 *
 * São as imagens do protótipo aprovado e do acervo da loja antiga, tratadas em
 * `public/site/equip` (recorte, 640px, WebP). A autoclave teve o nome de uma
 * marca de terceiro apagado do painel: aparecer anunciando fabricante que a
 * JB não representa seria pior do que não ter foto. Destilador e "outro" não
 * têm imagem boa, e ficam com o ícone.
 */
export const IMAGEM_DO_EQUIPAMENTO: Partial<Record<IdEquipamento, string>> = {
  autoclave: "/site/equip/autoclave.webp",
  compressor: "/site/equip/compressor.webp",
  "bomba-vacuo": "/site/equip/bomba-vacuo.webp",
  cadeira: "/site/equip/cadeira.webp",
  seladora: "/site/equip/seladora.webp",
  lavadora: "/site/equip/lavadora.webp",
};
