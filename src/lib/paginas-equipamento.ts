import { equipamentoPorId, type Equipamento, type IdEquipamento } from "@/lib/diagnostico";

/* ============================================================================
   Uma página por equipamento, para o anúncio cair no lugar certo

   Quem clica num anúncio de "conserto de autoclave" e cai numa home que fala
   de sete equipamentos tem de procurar a autoclave. Aqui ela já está no
   título, na foto, nos defeitos e na mensagem do WhatsApp. É também o que o
   buscador quer ver para "conserto de compressor odontológico".

   O texto segue a regra do site: nada de prazo, preço, garantia em meses ou
   afirmação técnica que a JB não confirmou. Os defeitos são os mesmos do
   diagnóstico (`@/lib/diagnostico`), escritos como o dentista vê o problema.
   Os cuidados de "enquanto isso" são de bom senso e de segurança (desligar,
   esfriar, não forçar), não roteiro de conserto: ninguém deve abrir o
   equipamento por causa de uma página da JB.

   Módulo puro: as páginas, o rodapé, o mapa do site e os testes leem daqui.
   ============================================================================ */

export type Pergunta = { pergunta: string; resposta: string };

export type VisualDoEquipamento =
  /** Recorte do equipamento em fundo branco (`public/site/equip`). */
  | { tipo: "recorte"; src: string }
  /** Sem recorte bom: foto de bancada, cortada para o enquadramento. */
  | { tipo: "foto"; src: string; posicao: string };

export type PaginaDeEquipamento = {
  /** Caminho da página, sem barra: `/autoclave`. */
  slug: string;
  equipamento: IdEquipamento;
  /** O nome no título, "Cadeira parou?": o do diagnóstico ("Cadeira e equipo") não cabe na pergunta. */
  nomeCurto: string;
  /** Como o equipamento entra no meio de uma frase: "a autoclave". */
  naFrase: string;
  /** O termo que se busca e que se anuncia. */
  palavraChave: string;
  /** Uma ou duas frases sob o título: o que a parada custa para a clínica. */
  chamada: string;
  /** Primeiros cuidados, de segurança, antes da equipe chegar. */
  enquantoIsso: readonly string[];
  /** Perguntas do equipamento, antes das gerais da JB. */
  duvidas: readonly Pergunta[];
  visual: VisualDoEquipamento;
};

const FOTO_DA_BANCADA: VisualDoEquipamento = {
  tipo: "foto",
  src: "/site/bancada.webp",
  posicao: "60% 40%",
};

/**
 * "De qualquer marca?", a mesma resposta para todo equipamento: sim. Sem
 * fabricante na resposta, porque a pergunta é sobre o aparelho da pessoa.
 */
function todasAsMarcas(nome: string): Pergunta {
  return {
    pergunta: `Vocês consertam ${nome} de qualquer marca?`,
    resposta:
      "Sim, de todas as marcas. Na triagem pelo WhatsApp a equipe confirma o modelo antes de combinar o atendimento.",
  };
}

const FOTO_OU_VIDEO =
  "Tire uma foto do painel ou grave um vídeo curto do defeito: a equipe entende mais rápido pelo WhatsApp.";

export const PAGINAS_DE_EQUIPAMENTO: readonly PaginaDeEquipamento[] = [
  {
    slug: "autoclave",
    equipamento: "autoclave",
    nomeCurto: "Autoclave",
    naFrase: "a autoclave",
    palavraChave: "autoclave odontológica",
    chamada:
      "Sem autoclave não tem material esterilizado, e sem material a agenda para. Toque no defeito e a mensagem chega pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue da tomada e espere esfriar antes de abrir a porta.",
      "Nunca force a porta com a câmara quente ou com pressão.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [
      todasAsMarcas("autoclave"),
      {
        pergunta: "Posso usar o material de um ciclo que deu erro?",
        resposta:
          "Ciclo que não completa não garante esterilização. Na dúvida, não use o material desse ciclo e chame a equipe: a triagem ajuda a entender o que aconteceu.",
      },
    ],
    visual: { tipo: "recorte", src: "/site/equip/autoclave.webp" },
  },
  {
    slug: "compressor",
    equipamento: "compressor",
    nomeCurto: "Compressor",
    naFrase: "o compressor",
    palavraChave: "compressor odontológico",
    chamada:
      "Sem ar, as canetas e a seringa tríplice param, e o atendimento para junto. Toque no defeito e a mensagem chega pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue da tomada se ele liga e desliga sem parar ou esquenta demais.",
      "Se sair água ou óleo pela linha de ar, não use nas canetas até a revisão.",
      "Grave um vídeo curto do barulho: na triagem, o som diz muito.",
    ],
    duvidas: [
      todasAsMarcas("compressor"),
      {
        pergunta: "Dá para revisar o compressor antes que ele pare?",
        resposta:
          "Dá, e é o melhor momento: revisão marcada não derruba a agenda. Chame no WhatsApp pedindo a revisão preventiva.",
      },
    ],
    visual: { tipo: "recorte", src: "/site/equip/compressor.webp" },
  },
  {
    slug: "bomba-de-vacuo",
    equipamento: "bomba-vacuo",
    nomeCurto: "Bomba de vácuo",
    naFrase: "a bomba de vácuo",
    palavraChave: "bomba de vácuo odontológica",
    chamada:
      "Sem sucção não dá para atender direito. Toque no defeito e a mensagem chega pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue a bomba se ela fizer barulho anormal ou esquentar.",
      "Confira se o ralo e o filtro da cuspideira não estão entupidos.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [
      todasAsMarcas("bomba de vácuo"),
      {
        pergunta: "Sucção fraca é sempre defeito da bomba?",
        resposta:
          "Nem sempre. A causa pode estar na bomba, no filtro ou na tubulação, e a triagem pelo WhatsApp ajuda a separar uma coisa da outra antes da visita.",
      },
    ],
    visual: { tipo: "recorte", src: "/site/equip/bomba-vacuo.webp" },
  },
  {
    slug: "cadeira-odontologica",
    equipamento: "cadeira",
    nomeCurto: "Cadeira",
    naFrase: "a cadeira",
    palavraChave: "cadeira odontológica e equipo",
    chamada:
      "Cadeira que não sobe, pedal que não responde, refletor apagado: é o consultório inteiro parado. Toque no defeito e a mensagem chega pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue a cadeira no interruptor geral antes de mexer em qualquer coisa.",
      "Se estiver vazando água, feche o registro de água do equipo.",
      "Tire uma foto da etiqueta com a marca e o modelo.",
    ],
    duvidas: [
      todasAsMarcas("cadeira e equipo"),
      {
        pergunta: "O conserto é feito no consultório?",
        resposta:
          "Cadeira é equipamento grande, então o atendimento costuma ser no consultório. Quando alguma peça precisa de bancada, a equipe explica antes.",
      },
    ],
    visual: { tipo: "recorte", src: "/site/equip/cadeira.webp" },
  },
  {
    slug: "seladora",
    equipamento: "seladora",
    nomeCurto: "Seladora",
    naFrase: "a seladora",
    palavraChave: "seladora odontológica",
    chamada:
      "Seladora que não sela deixa o material esterilizado sem embalagem confiável. Toque no defeito e a mensagem chega pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue e espere a barra de selagem esfriar antes de limpar.",
      "Guarde um pedaço de papel com a selagem ruim: ele mostra o defeito.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [todasAsMarcas("seladora")],
    visual: { tipo: "recorte", src: "/site/equip/seladora.webp" },
  },
  {
    slug: "destilador",
    equipamento: "destilador",
    nomeCurto: "Destilador",
    naFrase: "o destilador",
    palavraChave: "destilador de água odontológico",
    chamada:
      "É o destilador que abastece a autoclave. Parado, logo depois é a autoclave que para. Toque no defeito e a mensagem chega pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue da tomada se ele não desliga sozinho.",
      "Se estiver vazando, espere esfriar antes de mexer no reservatório.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [todasAsMarcas("destilador")],
    visual: FOTO_DA_BANCADA,
  },
  {
    slug: "lavadora-ultrassonica",
    equipamento: "lavadora",
    nomeCurto: "Lavadora ultrassônica",
    naFrase: "a lavadora ultrassônica",
    palavraChave: "lavadora ultrassônica odontológica",
    chamada:
      "É ela que limpa o instrumental antes da esterilização. Parada, a central de material trava. Toque no defeito e a mensagem chega pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue e esvazie a cuba antes de mexer no equipamento.",
      "Não ligue a lavadora com a cuba vazia.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [todasAsMarcas("lavadora ultrassônica")],
    visual: { tipo: "recorte", src: "/site/equip/lavadora.webp" },
  },
];

export function paginaPorSlug(slug: string): PaginaDeEquipamento | null {
  return PAGINAS_DE_EQUIPAMENTO.find((pagina) => pagina.slug === slug) ?? null;
}

/** Caminho da página de um equipamento, ou `null` para quem não tem página ("outro"). */
export function caminhoDoEquipamento(id: IdEquipamento): string | null {
  const pagina = PAGINAS_DE_EQUIPAMENTO.find((item) => item.equipamento === id);
  return pagina ? `/${pagina.slug}` : null;
}

/** O equipamento do diagnóstico por trás da página: nome e defeitos. */
export function equipamentoDaPagina(pagina: PaginaDeEquipamento): Equipamento {
  const equipamento = equipamentoPorId(pagina.equipamento);
  if (!equipamento) throw new Error(`Equipamento desconhecido: ${pagina.equipamento}`);
  return equipamento;
}

/** "Conserto de autoclave odontológica em São Paulo". */
export function tituloDaPagina(pagina: PaginaDeEquipamento, cidade: string): string {
  return `Conserto de ${pagina.palavraChave} em ${cidade}`;
}

/**
 * A descrição para o buscador e para a prévia do link.
 *
 * Diz "todas as marcas" e nenhum fabricante: quem busca conserto do próprio
 * aparelho precisa saber que ele entra, qualquer que seja a marca.
 */
export function descricaoDaPagina(pagina: PaginaDeEquipamento, cidade: string): string {
  return `${pagina.nomeCurto} parou? Conserto de ${pagina.palavraChave} de todas as marcas em ${cidade} e região, na clínica ou na bancada. Chame a JB no WhatsApp.`;
}
