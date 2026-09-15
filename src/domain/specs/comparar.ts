import { construirFicha, type ProdutoParaFicha } from "@/domain/specs/construir";
import { chaveDeComparacao } from "@/domain/specs/formatar";
import type {
  FamiliaEquipamento,
  FichaDeEspecificacoes,
  LinhaDaFicha,
} from "@/domain/specs/schema";

/* ============================================================================
   Comparação entre produtos — a mesma ficha, lado a lado

   O comparador "completo" comparava preço, condição, marca, voltagem,
   dimensões, peso, garantia, instalação, local e o que vem na caixa — e não
   comparava capacidade, ciclo nem bandejas. Para autoclave, capacidade é o
   atributo de decisão. Ele anunciava "8 de 10 atributos mudam" sem tocar no
   que realmente muda.

   A causa era a mesma da ficha: cada tela montava a própria lista de
   atributos. Aqui a lista vem do registro — `comparable: true` — e os valores
   vêm de `construirFicha`. Capacidade e ciclo entram sozinhos, "Secagem: —"
   passa a significar "não cadastrado" de verdade, e o contador de divergências
   passa a contar o que a tabela mostra.

   Duas regras que a tabela precisa respeitar:

   1. **Linha sem nenhum valor não existe.** Uma linha inteira de travessões
      ocupa altura e não informa nada.
   2. **Divergência é medida no valor comparável, não no texto.** "220 V" e
      "220" eram considerados diferentes antes de `chaveDeComparacao` existir.
   ============================================================================ */

export type ColunaComparada = {
  /** Chave canônica ou `livre:...` para atributo fora do registro. */
  key: string;
  label: string;
  unidade?: string;
  /** Um texto por produto, na mesma ordem em que foram passados. */
  valores: (string | null)[];
  /** `true` quando os produtos não dizem a mesma coisa. */
  diverge: boolean;
  decisive: boolean;
};

export type ComparacaoDeProdutos = {
  fichas: FichaDeEspecificacoes[];
  linhas: ColunaComparada[];
  /** Quantas linhas divergem — o número que a tela pode anunciar. */
  divergentes: number;
  /** Famílias distintas entre os produtos comparados. */
  familias: FamiliaEquipamento[];
  /**
   * `true` quando os produtos são de famílias diferentes — autoclave contra
   * cuba, por exemplo. A tabela ainda é montada; a tela é que avisa.
   */
  familiasMisturadas: boolean;
};

export function compararProdutos(
  produtos: readonly ProdutoParaFicha[],
): ComparacaoDeProdutos {
  const fichas = produtos.map((produto) => construirFicha(produto));

  const porProduto = fichas.map((ficha) => {
    const mapa = new Map<string, LinhaDaFicha>();
    for (const grupo of ficha.grupos) {
      for (const linha of grupo.linhas) mapa.set(linha.definicao.key, linha);
    }
    return mapa;
  });

  /* A ordem das linhas segue a ordem da ficha do PRIMEIRO produto — é o que a
     pessoa estava olhando quando pediu a comparação. Atributo que só existe
     nos outros entra depois, na ordem em que aparecer. */
  const ordem: string[] = [];
  for (const mapa of porProduto) {
    for (const key of mapa.keys()) if (!ordem.includes(key)) ordem.push(key);
  }

  const linhas: ColunaComparada[] = [];

  for (const key of ordem) {
    const referencia = porProduto.find((mapa) => mapa.has(key))!.get(key)!;
    if (!referencia.definicao.comparable) continue;

    const chaves = porProduto.map((mapa) => {
      const linha = mapa.get(key);
      return linha ? chaveDeComparacao(linha.definicao, linha.valor) : null;
    });

    /* Uma coluna, uma unidade.

       `textoDaGarantia` escreve 6 como "6 meses" e 12 como "1 ano" — cada um
       certo sozinho, e os dois errados lado a lado. Era o que a auditoria
       fotografou: "6 meses · 1 ano · 1 ano" na mesma linha da tabela, sem como
       o olho comparar. Quando a linha mistura as duas escalas, ela inteira sai
       em meses, que é a menor. */
    const numeros = chaves.filter((valor): valor is number => typeof valor === "number");
    const misturaEscala =
      referencia.definicao.unit === "meses" &&
      numeros.some((valor) => valor < 12) &&
      numeros.some((valor) => valor >= 12);

    const valores = porProduto.map((mapa) => {
      const linha = mapa.get(key);
      if (!linha) return null;
      if (misturaEscala && typeof linha.valor?.value === "number") {
        const meses = linha.valor.value;
        return `${meses} ${meses === 1 ? "mês" : "meses"}`;
      }
      return linha.texto;
    });

    if (valores.every((valor) => valor === null)) continue;

    linhas.push({
      key,
      label: referencia.definicao.label,
      unidade: referencia.definicao.unit,
      valores,
      diverge: new Set(chaves.map((valor) => String(valor))).size > 1,
      decisive: referencia.definicao.decisive,
    });
  }

  linhas.sort((a, b) => {
    if (a.decisive !== b.decisive) return a.decisive ? -1 : 1;
    return ordem.indexOf(a.key) - ordem.indexOf(b.key);
  });

  const familias = [...new Set(fichas.map((ficha) => ficha.familia))];

  return {
    fichas,
    linhas,
    divergentes: linhas.filter((linha) => linha.diverge).length,
    familias,
    familiasMisturadas:
      familias.filter((familia) => familia !== "generico").length > 1,
  };
}
