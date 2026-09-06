/* ============================================================================
   Comparador técnico

   Uma tabela de comparação é uma máquina de produzir conclusões erradas se a
   ausência de dado for tratada como número. "Potência: —" e "Potência: 0 W"
   parecem a mesma célula vazia e significam coisas opostas: a primeira diz que
   ninguém cadastrou, a segunda diria que o equipamento não consome nada.

   Por isso o valor de cada atributo é união discriminada, e a célula vazia tem
   um tipo próprio. Não existe caminho em que "não sei" vire zero, e não existe
   caminho em que "não sei" conte como vantagem numa recomendação.
   ============================================================================ */

export type ValorDoAtributo =
  | { tipo: "numero"; valor: number; unidade: string }
  | { tipo: "texto"; valor: string }
  | { tipo: "lista"; valores: string[] }
  | { tipo: "ausente" };

export const AUSENTE: ValorDoAtributo = { tipo: "ausente" };

/** O texto de uma célula sem dado. Nunca "0", nunca "—" sozinho. */
export const TEXTO_AUSENTE = "não informado";

export type LinhaDaComparacao = {
  chave: string;
  rotulo: string;
  /** Explica o que o atributo significa, quando não é óbvio. */
  ajuda?: string;
  valores: ValorDoAtributo[];
};

/* ------------------------------------------------------------ formatação */

export function textoDoValor(valor: ValorDoAtributo): string {
  switch (valor.tipo) {
    case "numero":
      return `${valor.valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${valor.unidade}`;
    case "texto":
      return valor.valor;
    case "lista":
      return valor.valores.length > 0 ? valor.valores.join(" · ") : TEXTO_AUSENTE;
    case "ausente":
      return TEXTO_AUSENTE;
  }
}

/* ----------------------------------------------------------- normalização */

/**
 * Milímetros para a unidade legível.
 *
 * Comparar "450" com "1,2 m" é comparar número com nada. A normalização é para
 * a mesma unidade em toda a linha — e a unidade escolhida é a que produz menos
 * casas decimais no conjunto, não a do primeiro produto.
 */
export function dimensoesLegiveis(
  larguraMm: number | null,
  alturaMm: number | null,
  profundidadeMm: number | null,
): ValorDoAtributo {
  const partes = [larguraMm, alturaMm, profundidadeMm];
  if (partes.every((parte) => parte === null)) return AUSENTE;

  /* Faltando uma dimensão, a comparação de volume não se faz — mas as que
     existem continuam sendo informação. O texto diz qual falta em vez de
     inventar zero. */
  const texto = partes
    .map((parte) => (parte === null ? "?" : `${Math.round(parte / 10)}`))
    .join(" × ");

  return { tipo: "texto", valor: `${texto} cm (L × A × P)` };
}

export function pesoLegivel(gramas: number | null): ValorDoAtributo {
  if (gramas === null || gramas <= 0) return AUSENTE;
  return gramas >= 1000
    ? { tipo: "numero", valor: gramas / 1000, unidade: "kg" }
    : { tipo: "numero", valor: gramas, unidade: "g" };
}

export function garantiaLegivel(meses: number | null): ValorDoAtributo {
  if (meses === null || meses <= 0) return AUSENTE;
  return meses % 12 === 0
    ? { tipo: "numero", valor: meses / 12, unidade: meses === 12 ? "ano" : "anos" }
    : { tipo: "numero", valor: meses, unidade: "meses" };
}

/* ------------------------------------------------- as três perguntas */

export type RespostasDaClinica = {
  /** Quantos ciclos ou atendimentos por dia o equipamento vai atender. */
  volume: "baixo" | "medio" | "alto" | "nao_sei";
  /** A clínica já tem a infraestrutura que o equipamento exige? */
  infraestrutura: "pronta" | "precisa_obra" | "nao_sei";
  /** O que pesa mais na decisão. */
  prioridade: "menor_preco" | "menor_manutencao" | "maior_capacidade" | "nao_sei";
};

export const PERGUNTAS = [
  {
    chave: "volume" as const,
    titulo: "Qual o volume de uso?",
    ajuda: "Quantas vezes por dia este equipamento vai trabalhar num dia cheio.",
    opcoes: [
      { valor: "baixo" as const, rotulo: "Até 3 vezes por dia" },
      { valor: "medio" as const, rotulo: "De 4 a 8 vezes" },
      { valor: "alto" as const, rotulo: "Mais de 8 vezes" },
      { valor: "nao_sei" as const, rotulo: "Ainda não sei" },
    ],
  },
  {
    chave: "infraestrutura" as const,
    titulo: "Como está o local?",
    ajuda: "Ponto elétrico exclusivo, ponto de água, dreno e espaço na bancada.",
    opcoes: [
      { valor: "pronta" as const, rotulo: "Está tudo pronto" },
      { valor: "precisa_obra" as const, rotulo: "Vai precisar de adequação" },
      { valor: "nao_sei" as const, rotulo: "Preciso conferir" },
    ],
  },
  {
    chave: "prioridade" as const,
    titulo: "O que pesa mais?",
    ajuda: "Não há resposta certa — cada clínica tem a sua restrição.",
    opcoes: [
      { valor: "menor_preco" as const, rotulo: "O menor investimento agora" },
      { valor: "menor_manutencao" as const, rotulo: "Menos manutenção depois" },
      { valor: "maior_capacidade" as const, rotulo: "Dar conta do movimento" },
      { valor: "nao_sei" as const, rotulo: "Ainda não sei" },
    ],
  },
];

/* --------------------------------------------------------- recomendação */

export type ProdutoComparavel = {
  slug: string;
  nome: string;
  precoCents: number;
  condicao: string;
  garantiaMeses: number | null;
  /** Requisitos de infraestrutura cadastrados. Vazio = não declarado. */
  infraestrutura: string[];
  /** Política de instalação cadastrada. */
  instalacao: string;
};

export type Recomendacao = {
  slug: string | null;
  /** Por que este, em português. Uma linha por critério aplicado. */
  criterios: string[];
  /** O que não pôde ser considerado, e por quê. */
  lacunas: string[];
};

/**
 * Qual faz mais sentido — dentro do que os dados permitem afirmar.
 *
 * A função é conservadora por construção. Cada critério só entra quando existe
 * dado para aplicá-lo, e o que faltou é devolvido em `lacunas` para a tela
 * dizer. Quando nenhum critério se aplica, `slug` volta `null` e a tela mostra
 * a comparação sem eleger vencedor — que é a resposta honesta.
 *
 * O que ela NÃO faz: afirmar compatibilidade clínica ou técnica. Nenhum
 * critério aqui diz "este equipamento atende ao seu procedimento" — isso
 * dependeria de dados que o catálogo não tem, e é justamente a afirmação que o
 * escopo proíbe.
 */
export function recomendar(
  produtos: readonly ProdutoComparavel[],
  respostas: RespostasDaClinica,
): Recomendacao {
  const criterios: string[] = [];
  const lacunas: string[] = [];

  if (produtos.length < 2) {
    return {
      slug: null,
      criterios: [],
      lacunas: ["Escolha pelo menos dois equipamentos para comparar."],
    };
  }

  /* Pontuação simples e explicável. Cada ponto tem uma frase, e a frase é o
     que a tela mostra — um número sem a razão dele seria pior que nada. */
  const pontos = new Map<string, number>(produtos.map((produto) => [produto.slug, 0]));
  const somar = (slug: string, quanto: number) =>
    pontos.set(slug, (pontos.get(slug) ?? 0) + quanto);

  /**
   * O melhor de um critério — ou `null` quando há empate.
   *
   * Empate não pontua. Sem esta função, dois equipamentos com a mesma
   * garantia dariam a vitória ao primeiro da lista, e a ordem em que a pessoa
   * marcou os produtos viraria critério de decisão — invisível e arbitrário.
   */
  const melhorUnico = (
    lista: readonly ProdutoComparavel[],
    valorDe: (produto: ProdutoComparavel) => number,
    direcao: "menor" | "maior",
  ): ProdutoComparavel | null => {
    if (lista.length === 0) return null;
    const valores = lista.map(valorDe);
    const alvo = direcao === "menor" ? Math.min(...valores) : Math.max(...valores);
    const empatados = lista.filter((produto) => valorDe(produto) === alvo);
    return empatados.length === 1 ? empatados[0] : null;
  };

  /* ---- preço, quando é a prioridade e todos têm preço */
  if (respostas.prioridade === "menor_preco") {
    const comPreco = produtos.filter((produto) => produto.precoCents > 0);
    if (comPreco.length === produtos.length) {
      const maisBarato = melhorUnico(comPreco, (produto) => produto.precoCents, "menor");
      if (maisBarato) {
        somar(maisBarato.slug, 3);
        criterios.push("Você marcou o menor investimento como prioridade.");
      } else {
        lacunas.push("Os equipamentos têm o mesmo preço, então ele não desempata.");
      }
    } else {
      /* Produto sob orçamento não é "mais caro" nem "mais barato". Deixá-lo de
         fora da comparação de preço e dizer isso é melhor que assumir. */
      lacunas.push(
        "Um dos equipamentos está sob orçamento, então o preço não entrou na comparação.",
      );
    }
  }

  /* ---- garantia, quando a prioridade é manutenção */
  if (respostas.prioridade === "menor_manutencao") {
    const comGarantia = produtos.filter((produto) => (produto.garantiaMeses ?? 0) > 0);
    if (comGarantia.length === produtos.length) {
      const maiorGarantia = melhorUnico(
        comGarantia,
        (produto) => produto.garantiaMeses ?? 0,
        "maior",
      );
      if (maiorGarantia) {
        somar(maiorGarantia.slug, 2);
        criterios.push("Maior garantia de fábrica, já que menos manutenção é a prioridade.");
      } else {
        lacunas.push("A garantia é a mesma nos dois, então ela não desempata.");
      }
    } else {
      lacunas.push(
        "A garantia não está cadastrada em todos os equipamentos comparados, então ela não " +
          "entrou na conta.",
      );
    }
  }

  /* ---- infraestrutura, quando a clínica não quer obra */
  if (respostas.infraestrutura === "pronta" || respostas.infraestrutura === "precisa_obra") {
    const declararam = produtos.filter((produto) => produto.infraestrutura.length > 0);
    if (declararam.length === produtos.length) {
      const menosExigente = melhorUnico(
        declararam,
        (produto) => produto.infraestrutura.length,
        "menor",
      );
      if (menosExigente) {
        somar(menosExigente.slug, respostas.infraestrutura === "precisa_obra" ? 3 : 1);
        criterios.push(
          respostas.infraestrutura === "precisa_obra"
            ? "Menos requisitos de instalação, já que o local ainda vai precisar de adequação."
            : "Menos requisitos de instalação.",
        );
      } else {
        lacunas.push(
          "Os equipamentos exigem a mesma quantidade de preparação do local.",
        );
      }
    } else {
      /* Aqui está o erro que a função existe para evitar: um equipamento sem
         requisito CADASTRADO pareceria o menos exigente de todos, e ganharia
         a comparação por falta de dado. */
      lacunas.push(
        "Nem todos os equipamentos têm os requisitos de instalação cadastrados. Quem não tem " +
          "não é o menos exigente — é o que ninguém preencheu, e por isso a instalação ficou " +
          "de fora.",
      );
    }
  }

  if (respostas.volume === "nao_sei") {
    lacunas.push("Sem o volume de uso, a capacidade não entrou na comparação.");
  }

  if (criterios.length === 0) {
    return {
      slug: null,
      criterios: [],
      lacunas: [
        ...lacunas,
        "Com as respostas e os dados disponíveis, nenhum dos equipamentos se destaca. A " +
          "comparação abaixo continua valendo — e a equipe técnica ajuda a decidir.",
      ],
    };
  }

  const vencedor = [...pontos.entries()].sort((a, b) => b[1] - a[1])[0];

  /* Empate não elege ninguém. Escolher o primeiro da lista faria a ordem em
     que a pessoa selecionou os produtos virar critério de decisão. */
  const empatou = [...pontos.values()].filter((valor) => valor === vencedor[1]).length > 1;
  if (empatou || vencedor[1] === 0) {
    return {
      slug: null,
      criterios,
      lacunas: [
        ...lacunas,
        "Os equipamentos empataram nos critérios que puderam ser aplicados.",
      ],
    };
  }

  return { slug: vencedor[0], criterios, lacunas };
}
