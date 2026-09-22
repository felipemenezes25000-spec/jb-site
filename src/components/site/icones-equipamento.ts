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
