export type DestaqueTecnico = { rotulo: string; valor: string };

type EspecificacaoCurta = {
  label: string;
  value: string;
  order: number;
};

type EntradaDeDestaques = {
  specs: EspecificacaoCurta[];
  voltage: string | null;
  warrantyMonths: number | null;
};

const PRIORIDADES = [
  /torque/,
  /capacidade|volume|litros/,
  /rotacao|rpm|velocidade/,
  /potencia/,
  /pressao/,
  /tensao|voltagem/,
  /compatibilidade/,
];

function chave(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function prioridade(rotulo: string) {
  const normalizado = chave(rotulo);
  const indice = PRIORIDADES.findIndex((padrao) => padrao.test(normalizado));
  return indice < 0 ? PRIORIDADES.length : indice;
}

function formatarVoltagem(voltagem: string) {
  if (chave(voltagem) === "bivolt") return "Bivolt";
  return /\bv\b/i.test(voltagem) ? voltagem.trim() : `${voltagem.trim()} V`;
}

export function destaquesDoCard(
  entrada: EntradaDeDestaques,
  limite = 2,
): DestaqueTecnico[] {
  const encontrados = entrada.specs
    .filter((item) => item.label.trim() && item.value.trim())
    .sort((a, b) => prioridade(a.label) - prioridade(b.label) || a.order - b.order)
    .map((item) => ({ rotulo: item.label.trim(), valor: item.value.trim() }));

  if (entrada.voltage?.trim()) {
    if (!encontrados.some((item) => /tensao|voltagem/.test(chave(item.rotulo)))) {
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

  const vistos = new Set<string>();
  return encontrados
    .filter((item) => {
      const id = `${chave(item.rotulo)}:${chave(item.valor)}`;
      if (vistos.has(id)) return false;
      vistos.add(id);
      return true;
    })
    .slice(0, Math.max(0, limite));
}
