import {
  destaquesDoCard,
  type DestaqueTecnico,
} from "@/lib/marketplace/destaques-card";

type EntradaDoResumo = {
  specs: { label: string; value: string; order: number }[];
  voltage: string | null;
  warrantyMonths: number | null;
  anvisaCode: string | null;
};

export type DestaqueProduto = DestaqueTecnico;

export function destaquesDaPdp(entrada: EntradaDoResumo): DestaqueProduto[] {
  const principais = destaquesDoCard(
    {
      specs: entrada.specs,
      voltage: entrada.voltage,
      warrantyMonths: entrada.warrantyMonths,
    },
    4,
  );

  if (principais.length < 4 && entrada.anvisaCode?.trim()) {
    principais.push({ rotulo: "Registro", valor: entrada.anvisaCode.trim() });
  }

  return principais.slice(0, 4);
}
