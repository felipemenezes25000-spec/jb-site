import type { FichaDeEspecificacoes, ProcedenciaSpec } from "@/domain/specs/schema";

export type MedidasDoProduto = {
  largura: string;
  altura: string;
  profundidade: string;
  fonte: ProcedenciaSpec;
};

export type PontoDeInstalacao = {
  chave: string;
  rotulo: string;
  valor: string;
  ajuda?: string;
  fonte: ProcedenciaSpec;
};

export type ExploracaoDoProduto = {
  medidas: MedidasDoProduto | null;
  instalacao: PontoDeInstalacao[];
};

/** Apenas apresenta a ficha canônica; não deduz conexões ou folgas pela foto. */
export function exploracaoDoProduto(ficha: FichaDeEspecificacoes): ExploracaoDoProduto {
  const linhas = ficha.grupos.flatMap((grupo) => grupo.linhas);
  const dimensoes = linhas.find((linha) => linha.definicao.key === "dimensoes");
  const partes = dimensoes?.texto?.trim().match(
    /^((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?)\s*[×x]\s*((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?)\s*[×x]\s*((?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?)\s*(cm|mm)$/i,
  );
  const medidasValidas = partes?.slice(1, 4).every((valor) => {
    const numero = Number(valor.replaceAll(".", "").replace(",", "."));
    return Number.isFinite(numero) && numero > 0;
  });
  const medidas = partes && medidasValidas && dimensoes?.valor ? {
    largura: `${partes[1]} ${partes[4]}`,
    altura: `${partes[2]} ${partes[4]}`,
    profundidade: `${partes[3]} ${partes[4]}`,
    fonte: dimensoes.valor.source,
  } : null;

  const instalacao: PontoDeInstalacao[] = [];
  for (const chave of ["tensao", "potencia", "requisitos"]) {
    const linha = linhas.find((item) => item.definicao.key === chave);
    if (!linha?.texto?.trim() || !linha.valor) continue;
    const valores = chave === "requisitos" ? linha.texto.split(" · ") : [linha.texto];
    valores.filter((valor) => valor.trim()).forEach((valor, indice) => {
      instalacao.push({
        chave: `${chave}-${indice}`,
        rotulo: chave === "requisitos" ? "Prepare o local" : linha.definicao.label,
        valor: valor.trim(),
        ajuda: chave === "requisitos" ? undefined : linha.definicao.helpText,
        fonte: linha.valor!.source,
      });
    });
  }
  return { medidas, instalacao };
}
