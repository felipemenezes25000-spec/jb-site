type EntradaDoResumo = {
  specs: { label: string; value: string; order: number }[];
  voltage: string | null;
  warrantyMonths: number | null;
  anvisaCode: string | null;
};

export type DestaqueProduto = { rotulo: string; valor: string };

const PRIORIDADES_PDP = [
  /intensidade|irradiancia|luminosidade/,
  /torque/,
  /capacidade|volume|litros/,
  /modos|programas|ciclos/,
  /rotacao|rpm|velocidade/,
  /pressao/,
  /frequencia/,
  /vazao/,
  /potencia/,
  /ponteira|diametro|alcance/,
  /tensao|voltagem/,
  /bateria|autonomia/,
  /compatibilidade/,
  /peso/,
];

function chave(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function prioridade(rotulo: string) {
  const normalizado = chave(rotulo);
  const indice = PRIORIDADES_PDP.findIndex((padrao) => padrao.test(normalizado));
  return indice < 0 ? PRIORIDADES_PDP.length : indice;
}

function formatarVoltagem(voltagem: string) {
  if (chave(voltagem) === "bivolt") return "Bivolt";
  return /\bv\b/i.test(voltagem) ? voltagem.trim() : `${voltagem.trim()} V`;
}

/**
 * A PDP precisa responder "o que decide esta compra?" antes de funcionar como
 * ficha técnica. Por isso ela pode mostrar mais atributos que o card da vitrine
 * e usa uma prioridade própria, orientada a equipamento profissional.
 *
 * O cadastro continua sendo a fonte da verdade: não há headline inventada,
 * nota comercial ou especificação derivada. A função só escolhe e ordena o que
 * já existe no produto.
 */
export function destaquesDaPdp(entrada: EntradaDoResumo): DestaqueProduto[] {
  const encontrados: DestaqueProduto[] = entrada.specs
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

  if (entrada.anvisaCode?.trim()) {
    encontrados.push({ rotulo: "Registro", valor: entrada.anvisaCode.trim() });
  }

  const vistos = new Set<string>();
  return encontrados
    .filter((item) => {
      const id = `${chave(item.rotulo)}:${chave(item.valor)}`;
      if (vistos.has(id)) return false;
      vistos.add(id);
      return true;
    })
    .slice(0, 6);
}
