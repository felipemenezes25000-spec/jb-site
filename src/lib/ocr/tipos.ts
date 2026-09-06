/* ============================================================================
   OCR de etiqueta — o contrato

   Este arquivo define o que um mecanismo de OCR precisa entregar para o resto
   do sistema, e nada mais. Ele não sabe se a leitura vem de biblioteca local,
   de provedor pago ou de lugar nenhum — e é essa ignorância que permite trocar
   o mecanismo sem tocar na tela nem na regra de interpretação.

   Uma decisão de tipo que carrega quase todo o resto: `Leitura` é união
   discriminada, e o caso de falha é tão detalhado quanto o de sucesso. Um OCR
   que não leu precisa dizer POR QUE não leu, porque a tela vai oferecer coisas
   diferentes para "imagem ruim" e para "mecanismo não configurado".
   ============================================================================ */

/** Um campo lido, com o que veio e o que se entendeu. */
export type CampoLido = {
  /**
   * O texto exatamente como saiu da etiqueta.
   *
   * Preservado sempre. Normalização apaga diferença, e diferença entre modelos
   * de fabricante costuma ser exatamente um caractere — "Vitale 21" e
   * "Vitale-21" podem ser o mesmo aparelho ou dois; quem sabe é o técnico, e
   * ele precisa ver o original para decidir.
   */
  bruto: string;
  /** O valor limpo, para preencher o formulário. */
  valor: string;
  /**
   * Confiança de 0 a 1, quando o mecanismo informa. `null` quando não informa.
   *
   * `null` NÃO é zero e não é um. É "não sei", e a tela mostra isso em vez de
   * inventar uma barrinha cheia.
   */
  confianca: number | null;
  /**
   * Outras leituras plausíveis do mesmo campo.
   *
   * É onde `O`/`0` e `I`/`1` aparecem. Um serial `1O0I` tem quatro leituras
   * possíveis, e nenhuma delas é mais verdadeira que a outra sem o aparelho na
   * frente — então as alternativas viram opções na tela, não um palpite.
   */
  alternativas: string[];
};

export type CamposDaEtiqueta = {
  marca: CampoLido | null;
  modelo: CampoLido | null;
  serial: CampoLido | null;
  voltagem: CampoLido | null;
};

export type MotivoDaFalha =
  | "sem_mecanismo"
  | "imagem_ilegivel"
  | "nada_encontrado"
  | "varias_etiquetas"
  | "falha_do_provedor"
  | "resposta_invalida"
  | "limite_atingido";

export const EXPLICACAO_DA_FALHA: Record<MotivoDaFalha, string> = {
  sem_mecanismo:
    "A leitura automática de etiqueta não está configurada neste ambiente. " +
    "Preencha os campos à mão — leva o mesmo tempo e não depende de nada.",
  imagem_ilegivel:
    "Não deu para ler a etiqueta nesta foto. Tente de novo com mais luz, sem reflexo e com a " +
    "câmera paralela à etiqueta.",
  nada_encontrado:
    "A foto foi lida, mas nenhum campo de etiqueta foi reconhecido. Pode ser outra parte do " +
    "equipamento — a etiqueta costuma ficar atrás ou embaixo.",
  varias_etiquetas:
    "A foto tem mais de uma etiqueta. Fotografe uma de cada vez: com duas no quadro não dá " +
    "para saber qual número é de qual.",
  falha_do_provedor:
    "O serviço de leitura não respondeu. O preenchimento manual continua disponível.",
  resposta_invalida:
    "A resposta do serviço de leitura não pôde ser aproveitada. Preencha à mão.",
  limite_atingido:
    "Muitas leituras em pouco tempo. Espere um pouco, ou preencha os campos à mão.",
};

export type Leitura =
  | { ok: true; campos: CamposDaEtiqueta; mecanismo: string }
  | { ok: false; motivo: MotivoDaFalha; detalhe?: string };

/**
 * O que um mecanismo de OCR precisa implementar.
 *
 * `nome` aparece na tela e no diagnóstico: quem opera precisa saber de onde
 * veio a sugestão que está conferindo.
 */
export type MecanismoDeOcr = {
  nome: string;
  /** Recebe os bytes da imagem e devolve as LINHAS de texto encontradas. */
  lerLinhas: (imagem: Buffer, mime: string) => Promise<string[]>;
};
