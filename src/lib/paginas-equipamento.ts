import { equipamentoPorId, type Equipamento, type IdEquipamento } from "@/lib/diagnostico";
import { imagemDoPortfolio } from "@/lib/portfolio-assistencia";

/* ============================================================================
   Uma página por equipamento, para o anúncio cair no lugar certo

   Quem clica num anúncio de "conserto de autoclave" e cai numa home que fala
   de sete equipamentos tem de procurar a autoclave. Aqui ela já está no
   título, na foto, nos defeitos e na mensagem do WhatsApp. É também o que o
   buscador quer ver para "conserto de compressor odontológico".

   O texto segue a regra do site: nada de prazo, preço, garantia em meses ou
   afirmação técnica que a JB não confirmou. Os defeitos são os mesmos do
   diagnóstico (`@/lib/diagnostico`), escritos como a clínica percebe o
   problema. Os cuidados de "enquanto isso" ficam limitados a segurança,
   observação externa e preservação de evidência: esta página nunca ensina a
   desmontar, testar peça, burlar proteção ou reparar equipamento.

   Módulo puro: as páginas, o rodapé, o mapa do site e os testes leem daqui.
   ============================================================================ */

/**
 * Pergunta de um equipamento. Com `tema`, ela ocupa o lugar da pergunta geral
 * do mesmo tema na lista de dúvidas, em vez de repeti-la com outras palavras.
 */
export type Pergunta = { pergunta: string; resposta: string; tema?: "marcas" };

export type VisualDoEquipamento =
  /** Recorte do equipamento em fundo branco, o mesmo do portfólio (`public/site/equip/portfolio`). */
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
  /** Primeiros cuidados, de segurança e observação externa, antes da avaliação. */
  enquantoIsso: readonly string[];
  /** Perguntas do equipamento, antes das gerais da JB. */
  duvidas: readonly Pergunta[];
  visual: VisualDoEquipamento;
};

/**
 * "De qualquer marca?", a mesma resposta para todo equipamento: sim. Sem
 * fabricante na resposta, porque a pergunta é sobre o aparelho da pessoa.
 */
function todasAsMarcas(nome: string): Pergunta {
  return {
    tema: "marcas",
    pergunta: `Vocês consertam ${nome} de qualquer marca?`,
    resposta:
      "Sim, de todas as marcas. Marca, modelo e sintoma entram na triagem quando a clínica os informa, antes de a equipe definir o próximo passo.",
  };
}

const FOTO_OU_VIDEO =
  "Tire uma foto do painel ou grave um vídeo curto do sintoma: isso ajuda a equipe a entender o contexto pelo WhatsApp.";

export const PAGINAS_DE_EQUIPAMENTO: readonly PaginaDeEquipamento[] = [
  {
    slug: "autoclave",
    equipamento: "autoclave",
    nomeCurto: "Autoclave",
    naFrase: "a autoclave",
    palavraChave: "autoclave odontológica",
    chamada:
      "Sem a autoclave funcionando, o instrumental não passa pela esterilização e a rotina da clínica sente. Toque no defeito e a mensagem fica pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue o equipamento se houver comportamento anormal e aguarde o resfriamento conforme o manual do fabricante.",
      "Não force a porta, não tente liberar pressão e não desative nenhum mecanismo de segurança.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [
      todasAsMarcas("autoclave"),
      {
        pergunta: "Posso usar o material de um ciclo que deu erro?",
        resposta:
          "Se o ciclo apresentou erro ou não concluiu, não considere o material esterilizado por conta própria. Siga o protocolo da clínica e as orientações do fabricante para reprocessamento, e chame a assistência para avaliar o equipamento.",
      },
    ],
    visual: { tipo: "recorte", src: imagemDoPortfolio("autoclave") },
  },
  {
    slug: "compressor",
    equipamento: "compressor",
    nomeCurto: "Compressor",
    naFrase: "o compressor",
    palavraChave: "compressor odontológico",
    chamada:
      "Sem ar comprimido, canetas e seringa tríplice deixam de funcionar. Toque no defeito e a mensagem fica pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue o equipamento se ele liga e desliga repetidamente, apresenta cheiro incomum ou aquece de forma anormal.",
      "Se houver água, óleo ou outra contaminação aparente na linha de ar, interrompa o uso do equipamento até avaliação técnica.",
      "Grave um vídeo curto do ruído sem abrir ou desmontar o compressor.",
    ],
    duvidas: [
      todasAsMarcas("compressor"),
      {
        pergunta: "Dá para revisar o compressor antes que ele pare?",
        resposta:
          "A manutenção preventiva pode ser programada antes de uma falha. Chame no WhatsApp para a equipe orientar a avaliação e combinar a forma de atendimento.",
      },
    ],
    visual: { tipo: "recorte", src: imagemDoPortfolio("compressor") },
  },
  {
    slug: "bomba-de-vacuo",
    equipamento: "bomba-vacuo",
    nomeCurto: "Bomba de vácuo",
    naFrase: "a bomba de vácuo",
    palavraChave: "bomba de vácuo odontológica",
    chamada:
      "Sem sucção, parte do atendimento fica comprometida. Toque no defeito e a mensagem fica pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue a bomba se houver ruído, cheiro ou aquecimento fora do normal.",
      "Sem desmontar nada, registre se a sucção está fraca em um ponto específico ou em toda a clínica.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [
      todasAsMarcas("bomba de vácuo"),
      {
        pergunta: "Sucção fraca é sempre defeito da bomba?",
        resposta:
          "Nem sempre. A causa pode estar em diferentes pontos do sistema. A triagem registra onde o sintoma aparece e a avaliação técnica confirma a origem.",
      },
    ],
    visual: { tipo: "recorte", src: imagemDoPortfolio("bomba-de-vacuo") },
  },
  {
    slug: "cadeira-odontologica",
    equipamento: "cadeira",
    nomeCurto: "Cadeira",
    naFrase: "a cadeira",
    palavraChave: "cadeira odontológica e equipo",
    chamada:
      "Cadeira que não sobe, pedal que não responde ou refletor apagado pode comprometer o consultório. Toque no defeito e a mensagem fica pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue a cadeira no interruptor geral se houver falha elétrica, movimento inesperado ou vazamento.",
      "Em caso de vazamento de água, feche o registro externo da clínica se ele estiver identificado e acessível; não desmonte nem abra o equipo.",
      "Tire uma foto externa da etiqueta com a marca e o modelo, se ela estiver acessível.",
    ],
    duvidas: [
      todasAsMarcas("cadeira e equipo"),
      {
        pergunta: "O conserto é feito no consultório?",
        resposta:
          "Por ser um equipamento instalado, a avaliação da cadeira costuma começar no consultório. Quando alguma peça ou conjunto precisa de bancada, a equipe explica a forma de atendimento antes.",
      },
    ],
    visual: { tipo: "recorte", src: imagemDoPortfolio("cadeira-odontologica") },
  },
  {
    slug: "seladora",
    equipamento: "seladora",
    nomeCurto: "Seladora",
    naFrase: "a seladora",
    palavraChave: "seladora odontológica",
    chamada:
      "Selagem inadequada compromete a embalagem do material esterilizado. Toque no defeito e a mensagem fica pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue e aguarde o resfriamento antes de qualquer limpeza externa, seguindo o manual do fabricante.",
      "Guarde uma amostra da embalagem com a selagem defeituosa para mostrar o sintoma à equipe.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [todasAsMarcas("seladora")],
    visual: { tipo: "recorte", src: imagemDoPortfolio("seladora") },
  },
  {
    slug: "destilador",
    equipamento: "destilador",
    nomeCurto: "Destilador",
    naFrase: "o destilador",
    palavraChave: "destilador de água odontológico",
    chamada:
      "O destilador faz parte da rotina de abastecimento de muitos equipamentos de esterilização. Toque no defeito e a mensagem fica pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue da tomada se houver funcionamento anormal, cheiro incomum ou falha no desligamento automático.",
      "Se houver vazamento, aguarde o equipamento esfriar e não abra carcaça ou componentes internos.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [todasAsMarcas("destilador")],
    visual: { tipo: "recorte", src: imagemDoPortfolio("destilador") },
  },
  {
    slug: "lavadora-ultrassonica",
    equipamento: "lavadora",
    nomeCurto: "Lavadora ultrassônica",
    naFrase: "a lavadora ultrassônica",
    palavraChave: "lavadora ultrassônica odontológica",
    chamada:
      "A lavadora ultrassônica participa da etapa de limpeza do instrumental antes da esterilização. Toque no defeito e a mensagem fica pronta para a equipe técnica da JB.",
    enquantoIsso: [
      "Desligue o equipamento antes de limpeza externa ou manuseio da cuba, seguindo o manual do fabricante.",
      "Não ligue a lavadora com a cuba vazia e não abra a carcaça para testar componentes.",
      FOTO_OU_VIDEO,
    ],
    duvidas: [todasAsMarcas("lavadora ultrassônica")],
    visual: { tipo: "recorte", src: imagemDoPortfolio("lavadora-ultrassonica") },
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
 * aparelho precisa saber que ele entra, qualquer que seja a marca. Cabe em
 * 160 caracteres para a cidade padrão — acima disso o buscador corta e a
 * frase termina no meio.
 */
export function descricaoDaPagina(pagina: PaginaDeEquipamento, cidade: string): string {
  return `${pagina.nomeCurto} parou? Conserto de ${pagina.palavraChave} de todas as marcas em ${cidade} e região, com orçamento antes da troca de peça.`;
}
