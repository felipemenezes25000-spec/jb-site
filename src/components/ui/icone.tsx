import {
  Armchair,
  Boxes,
  Droplets,
  Lightbulb,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Ícones que o painel pode escolher por categoria. Lista fechada de propósito:
 * ícone é decisão de design, não campo livre — e assim o bundle não carrega
 * a biblioteca inteira.
 */
const MAPA: Record<string, LucideIcon> = {
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Lightbulb,
  Settings,
  Armchair,
  Wind,
  Droplets,
  Boxes,
  Wrench,
};

export const ICONES_DISPONIVEIS = Object.keys(MAPA);

export function IconeCategoria({
  nome,
  className,
}: {
  nome?: string | null;
  className?: string;
}) {
  const Icone = (nome && MAPA[nome]) || Wrench;
  return <Icone className={className} aria-hidden />;
}
