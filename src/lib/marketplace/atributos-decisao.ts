export type ContextoAtributosDecisao = {
  /** Nome do produto ajuda a distinguir subtipos dentro de categorias amplas. */
  nome?: string | null;
  categoriaSlug?: string | null;
  /** Rótulos reais da ficha. Nada é inferido além do tipo de equipamento. */
  rotulos?: readonly string[];
};

export type PerfilAtributosDecisao = {
  id: string;
  rotulo: string;
  prioridades: readonly RegExp[];
};

export function normalizarAtributo(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const GENERICAS = [
  /intensidade|irradiancia|luminosidade|lux/,
  /torque/,
  /capacidade|volume|litros|reservatorio/,
  /modos|programas|ciclos/,
  /rotacao|rpm|velocidade/,
  /pressao/,
  /frequencia/,
  /vazao|fluxo|succao/,
  /potencia|consumo/,
  /ponteira|diametro|alcance/,
  /tensao|voltagem/,
  /bateria|autonomia/,
  /compatibilidade|consultorios/,
  /ruido|db/,
  /peso/,
] as const;

const PERFIS: readonly (PerfilAtributosDecisao & {
  nome: RegExp;
  sinais: readonly RegExp[];
})[] = [
  {
    id: "autoclave",
    rotulo: "Autoclave",
    nome: /autoclave|esteriliz/,
    sinais: [/ciclo|classe/, /secagem|vacuo/, /bandeja/, /capacidade|litros/],
    prioridades: [
      /capacidade|litros|volume/,
      /ciclo|classe/,
      /secagem|vacuo/,
      /bandeja/,
      /reservatorio/,
      /tensao|voltagem/,
      /consumo|potencia/,
    ],
  },
  {
    id: "fotopolimerizador",
    rotulo: "Fotopolimerizador",
    nome: /fotopolimer|fotocura|photo.?cure/,
    sinais: [/intensidade|irradiancia/, /ponteira|diametro/, /radiometro/, /bateria|autonomia/],
    prioridades: [
      /intensidade|irradiancia|mw\/cm/,
      /modos|programas|tempo/,
      /bateria|autonomia|ciclos/,
      /ponteira|diametro/,
      /radiometro/,
      /comprimento.*onda|nm/,
      /tensao|voltagem/,
    ],
  },
  {
    id: "compressor",
    rotulo: "Compressor",
    nome: /compressor/,
    sinais: [/pressao|bar/, /consultorios|cadeiras/, /motor|hp/, /ruido|db/],
    prioridades: [
      /reservatorio|capacidade|litros/,
      /pressao|bar/,
      /vazao|fluxo|l\/min/,
      /ruido|db/,
      /consultorios|cadeiras|saidas/,
      /motor|hp|potencia/,
      /tensao|voltagem/,
    ],
  },
  {
    id: "cadeira",
    rotulo: "Cadeira odontológica",
    nome: /cadeira|unidade odontolog|equipo completo/,
    sinais: [/refletor|lux/, /equipo|terminal/, /sugador|succao/, /movimento|posic/],
    prioridades: [
      /refletor|lux|iluminacao/,
      /equipo|terminal/,
      /sugador|succao/,
      /movimento|posic/,
      /estofado/,
      /capacidade.*carga|peso.*paciente/,
      /tensao|voltagem/,
    ],
  },
  {
    id: "motor-implante",
    rotulo: "Motor de implante",
    nome: /motor.*implante|implante.*motor/,
    sinais: [/torque/, /rotacao|rpm/, /reducao/, /irrigacao/],
    prioridades: [
      /torque/,
      /rotacao|rpm|velocidade/,
      /reducao|contra.?angulo/,
      /irrigacao|bomba/,
      /pedal/,
      /programas|memorias/,
      /tensao|voltagem/,
    ],
  },
  {
    id: "ultrassom-profilaxia",
    rotulo: "Ultrassom de profilaxia",
    nome: /ultrassom|jato.*bicarbonato|bicarbonato.*jato/,
    sinais: [/frequencia|khz/, /inserto|ponta/, /bicarbonato/, /pedal/],
    prioridades: [
      /frequencia|khz/,
      /inserto|ponta/,
      /reservatorio|bicarbonato|volume/,
      /potencia|ajuste.*potencia/,
      /pedal/,
      /tensao|voltagem/,
      /peso/,
    ],
  },
  {
    id: "aspirador",
    rotulo: "Aspirador cirúrgico",
    nome: /aspirador|aspiracao|sugador cirurg/,
    sinais: [/vazao|l\/min/, /reservatorio|frasco/, /filtro/, /succao/],
    prioridades: [
      /vazao|fluxo|l\/min/,
      /pressao|vacuo|succao/,
      /reservatorio|frasco|litros/,
      /filtro/,
      /ruido|db/,
      /pedal/,
      /tensao|voltagem/,
    ],
  },
  {
    id: "imagem",
    rotulo: "Imagem e diagnóstico",
    nome: /raio.?x|radiograf|sensor.*intraoral|camera.*intraoral/,
    sinais: [/kv/, /ma/, /exposicao/, /sensor|resolucao/],
    prioridades: [
      /kv|quilovolt/,
      /ma|miliamp/,
      /tempo.*exposicao|exposicao/,
      /sensor|resolucao|pixel/,
      /foco|distancia.*focal/,
      /tensao|voltagem/,
    ],
  },
] as const;

function quantidadeDeSinais(perfil: (typeof PERFIS)[number], rotulos: readonly string[]) {
  const texto = rotulos.map(normalizarAtributo).join(" · ");
  return perfil.sinais.filter((sinal) => sinal.test(texto)).length;
}

/**
 * Identifica o tipo técnico sem fabricar característica alguma.
 *
 * O nome é a pista mais forte. Quando o cadastro tem nome genérico, a própria
 * combinação de rótulos da ficha pode reconhecer um perfil. Exigimos ao menos
 * dois sinais para evitar classificar um equipamento inteiro por uma palavra
 * comum como "reservatório" ou "tensão".
 */
export function perfilAtributosDecisao(
  contexto: ContextoAtributosDecisao,
): PerfilAtributosDecisao | null {
  const nome = normalizarAtributo(
    [contexto.nome, contexto.categoriaSlug].filter(Boolean).join(" "),
  );

  const peloNome = PERFIS.find((perfil) => perfil.nome.test(nome));
  if (peloNome) return peloNome;

  const rotulos = contexto.rotulos ?? [];
  const pontuados = PERFIS
    .map((perfil) => ({ perfil, pontos: quantidadeDeSinais(perfil, rotulos) }))
    .filter((item) => item.pontos >= 2)
    .sort((a, b) => b.pontos - a.pontos);

  return pontuados[0]?.perfil ?? null;
}

/**
 * Menor valor = atributo mais decisivo.
 *
 * O perfil específico vence; atributos não cobertos por ele caem no ranking
 * genérico. Dessa forma um fotopolimerizador prioriza intensidade/bateria,
 * enquanto uma autoclave prioriza capacidade/ciclo/secagem, mas um cadastro
 * incompleto continua útil.
 */
export function prioridadeAtributoDecisao(
  rotulo: string,
  contexto: ContextoAtributosDecisao,
) {
  const normalizado = normalizarAtributo(rotulo);
  const perfil = perfilAtributosDecisao(contexto);
  const especifica = perfil?.prioridades.findIndex((padrao) => padrao.test(normalizado)) ?? -1;
  if (especifica >= 0) return especifica;

  const generica = GENERICAS.findIndex((padrao) => padrao.test(normalizado));
  if (generica >= 0) return 100 + generica;

  return 1_000;
}

const GRUPOS_SEMANTICOS = [
  {
    grupo: "Desempenho",
    padrao:
      /intensidade|irradiancia|luminosidade|lux|torque|rotacao|rpm|velocidade|pressao|vazao|fluxo|frequencia|khz|potencia de saida|succao/,
  },
  {
    grupo: "Operação e recursos",
    padrao:
      /modo|programa|ciclo|classe|secagem|vacuo|tempo|movimento|posic|pedal|radiometro|irrigacao|reducao|memoria|controle/,
  },
  {
    grupo: "Capacidade e componentes",
    padrao:
      /capacidade|volume|litros|reservatorio|frasco|bandeja|inserto|ponta|ponteira|diametro|filtro|equipo|terminal|sugador|estofado|rodizio/,
  },
  {
    grupo: "Energia e alimentação",
    padrao: /tensao|voltagem|consumo|potencia|bateria|autonomia|motor|hp|alimentacao/,
  },
  {
    grupo: "Compatibilidade e uso",
    padrao: /compatibilidade|consultorios|cadeiras|aplicacao|indicacao|uso|alcance/,
  },
  {
    grupo: "Dimensões e ambiente",
    padrao: /peso|largura|altura|profundidade|dimens|ruido|db/,
  },
] as const;

/** Grupo sugerido apenas para specs cujo `group` não foi preenchido no admin. */
export function grupoSemanticoAtributo(rotulo: string) {
  const normalizado = normalizarAtributo(rotulo);
  return (
    GRUPOS_SEMANTICOS.find((grupo) => grupo.padrao.test(normalizado))?.grupo ??
    "Outras especificações"
  );
}
