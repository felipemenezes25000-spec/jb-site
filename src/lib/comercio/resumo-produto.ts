import {
  normalizarAtributo,
  prioridadeAtributoDecisao,
} from "@/lib/marketplace/atributos-decisao";

type EntradaDoResumo = {
  specs: { label: string; value: string; order: number }[];
  voltage: string | null;
  warrantyMonths: number | null;
  anvisaCode: string | null;
  /** Opcionais: ajudam quando o nome técnico é mais informativo que os rótulos. */
  nome?: string | null;
  categoriaSlug?: string | null;
};

export type DestaqueProduto = { rotulo: string; valor: string };

function formatarVoltagem(voltagem: string) {
  if (normalizarAtributo(voltagem) === "bivolt") return "Bivolt";
  return /\bv\b/i.test(voltagem) ? voltagem.trim() : `${voltagem.trim()} V`;
}

/**
 * A PDP responde "o que decide esta compra?" antes de funcionar como ficha.
 *
 * A escolha agora usa uma matriz por tipo de equipamento. O tipo pode vir do
 * nome/categoria ou da combinação de rótulos reais do cadastro. A função nunca
 * inventa uma especificação: só muda a ordem do que já existe.
 */
export function destaquesDaPdp(entrada: EntradaDoResumo): DestaqueProduto[] {
  const contexto = {
    nome: entrada.nome,
    categoriaSlug: entrada.categoriaSlug,
    rotulos: entrada.specs.map((item) => item.label),
  };

  const encontrados: DestaqueProduto[] = entrada.specs
    .filter((item) => item.label.trim() && item.value.trim())
    .sort(
      (a, b) =>
        prioridadeAtributoDecisao(a.label, contexto) -
          prioridadeAtributoDecisao(b.label, contexto) ||
        a.order - b.order,
    )
    .map((item) => ({ rotulo: item.label.trim(), valor: item.value.trim() }));

  if (entrada.voltage?.trim()) {
    if (
      !encontrados.some((item) =>
        /tensao|voltagem/.test(normalizarAtributo(item.rotulo)),
      )
    ) {
      encontrados.push({ rotulo: "Voltagem", valor: formatarVoltagem(entrada.voltage) });
    }
  }

  if ((entrada.warrantyMonths ?? 0) > 0) {
    const meses = entrada.warrantyMonths!;
    encontrados.push({
      rotulo: "Garantia",
      valor: `${meses} ${meses === 1 ? "mês" : "meses"}`,
    });
  }

  if (entrada.anvisaCode?.trim()) {
    encontrados.push({ rotulo: "Registro", valor: entrada.anvisaCode.trim() });
  }

  const vistos = new Set<string>();
  return encontrados
    .filter((item) => {
      const id = `${normalizarAtributo(item.rotulo)}:${normalizarAtributo(item.valor)}`;
      if (vistos.has(id)) return false;
      vistos.add(id);
      return true;
    })
    .slice(0, 6);
}
