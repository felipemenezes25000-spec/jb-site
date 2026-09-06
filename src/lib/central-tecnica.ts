/* ============================================================================
   Central Técnica JB — a regra de quando um artigo pode ir ao ar

   Um artigo aqui afirma coisas sobre equipamento de saúde: o que observar numa
   autoclave que não pressuriza, quando parar de usar, o que só o técnico
   resolve. Publicar isso sem quem assine e sem quem confira é diferente de
   publicar um texto errado sobre qualquer outro assunto — o leitor é um
   dentista tomando decisão sobre um aparelho que esteriliza instrumental.

   Por isso a regra de publicação mora aqui, pura e testada, e não espalhada
   por um botão do painel. E por isso ela é uma união discriminada: ou o artigo
   pode ir ao ar, ou existe uma lista do que falta. Não há caminho em que a
   ausência de revisor vire uma publicação.

   O escopo é explícito num ponto que este módulo faz cumprir: **ausência de
   revisão não autoriza nome de revisor fictício nem botão "revisado" marcado
   pelo agente.**
   ============================================================================ */

export type EstadoDoArtigo = "rascunho" | "em_revisao" | "publicado" | "arquivado";

export const ROTULO_ESTADO_ARTIGO: Record<EstadoDoArtigo, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export const EXPLICACAO_ESTADO_ARTIGO: Record<EstadoDoArtigo, string> = {
  rascunho: "Escrito, ainda sem assinatura técnica. Não aparece no site.",
  em_revisao: "Fechado pelo autor, esperando o revisor. Continua fora do site.",
  publicado: "Assinado, revisado e no ar.",
  arquivado: "Saiu do ar. O endereço continua respondendo, dizendo que saiu.",
};

export type TemaDoArtigo = "autoclave" | "compressor" | "vacuo" | "compra" | "operacao";

export const ROTULO_TEMA: Record<TemaDoArtigo, string> = {
  autoclave: "Autoclave",
  compressor: "Compressor",
  vacuo: "Vácuo e sucção",
  compra: "Comprar e comparar",
  operacao: "Rotina da clínica",
};

/** Rascunho, em revisão e arquivado não são conteúdo público. Só publicado é. */
export function visivelAoPublico(estado: EstadoDoArtigo): boolean {
  return estado === "publicado";
}

/* ------------------------------------------------- pode ir ao ar? */

export type FatosDoArtigo = {
  temTitulo: boolean;
  /** Comprimento do corpo em texto puro, sem marcação. */
  tamanhoDoCorpo: number;
  autorId: string | null;
  revisorId: string | null;
  revisadoEm: Date | null;
  fontes: number;
  /** `true` quando o artigo orienta conduta sobre o equipamento. */
  orientaConduta: boolean;
};

export type ImpedimentoDePublicacao = {
  /** O que falta, em português, uma linha por pendência. */
  falta: string[];
};

/** Abaixo disto não é artigo: é anotação. */
export const CORPO_MINIMO = 800;

/**
 * O que impede este artigo de ser publicado — ou `null` quando nada impede.
 *
 * A ordem das verificações é a ordem em que a redação resolve: escrever, depois
 * assinar, depois mandar revisar. A lista sai inteira, e não a primeira
 * pendência: quem vai publicar precisa saber tudo que falta de uma vez.
 */
export function impedimentoDePublicacao(fatos: FatosDoArtigo): ImpedimentoDePublicacao | null {
  const falta: string[] = [];

  if (!fatos.temTitulo) falta.push("um título");
  if (fatos.tamanhoDoCorpo < CORPO_MINIMO) {
    falta.push(`corpo com pelo menos ${CORPO_MINIMO} caracteres (há ${fatos.tamanhoDoCorpo})`);
  }
  if (!fatos.autorId) falta.push("o autor técnico que assina o texto");
  if (!fatos.revisorId) falta.push("o revisor técnico");

  /* Revisão do próprio texto pelo próprio autor não é revisão. É o atalho que
     um prazo apertado sempre sugere, e é o que transforma "revisado por" numa
     linha decorativa. */
  if (fatos.autorId && fatos.revisorId && fatos.autorId === fatos.revisorId) {
    falta.push("um revisor diferente do autor");
  }

  if (!fatos.revisadoEm) falta.push("a data em que a revisão aconteceu");

  /* Artigo que orienta conduta sobre equipamento pressurizado ou energizado
     sem fonte é opinião com aparência de instrução. */
  if (fatos.orientaConduta && fatos.fontes === 0) {
    falta.push("pelo menos uma fonte (manual do fabricante, norma ou orientação técnica)");
  }

  return falta.length > 0 ? { falta } : null;
}

/* ------------------------------------------------------ aplicabilidade */

/**
 * A frase de aplicabilidade do artigo.
 *
 * Lista vazia NÃO vira "vale para todos os equipamentos". O escopo pede o
 * contrário: documentar limite por fabricante e modelo, e não generalizar um
 * procedimento. Quando ninguém declarou o limite, a página diz que ninguém
 * declarou — que é a informação verdadeira disponível.
 */
export function fraseDeAplicabilidade(modelos: readonly string[]): string {
  const lista = modelos.map((item) => item.trim()).filter(Boolean);

  if (lista.length === 0) {
    return (
      "Este texto não declara a que marcas e modelos se aplica. Procedimento e peça " +
      "mudam de um fabricante para outro — confirme no manual do seu equipamento antes " +
      "de agir."
    );
  }

  if (lista.length === 1) {
    return `Escrito para ${lista[0]}. Outros modelos podem se comportar de outro jeito.`;
  }

  const ultimo = lista.at(-1) as string;
  return (
    `Escrito para ${lista.slice(0, -1).join(", ")} e ${ultimo}. ` +
    "Outros modelos podem se comportar de outro jeito."
  );
}

/* --------------------------------------------------------------- datas */

/**
 * A data que a página mostra, e a frase que a acompanha.
 *
 * `null` quando não há data real. O escopo tem uma linha inteira sobre isto —
 * "não invente uma data de revisão recente a cada build" — e a única forma de
 * cumpri-la é esta função nunca receber `new Date()` como padrão.
 */
export function dataEditorial(entrada: {
  publicadoEm: Date | null;
  revisadoEm: Date | null;
}): { data: Date; rotulo: "Publicado em" | "Revisado em" } | null {
  if (entrada.revisadoEm) return { data: entrada.revisadoEm, rotulo: "Revisado em" };
  if (entrada.publicadoEm) return { data: entrada.publicadoEm, rotulo: "Publicado em" };
  return null;
}

/* ---------------------------------------------------------- endereços */

/** Slug de artigo: minúsculas, dígitos e hífen. Nada além disso. */
export function slugDeArtigo(bruto: string): string {
  return bruto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Endereços que a Central Técnica não pode ocupar.
 *
 * `/central-tecnica/busca` e afins seriam rota da própria seção; um artigo com
 * esse slug tiraria a página do ar sem ninguém entender por quê.
 */
export const SLUGS_RESERVADOS = new Set(["busca", "tema", "novo", "rascunhos", "api"]);

export function slugDisponivel(slug: string): boolean {
  return slug.length >= 3 && !SLUGS_RESERVADOS.has(slug);
}
