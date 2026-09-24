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

import { EQUIPAMENTOS, type IdEquipamento } from "@/lib/diagnostico";
import { imagemDoEquipamento } from "@/lib/portfolio-assistencia";

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
 * Foto de cada equipamento da triagem, a mesma do portfólio da home.
 *
 * Uma fonte só (`@/lib/portfolio-assistencia`): a triagem, a grade e as
 * landings mostram o mesmo aparelho, no mesmo quadro de fundo branco que some
 * com `mix-blend-multiply`. "Outro" não tem foto, e fica com o ícone.
 */
export const IMAGEM_DO_EQUIPAMENTO: Partial<Record<IdEquipamento, string>> = Object.fromEntries(
  EQUIPAMENTOS.flatMap((equipamento) => {
    const imagem = imagemDoEquipamento(equipamento.id);
    return imagem ? [[equipamento.id, imagem]] : [];
  }),
);
