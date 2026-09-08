/**
 * O resto da ficha, para o preview de aprovação.
 *
 * O catálogo de demonstração chegou com nome, preço, foto e seis linhas de
 * ficha técnica. Faltava tudo que uma ficha de verdade tem e que a página já
 * sabe mostrar: medida, peso, o que vem na caixa, o que a clínica precisa ter
 * pronto e as dúvidas mais comuns. Sem isso a página existe mas parece pela
 * metade — três seções abrem e fecham vazias.
 *
 * Os números aqui são plausíveis, não medidos. É um site de apresentação, e a
 * decisão de preenchê-lo é do cliente. O que NÃO é inventado, de propósito:
 *
 *   · registro na ANVISA e GTIN/EAN — são identificadores de registro público
 *     com dígito verificador. Um número plausível ali não é ilustração, é um
 *     registro falso, e a página os exibe como se fossem conferidos;
 *   · nota, avaliação e depoimento — a página só mostra o que um cliente
 *     escreveu de verdade.
 */

export type FichaDemo = {
  fabricante: string;
  pesoGramas: number;
  larguraMm: number;
  alturaMm: number;
  profundidadeMm: number;
  naCaixa: string[];
  requisitos: string[];
  duvidas: { pergunta: string; resposta: string }[];
};

export const FICHA_DEMO: Record<string, FichaDemo> = {
  "autoclave-vertical-18l-classe-b": {
    fabricante: "Cristófoli Biossegurança",
    pesoGramas: 42000,
    larguraMm: 450,
    alturaMm: 880,
    profundidadeMm: 520,
    naCaixa: [
      "Autoclave vertical 18 L",
      "4 bandejas em inox",
      "Pinça para retirada de bandeja",
      "Mangueira de dreno",
      "Manual em português e termo de garantia",
    ],
    requisitos: [
      "Tomada exclusiva de 20 A em 220 V, com aterramento",
      "Bancada nivelada com 60 cm livres de profundidade",
      "20 cm de folga atrás do equipamento para ventilação",
      "Água destilada — a autoclave não trabalha com água de torneira",
    ],
    duvidas: [
      {
        pergunta: "Preciso de instalação hidráulica para esta autoclave?",
        resposta:
          "Não. O abastecimento é manual, com água destilada, e o descarte é feito pelo reservatório de água residual. O que ela exige é ponto elétrico dedicado.",
      },
      {
        pergunta: "O ciclo Classe B serve para instrumental com lúmen?",
        resposta:
          "Sim. O ciclo B com vácuo fracionado é o indicado para material poroso, embalado e com lúmen — é ele que a vigilância cobra em consultório.",
      },
    ],
  },
  "ultrassom-jato-bicarbonato": {
    fabricante: "Schuster Equipamentos",
    pesoGramas: 2400,
    larguraMm: 250,
    alturaMm: 130,
    profundidadeMm: 200,
    naCaixa: [
      "Aparelho de ultrassom com jato",
      "3 pontas para profilaxia",
      "Peça de mão autoclavável",
      "Pedal progressivo",
      "Manual e termo de garantia",
    ],
    requisitos: [
      "Tomada bivolt comum, com aterramento",
      "Ponto de ar comprimido para o jato de bicarbonato",
      "Bancada com 40 cm livres",
    ],
    duvidas: [
      {
        pergunta: "A peça de mão pode ir para a autoclave?",
        resposta: "Pode. A peça de mão é autoclavável a 134 °C; as pontas também.",
      },
      {
        pergunta: "Quantas pontas acompanham o aparelho?",
        resposta:
          "Três pontas de profilaxia. Pontas de reposição ficam em estoque na JB e podem ser pedidas junto com o equipamento.",
      },
    ],
  },
  "cadeira-equipo-completo-pro": {
    fabricante: "Gnatus",
    pesoGramas: 185000,
    larguraMm: 900,
    alturaMm: 1250,
    profundidadeMm: 1980,
    naCaixa: [
      "Cadeira odontológica",
      "Equipo com três terminais",
      "Refletor LED",
      "Unidade de água com cuspideira em cerâmica",
      "Mocho do profissional",
      "Manual, termo de garantia e certificado de instalação",
    ],
    requisitos: [
      "Área mínima de 2,20 m × 1,80 m livre",
      "Ponto elétrico de 220 V com disjuntor exclusivo de 20 A",
      "Ponto de água e esgoto no piso, na posição da cuspideira",
      "Ponto de ar comprimido e de sucção",
      "Piso nivelado — desnível acima de 5 mm exige regularização antes da entrega",
    ],
    duvidas: [
      {
        pergunta: "A instalação está incluída?",
        resposta:
          "Sim. Equipo completo sai com instalação e treinamento de uso pela equipe técnica da JB, agendados junto com a entrega.",
      },
      {
        pergunta: "Quanto tempo leva a instalação?",
        resposta:
          "Um dia de trabalho, com a infraestrutura pronta. A equipe confere os pontos antes de agendar, justamente para não voltar duas vezes.",
      },
    ],
  },
  "compressor-isento-de-oleo-40l": {
    fabricante: "Olsen",
    pesoGramas: 38000,
    larguraMm: 680,
    alturaMm: 720,
    profundidadeMm: 400,
    naCaixa: [
      "Compressor isento de óleo 40 L",
      "Filtro de linha",
      "Mangueira de saída",
      "Manual e termo de garantia",
    ],
    requisitos: [
      "Tomada de 220 V com aterramento",
      "Área ventilada, de preferência fora da sala clínica",
      "30 cm de folga em volta do equipamento",
    ],
    duvidas: [
      {
        pergunta: "Este compressor atende quantos consultórios?",
        resposta:
          "Um consultório com até dois equipos trabalhando ao mesmo tempo. Acima disso, a equipe recomenda o de 100 L.",
      },
      {
        pergunta: "Isento de óleo faz diferença na odontologia?",
        resposta:
          "Faz. Sem óleo não há risco de o ar carregar resíduo para o campo operatório, e a manutenção deixa de depender de troca de lubrificante.",
      },
    ],
  },
  "aspirador-cirurgico-movel": {
    fabricante: "Dabi Atlante",
    pesoGramas: 21000,
    larguraMm: 380,
    alturaMm: 780,
    profundidadeMm: 380,
    naCaixa: [
      "Aspirador cirúrgico móvel",
      "2 frascos coletores",
      "Cânulas de sucção",
      "Manual e termo de garantia",
    ],
    requisitos: ["Tomada bivolt com aterramento", "Piso liso para o carrinho circular"],
    duvidas: [
      {
        pergunta: "Serve para cirurgia de implante?",
        resposta:
          "Serve. A vazão atende procedimento cirúrgico, e os dois frascos permitem trocar sem interromper o atendimento.",
      },
    ],
  },
  "motor-de-implante-35ncm": {
    fabricante: "Kavo do Brasil",
    pesoGramas: 5200,
    larguraMm: 260,
    alturaMm: 140,
    profundidadeMm: 240,
    naCaixa: [
      "Unidade de controle",
      "Micromotor com cabo",
      "Contra-ângulo 20:1",
      "Pedal de controle",
      "Suporte de soro",
      "Manual e termo de garantia",
    ],
    requisitos: ["Tomada bivolt com aterramento", "Bancada com 40 cm livres"],
    duvidas: [
      {
        pergunta: "O contra-ângulo acompanha o motor?",
        resposta: "Acompanha, na redução 20:1, que é a usada em cirurgia de implante.",
      },
      {
        pergunta: "Tem irrigação?",
        resposta:
          "Tem. A bomba peristáltica é integrada e o suporte de soro vem junto; o equipo não precisa fornecer água.",
      },
    ],
  },
  "fotopolimerizador-led-1200": {
    fabricante: "Schuster Equipamentos",
    pesoGramas: 320,
    larguraMm: 60,
    alturaMm: 240,
    profundidadeMm: 60,
    naCaixa: [
      "Fotopolimerizador sem fio",
      "Base carregadora",
      "Protetor ocular",
      "Manual e termo de garantia",
    ],
    requisitos: ["Tomada bivolt para a base carregadora"],
    duvidas: [
      {
        pergunta: "Quantas fotoativações a bateria aguenta?",
        resposta:
          "Cerca de 300 ciclos de 10 segundos com a bateria cheia — um dia de atendimento sem voltar para a base.",
      },
    ],
  },
  "seladora-de-embalagens-30cm": {
    fabricante: "Cristófoli Biossegurança",
    pesoGramas: 6400,
    larguraMm: 420,
    alturaMm: 180,
    profundidadeMm: 220,
    naCaixa: ["Seladora 30 cm", "Suporte de bobina", "Manual e termo de garantia"],
    requisitos: ["Tomada bivolt com aterramento", "Bancada com 50 cm livres"],
    duvidas: [
      {
        pergunta: "Serve para papel grau cirúrgico?",
        resposta:
          "Serve. A largura de selagem de 30 cm atende as bobinas usadas na esterilização de instrumental odontológico.",
      },
    ],
  },
  "raio-x-intraoral-parede": {
    fabricante: "Dabi Atlante",
    pesoGramas: 18000,
    larguraMm: 260,
    alturaMm: 320,
    profundidadeMm: 1800,
    naCaixa: [
      "Raio-x intraoral com braço extensível",
      "Kit de fixação em parede",
      "Disparador remoto",
      "Manual e termo de garantia",
    ],
    requisitos: [
      "Parede de alvenaria para fixação — drywall exige reforço",
      "Tomada de 220 V com aterramento",
      "Sala com barreira de proteção conforme a vigilância local",
      "Levantamento radiométrico é responsabilidade da clínica",
    ],
    duvidas: [
      {
        pergunta: "A JB emite o laudo de radioproteção?",
        resposta:
          "Não. O laudo é de física médica e depende da sala, não do aparelho. A JB instala, testa e entrega a documentação técnica do equipamento.",
      },
    ],
  },
  "cuba-lavadora-ultrassonica-7l": {
    fabricante: "Cristófoli Biossegurança",
    pesoGramas: 7800,
    larguraMm: 330,
    alturaMm: 320,
    profundidadeMm: 240,
    naCaixa: ["Cuba ultrassônica 7 L", "Cesto em inox", "Tampa", "Manual e termo de garantia"],
    requisitos: ["Tomada bivolt com aterramento", "Bancada com 40 cm livres"],
    duvidas: [
      {
        pergunta: "A cuba substitui a autoclave?",
        resposta:
          "Não. Ela faz a limpeza por cavitação, que é a etapa ANTES da esterilização. O instrumental sai dela limpo, e é a autoclave que o esteriliza.",
      },
    ],
  },
  "camera-intraoral-hd-usb": {
    fabricante: "Kavo do Brasil",
    pesoGramas: 280,
    larguraMm: 40,
    alturaMm: 220,
    profundidadeMm: 40,
    naCaixa: [
      "Câmera intraoral HD",
      "Cabo USB de 3 m",
      "Suporte de bancada",
      "20 capas descartáveis",
      "Manual e termo de garantia",
    ],
    requisitos: ["Computador com porta USB e Windows 10 ou superior"],
    duvidas: [
      {
        pergunta: "Funciona com qualquer software odontológico?",
        resposta:
          "Funciona com os que aceitam captura por TWAIN, que é o padrão da maioria. A equipe confere o seu antes da entrega.",
      },
    ],
  },
  "autoclave-12l-revisada": {
    fabricante: "Cristófoli Biossegurança",
    pesoGramas: 32000,
    larguraMm: 420,
    alturaMm: 400,
    profundidadeMm: 560,
    naCaixa: [
      "Autoclave 12 L revisada",
      "3 bandejas em inox",
      "Pinça para retirada de bandeja",
      "Laudo de revisão da bancada JB",
      "Termo de garantia da JB",
    ],
    requisitos: [
      "Tomada exclusiva de 20 A em 220 V, com aterramento",
      "Bancada nivelada com 60 cm livres de profundidade",
      "Água destilada",
    ],
    duvidas: [
      {
        pergunta: "A garantia de seminovo é da fábrica ou da JB?",
        resposta:
          "Da JB. São 6 meses registrados na ficha desta unidade, cobrindo o que foi revisado na bancada antes da publicação.",
      },
      {
        pergunta: "Posso ver o que foi trocado nesta autoclave?",
        resposta:
          "Pode. O laudo de inspeção está nesta página, item a item, com o que foi verificado e o que foi substituído.",
      },
    ],
  },
};

/**
 * Como a instalação é oferecida em cada equipamento.
 *
 * Sem isso a linha "Instalação" aparece como "não informado" na ficha e na
 * comparação — que é o pior dos dois mundos: ocupa a linha e não responde.
 * A política acompanha o porte: o que precisa de ponto de água, dreno ou
 * fixação em parede sai com equipe; o de bancada é ligar na tomada.
 */
export type InstalacaoDemo = {
  politica: "inclusa" | "opcional" | "nao_oferecida" | "sob_consulta";
  observacao: string;
};

export const INSTALACAO_DEMO: Record<string, InstalacaoDemo> = {
  "cadeira-equipo-completo-pro": {
    politica: "inclusa",
    observacao:
      "Instalação e treinamento de uso pela equipe da JB, agendados junto com a entrega. A conferência dos pontos de água, esgoto, ar e energia é feita antes de marcar a data.",
  },
  "raio-x-intraoral-parede": {
    politica: "inclusa",
    observacao:
      "Fixação, alinhamento e teste de disparo pela equipe da JB. O laudo de radioproteção da sala é de física médica e não acompanha o equipamento.",
  },
  "autoclave-vertical-18l-classe-b": {
    politica: "inclusa",
    observacao:
      "A equipe entrega, confere o ponto elétrico, roda o primeiro ciclo de validação e treina a rotina de carga.",
  },
  "compressor-isento-de-oleo-40l": {
    politica: "inclusa",
    observacao:
      "Inclui posicionamento, ligação à linha de ar e teste de pressão com o equipo em funcionamento.",
  },
  "autoclave-12l-revisada": {
    politica: "opcional",
    observacao:
      "A unidade sai revisada e testada. Se a clínica preferir, a equipe entrega, roda o ciclo de validação no local e treina a rotina — orçado à parte.",
  },
  "motor-de-implante-35ncm": {
    politica: "opcional",
    observacao: "Entrega com configuração e treinamento de uso, quando a clínica pedir.",
  },
  "aspirador-cirurgico-movel": {
    politica: "opcional",
    observacao: "Entrega com demonstração de uso e troca de frasco, quando a clínica pedir.",
  },
  "cuba-lavadora-ultrassonica-7l": {
    politica: "opcional",
    observacao:
      "Equipamento de bancada. A equipe pode entregar e demonstrar o ciclo de limpeza junto com a rotina de esterilização.",
  },
  "seladora-de-embalagens-30cm": {
    politica: "opcional",
    observacao: "Entrega com ajuste de temperatura e teste de selagem na bobina da clínica.",
  },
  "ultrassom-jato-bicarbonato": {
    politica: "opcional",
    observacao:
      "Ligação ao ponto de ar comprimido e teste com a equipe, quando a clínica pedir.",
  },
  "fotopolimerizador-led-1200": {
    politica: "nao_oferecida",
    observacao: "Sem fio: carrega na base e está pronto para uso. Não há instalação a fazer.",
  },
  "camera-intraoral-hd-usb": {
    politica: "nao_oferecida",
    observacao:
      "Liga na porta USB do computador. A equipe confere a compatibilidade com o seu software antes da entrega.",
  },
};
