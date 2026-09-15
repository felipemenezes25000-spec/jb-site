/* ============================================================================
   Uma frase para o estoque de um produto

   Três cartões desenhavam o mesmo produto em três lugares da loja — a home
   (`CardVitrine`), o catálogo (`CardProdutoMarketplace`) e a conta
   (`CardProduto`) — e cada um escrevia a própria frase sobre a disponibilidade
   dele, a partir das mesmas três colunas. O resultado, para a MESMA autoclave
   com três unidades, no mesmo minuto:

     · home:      "Últimas 3 un"
     · conta:     "Últimas 3 unidades"
     · catálogo:  "Em estoque"

   As duas primeiras são a mesma coisa escrita de dois jeitos. A terceira é
   outra afirmação: o catálogo não tinha o degrau de "acabando" e dizia o mesmo
   de três unidades e de quarenta. Quem chega pela home com urgência e clica
   para o catálogo vê a urgência desaparecer sem que nada tenha mudado no
   estoque.

   Aqui a frase é uma só. O `tom` é o que cada cartão traduz para a sua própria
   cor — apresentação continua sendo de quem desenha; o que o site AFIRMA sobre
   o estoque, não.
   ============================================================================ */

/** A partir de quantas unidades a loja deixa de tratar como "acabando". */
const POUCAS_UNIDADES = 3;

export type TomDaDisponibilidade =
  /** Não há o que comprar. */
  | "esgotado"
  /** Peça única — existe uma, e só uma. */
  | "unico"
  /** Estoque baixo o bastante para a urgência ser verdadeira. */
  | "pouco"
  /** Estoque confortável. */
  | "ok"
  /** Produto sem controle de estoque: a JB consegue, mas não conta unidades. */
  | "sob-encomenda";

export type Disponibilidade = {
  texto: string;
  tom: TomDaDisponibilidade;
};

export type EstoqueDoProduto = {
  trackInventory: boolean;
  stock: number;
  unique: boolean;
};

export function disponibilidadeDoProduto(produto: EstoqueDoProduto): Disponibilidade {
  /* Sem controle de estoque não existe "acabando" nem "esgotado": o número da
     coluna `stock` não quer dizer nada nesse cadastro, e ler dele um degrau de
     urgência seria inventar escassez. */
  if (!produto.trackInventory) {
    return produto.unique
      ? { texto: "Unidade única", tom: "unico" }
      : { texto: "Disponível", tom: "sob-encomenda" };
  }

  if (produto.stock <= 0) {
    /* "Unidade vendida" e não "Indisponível": num anúncio de peça única, a
       diferença entre "acabou por enquanto" e "esta máquina tem dono" é a
       diferença entre esperar reposição e procurar outra. */
    return produto.unique
      ? { texto: "Unidade vendida", tom: "esgotado" }
      : { texto: "Indisponível", tom: "esgotado" };
  }

  if (produto.unique) return { texto: "Unidade única", tom: "unico" };

  if (produto.stock <= POUCAS_UNIDADES) {
    return {
      texto:
        produto.stock === 1 ? "Última unidade" : `Últimas ${produto.stock} unidades`,
      tom: "pouco",
    };
  }

  return { texto: "Em estoque", tom: "ok" };
}
