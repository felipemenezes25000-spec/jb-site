import type {
  FamiliaEquipamento,
  SpecDefinition,
} from "@/domain/specs/schema";

/* ============================================================================
   O registro de atributos, por família de equipamento

   Cada linha aqui é um contrato: a chave nunca muda, o rótulo é único e a
   unidade fica separada do número. É por isso que "220" e "220 V" param de
   coexistir e que "6 meses" e "1 ano" passam a ser o mesmo dado em telas
   diferentes.

   `aliases` é o que permite unificar o acervo que já existe. O banco guarda
   `ProductSpec.label` como texto livre — "Tensão", "Alimentação", "Voltagem" —
   e cada produto inventou o seu. Os padrões abaixo mapeiam esse texto para a
   chave canônica sem reescrever produto a produto. Cadastro novo já nasce
   podendo usar a chave direto.

   Ordem de leitura de `aliases`: o primeiro registro cujo padrão casar vence,
   então os atributos mais específicos vêm antes dos genéricos.
   ============================================================================ */

const TODAS: readonly FamiliaEquipamento[] = [
  "autoclave",
  "seladora",
  "fotopolimerizador",
  "ultrassom",
  "compressor",
  "cadeira",
  "motor-implante",
  "aspirador",
  "imagem",
  "lavadora",
  "generico",
];

/* ------------------------------------------------------------- identidade */

const IDENTIDADE: SpecDefinition[] = [
  {
    key: "marca",
    label: "Marca",
    group: "identidade",
    format: "texto",
    comparable: true,
    decisive: false,
    order: 10,
  },
  {
    key: "modelo",
    label: "Modelo",
    group: "identidade",
    format: "texto",
    comparable: true,
    decisive: false,
    aliases: [/^modelo$/],
    order: 20,
  },
  {
    key: "sku",
    label: "SKU",
    group: "identidade",
    format: "texto",
    comparable: false,
    decisive: false,
    helpText: "Código interno da JB para este cadastro.",
    order: 30,
  },
  {
    key: "condicao",
    label: "Condição",
    group: "identidade",
    format: "enum",
    comparable: true,
    decisive: false,
    order: 40,
  },
  {
    key: "fabricante",
    label: "Fabricante",
    group: "identidade",
    format: "texto",
    comparable: false,
    decisive: false,
    aliases: [/fabricante|fabricacao.*empresa/],
    order: 50,
  },
  {
    key: "anvisa",
    label: "Registro Anvisa",
    group: "identidade",
    format: "texto",
    comparable: false,
    decisive: false,
    helpText:
      "Número do registro ou da notificação do produto na Anvisa. Equipamento médico sem registro não pode ser comercializado.",
    aliases: [/anvisa|registro.*sanitari|notificacao.*sanitari/],
    order: 60,
  },
  {
    key: "detentor",
    label: "Detentor do registro",
    group: "identidade",
    format: "texto",
    comparable: false,
    decisive: false,
    aliases: [/detentor/],
    order: 70,
  },
];

/* ------------------------------------------------------------- desempenho */

const DESEMPENHO: SpecDefinition[] = [
  {
    key: "capacidade",
    label: "Capacidade",
    group: "desempenho",
    unit: "L",
    format: "numero",
    comparable: true,
    decisive: true,
    helpText: "Volume útil da câmara — quanto material entra por ciclo.",
    appliesTo: ["autoclave", "lavadora", "compressor", "aspirador"],
    aliases: [/capacidade|volume util|litragem/],
    order: 10,
  },
  {
    key: "temperatura-ciclo",
    label: "Temperatura de ciclo",
    group: "desempenho",
    unit: "°C",
    format: "texto",
    comparable: true,
    decisive: true,
    helpText: "As temperaturas de esterilização que o equipamento roda.",
    appliesTo: ["autoclave", "lavadora"],
    order: 20,
  },
  {
    key: "duracao-ciclo",
    label: "Duração do ciclo",
    group: "desempenho",
    unit: "min",
    format: "numero",
    comparable: true,
    decisive: true,
    helpText: "Tempo do início à liberação da carga.",
    appliesTo: ["autoclave", "lavadora"],
    order: 21,
  },
  {
    /* O cadastro guarda "Ciclo" como texto livre, e o que ele contém muda por
     * produto: numa autoclave é "121 °C e 134 °C", noutra é "35 min". Um
     * rótulo só para os dois afirmava duração sobre temperatura — o tooltip
     * dizia "tempo do ciclo" ao lado de dois graus Celsius.
     *
     * A separação acontece na leitura (`chaveDoCiclo`, em `construir.ts`): o
     * valor decide para qual dos dois atributos acima ele vai. Esta definição
     * fica como rede — valor que não é nem temperatura nem duração continua
     * aparecendo, sem que a ficha invente o que ele significa. */
    key: "ciclo",
    label: "Ciclo",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: false,
    helpText: "O programa de esterilização como o fabricante declara.",
    appliesTo: ["autoclave", "lavadora"],
    aliases: [/ciclo(?!.*classe)|tempo.*ciclo|duracao.*ciclo/],
    order: 22,
  },
  {
    key: "classe",
    label: "Classe do ciclo",
    group: "desempenho",
    format: "enum",
    comparable: true,
    decisive: false,
    helpText: "Classe B esteriliza carga porosa e instrumental com lúmen.",
    appliesTo: ["autoclave"],
    aliases: [/classe/],
    order: 30,
  },
  {
    key: "secagem",
    label: "Secagem",
    group: "desempenho",
    unit: "min",
    format: "numero",
    comparable: true,
    decisive: false,
    appliesTo: ["autoclave"],
    aliases: [/secagem|vacuo.*seca/],
    order: 40,
  },
  {
    key: "bandejas",
    label: "Bandejas",
    group: "desempenho",
    unit: "un",
    format: "numero",
    comparable: true,
    decisive: true,
    appliesTo: ["autoclave", "lavadora"],
    aliases: [/bandeja|cestos?\b/],
    order: 50,
  },
  {
    key: "temperatura",
    label: "Temperatura máxima",
    group: "desempenho",
    unit: "°C",
    format: "numero",
    comparable: true,
    decisive: false,
    appliesTo: ["autoclave", "lavadora"],
    aliases: [/temperatura/],
    order: 60,
  },
  {
    key: "barra-selagem",
    label: "Barra de selagem",
    group: "desempenho",
    unit: "cm",
    format: "numero",
    comparable: true,
    decisive: true,
    helpText: "Largura máxima da embalagem que a seladora fecha de uma vez.",
    appliesTo: ["seladora"],
    aliases: [/barra.*selagem|selagem|largura.*sela/],
    order: 10,
  },
  {
    key: "intensidade",
    label: "Intensidade de luz",
    group: "desempenho",
    unit: "mW/cm²",
    format: "numero",
    comparable: true,
    decisive: true,
    helpText: "Irradiância na ponta. Abaixo de 800 mW/cm² a fotoativação fica lenta.",
    appliesTo: ["fotopolimerizador"],
    aliases: [/intensidade|irradianc|mw\/?cm/],
    order: 10,
  },
  {
    key: "comprimento-onda",
    label: "Comprimento de onda",
    group: "desempenho",
    unit: "nm",
    format: "faixa",
    comparable: true,
    decisive: false,
    appliesTo: ["fotopolimerizador"],
    aliases: [/comprimento.*onda|\bnm\b|espectro/],
    order: 20,
  },
  {
    key: "modos",
    label: "Modos de operação",
    group: "desempenho",
    unit: "un",
    format: "numero",
    comparable: true,
    decisive: true,
    appliesTo: ["fotopolimerizador", "motor-implante", "ultrassom"],
    aliases: [/modos|programas|memorias/],
    order: 30,
  },
  {
    key: "autonomia",
    label: "Autonomia da bateria",
    group: "desempenho",
    unit: "ciclos",
    format: "numero",
    comparable: true,
    decisive: false,
    appliesTo: ["fotopolimerizador"],
    aliases: [/autonomia|bateria/],
    order: 40,
  },
  {
    key: "frequencia-ultrassom",
    label: "Frequência de trabalho",
    group: "desempenho",
    unit: "kHz",
    format: "numero",
    comparable: true,
    decisive: true,
    appliesTo: ["ultrassom", "lavadora"],
    aliases: [/frequencia.*(trabalho|ultrass|khz)|khz/],
    order: 10,
  },
  {
    key: "insertos",
    label: "Insertos inclusos",
    group: "desempenho",
    unit: "un",
    format: "numero",
    comparable: true,
    decisive: true,
    appliesTo: ["ultrassom"],
    aliases: [/inserto|ponta(?!.*ativa.*diam)/],
    order: 20,
  },
  {
    key: "reservatorio",
    label: "Reservatório",
    group: "desempenho",
    unit: "mL",
    format: "numero",
    comparable: true,
    decisive: false,
    appliesTo: ["ultrassom", "aspirador", "lavadora"],
    aliases: [/reservatorio|frasco|bicarbonato/],
    order: 30,
  },
  {
    key: "pressao",
    label: "Pressão de trabalho",
    group: "desempenho",
    unit: "bar",
    format: "faixa",
    comparable: true,
    decisive: true,
    appliesTo: ["compressor"],
    aliases: [/pressao|\bbar\b|psi/],
    order: 10,
  },
  {
    key: "vazao",
    label: "Vazão",
    group: "desempenho",
    unit: "L/min",
    format: "numero",
    comparable: true,
    decisive: true,
    appliesTo: ["compressor", "aspirador"],
    aliases: [/vazao|fluxo|l\/?min/],
    order: 20,
  },
  {
    key: "consultorios",
    label: "Atende até",
    group: "desempenho",
    unit: "un",
    format: "numero",
    comparable: true,
    decisive: true,
    helpText: "Quantos consultórios o equipamento sustenta em uso simultâneo.",
    appliesTo: ["compressor", "aspirador"],
    aliases: [/consultorios|cadeiras.*atend|saidas/],
    order: 30,
  },
  {
    key: "ruido",
    label: "Ruído",
    group: "desempenho",
    unit: "dB",
    format: "numero",
    comparable: true,
    decisive: false,
    appliesTo: ["compressor", "aspirador"],
    aliases: [/ruido|\bdb\b|decib/],
    order: 40,
  },
  {
    key: "torque",
    label: "Torque máximo",
    group: "desempenho",
    unit: "N.cm",
    format: "numero",
    comparable: true,
    decisive: true,
    appliesTo: ["motor-implante"],
    aliases: [/torque|n\.?cm/],
    order: 10,
  },
  {
    key: "rotacao",
    label: "Rotação",
    group: "desempenho",
    unit: "rpm",
    format: "faixa",
    comparable: true,
    decisive: true,
    appliesTo: ["motor-implante", "cadeira"],
    aliases: [/rotacao|rpm|velocidade/],
    order: 20,
  },
  {
    key: "reducao",
    label: "Redução do contra-ângulo",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: false,
    appliesTo: ["motor-implante"],
    aliases: [/reducao|contra.?angulo/],
    order: 30,
  },
  {
    key: "refletor",
    label: "Refletor",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: true,
    appliesTo: ["cadeira"],
    aliases: [/refletor|iluminacao|lux/],
    order: 10,
  },
  {
    key: "equipo",
    label: "Equipo",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: true,
    appliesTo: ["cadeira"],
    aliases: [/equipo|terminal/],
    order: 20,
  },
  {
    key: "sugadores",
    label: "Sugadores",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: true,
    appliesTo: ["cadeira"],
    aliases: [/sugador|succao/],
    order: 30,
  },
  {
    key: "movimentos",
    label: "Movimentos",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: false,
    appliesTo: ["cadeira"],
    aliases: [/movimento|posic/],
    order: 40,
  },
  {
    key: "estofado",
    label: "Estofado",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: false,
    appliesTo: ["cadeira"],
    aliases: [/estofado/],
    order: 50,
  },
  {
    key: "resolucao",
    label: "Resolução",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: true,
    appliesTo: ["imagem"],
    aliases: [/resolucao|pixel|megapixel|\bmp\b/],
    order: 10,
  },
  {
    key: "sensor",
    label: "Sensor",
    group: "desempenho",
    format: "texto",
    comparable: true,
    decisive: true,
    appliesTo: ["imagem"],
    aliases: [/sensor/],
    order: 20,
  },
  {
    key: "kv",
    label: "Tensão do tubo",
    group: "desempenho",
    unit: "V",
    format: "numero",
    comparable: true,
    decisive: false,
    appliesTo: ["imagem"],
    aliases: [/\bkv\b|quilovolt/],
    order: 30,
  },
];

/* ------------------------------------------------------------- instalação */

const INSTALACAO: SpecDefinition[] = [
  {
    key: "tensao",
    label: "Tensão",
    group: "instalacao",
    unit: "V",
    format: "enum",
    comparable: true,
    decisive: true,
    helpText: "A rede da sala precisa bater com a tensão do equipamento.",
    aliases: [/tensao|voltagem|alimentacao(?!.*agua)|bivolt/],
    order: 10,
  },
  {
    key: "frequencia-rede",
    label: "Frequência da rede",
    group: "instalacao",
    unit: "Hz",
    format: "numero",
    comparable: false,
    decisive: false,
    aliases: [/frequencia.*rede|\bhz\b/],
    order: 20,
  },
  {
    key: "potencia",
    label: "Potência",
    group: "instalacao",
    unit: "W",
    format: "numero",
    comparable: true,
    decisive: false,
    helpText: "Consumo máximo. Define o disjuntor do ponto de energia.",
    aliases: [/potencia|consumo(?!.*agua)|watts?/],
    order: 30,
  },
  {
    key: "dimensoes",
    label: "Dimensões (L × A × P)",
    group: "instalacao",
    unit: "cm",
    format: "dimensao",
    comparable: true,
    decisive: false,
    helpText: "Espaço de bancada ou de piso que o equipamento ocupa.",
    aliases: [/dimens|medidas/],
    order: 40,
  },
  {
    key: "peso",
    label: "Peso",
    group: "instalacao",
    unit: "kg",
    format: "numero",
    comparable: true,
    decisive: false,
    aliases: [/^peso|peso\b/],
    order: 50,
  },
  {
    key: "requisitos",
    label: "Requisitos do local",
    group: "instalacao",
    format: "texto",
    comparable: false,
    decisive: false,
    aliases: [/requisito|infraestrutura|ponto de/],
    order: 60,
  },
];

/* -------------------------------------------------------------- comercial */

const COMERCIAL: SpecDefinition[] = [
  {
    key: "garantia",
    label: "Garantia",
    group: "comercial",
    unit: "meses",
    format: "numero",
    comparable: true,
    decisive: true,
    /* Quem presta NÃO entra no rótulo nem na ajuda: entra na procedência da
     * linha (`source` + `note`), porque varia por produto e por unidade. O
     * bullet da seladora dizia "garantia de fábrica" enquanto esta ajuda dizia
     * "prestada pela JB" — a mesma tela afirmando dois responsáveis. */
    helpText: "Contada da data de entrega do equipamento.",
    aliases: [/garantia/],
    order: 10,
  },
  {
    key: "instalacao-inclusa",
    label: "Instalação",
    group: "comercial",
    format: "enum",
    comparable: true,
    decisive: false,
    helpText:
      "Se a instalação já está no preço ou é cobrada à parte. Entre um modelo e outro isso pode valer milhares de reais.",
    order: 20,
  },
  {
    key: "itens-inclusos",
    label: "Itens inclusos",
    group: "comercial",
    format: "texto",
    comparable: false,
    decisive: false,
    aliases: [/acompanha|itens inclus|vem na caixa/],
    order: 30,
  },
];

/* --------------------------------------------------------------- unidade */

const UNIDADE: SpecDefinition[] = [
  {
    key: "serie",
    label: "Número de série",
    group: "unidade",
    format: "texto",
    comparable: false,
    decisive: false,
    order: 10,
  },
  {
    key: "ano-fabricacao",
    label: "Ano de fabricação",
    group: "unidade",
    format: "numero",
    comparable: true,
    decisive: false,
    order: 20,
  },
  {
    key: "horas-uso",
    label: "Horas de uso",
    group: "unidade",
    unit: "h",
    format: "numero",
    comparable: true,
    decisive: false,
    order: 30,
  },
  {
    key: "ciclos-uso",
    label: "Ciclos acumulados",
    group: "unidade",
    unit: "ciclos",
    format: "numero",
    comparable: true,
    decisive: false,
    order: 40,
  },
  {
    /* "Revisão" e "Teste" vinham do cadastro como texto livre e caíam em
     * Desempenho, onde ficavam ao lado de capacidade e bandejas. Eles não
     * descrevem o MODELO: descrevem o que a bancada fez nesta peça. O lugar
     * deles é "Esta unidade", junto do número de série e do uso acumulado. */
    key: "revisao",
    label: "Revisão",
    group: "unidade",
    format: "texto",
    comparable: false,
    decisive: false,
    aliases: [/^revisao$|revisao (da|de)/],
    order: 60,
  },
  {
    key: "teste",
    label: "Teste",
    group: "unidade",
    format: "texto",
    comparable: false,
    decisive: false,
    aliases: [/^teste[s]?$|ciclos? de teste|teste de/],
    order: 70,
  },
  {
    key: "procedencia-unidade",
    label: "Procedência",
    group: "unidade",
    format: "texto",
    comparable: false,
    decisive: false,
    order: 50,
  },
];

export const DEFINICOES: readonly SpecDefinition[] = [
  ...IDENTIDADE,
  ...DESEMPENHO,
  ...INSTALACAO,
  ...COMERCIAL,
  ...UNIDADE,
];

const POR_CHAVE = new Map(DEFINICOES.map((definicao) => [definicao.key, definicao]));

export function definicaoDe(key: string): SpecDefinition | null {
  return POR_CHAVE.get(key) ?? null;
}

/** As definições que se aplicam a uma família, já na ordem de exibição. */
export function definicoesDaFamilia(
  familia: FamiliaEquipamento,
): SpecDefinition[] {
  return DEFINICOES.filter(
    (definicao) => !definicao.appliesTo || definicao.appliesTo.includes(familia),
  ).sort((a, b) => a.order - b.order);
}

export const FAMILIAS = TODAS;

/* ------------------------------------------------- reconhecimento da família */

const SINAIS_DE_FAMILIA: readonly {
  familia: FamiliaEquipamento;
  nome: RegExp;
}[] = [
  { familia: "autoclave", nome: /autoclave|esteriliz/ },
  { familia: "seladora", nome: /seladora|selagem/ },
  { familia: "fotopolimerizador", nome: /fotopolimer|fotocura|photo.?cure/ },
  { familia: "lavadora", nome: /lavadora|cuba.*ultrass|ultrassonica/ },
  { familia: "ultrassom", nome: /ultrassom|jato.*bicarbonato|profilaxia/ },
  { familia: "compressor", nome: /compressor/ },
  { familia: "cadeira", nome: /cadeira|equipo completo|unidade odontolog/ },
  { familia: "motor-implante", nome: /motor.*implante|implante.*motor/ },
  { familia: "aspirador", nome: /aspirador|bomba de vacuo|sugador cirurg/ },
  {
    familia: "imagem",
    nome: /raio.?x|radiograf|camera.*intraoral|sensor.*intraoral|scanner/,
  },
] as const;

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Descobre a família pelo nome e pela categoria. Nunca inventa atributo: a
 * família só decide quais definições entram e em que ordem.
 */
export function familiaDoProduto(entrada: {
  nome?: string | null;
  categoriaSlug?: string | null;
  categoriaNome?: string | null;
}): FamiliaEquipamento {
  const texto = semAcento(
    [entrada.nome, entrada.categoriaNome, entrada.categoriaSlug]
      .filter(Boolean)
      .join(" "),
  );

  return (
    SINAIS_DE_FAMILIA.find((sinal) => sinal.nome.test(texto))?.familia ?? "generico"
  );
}
