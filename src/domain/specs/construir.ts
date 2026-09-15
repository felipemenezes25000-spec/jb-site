import {
  DEFINICOES,
  definicoesDaFamilia,
  familiaDoProduto,
} from "@/domain/specs/definicoes";
import { formatarSpec, interpretarValor } from "@/domain/specs/formatar";
import {
  GRUPOS_DA_FICHA,
  type FamiliaEquipamento,
  type FichaDeEspecificacoes,
  type GrupoDaFicha,
  type LinhaDaFicha,
  type ProcedenciaSpec,
  type SpecDefinition,
  type SpecGroupId,
  type SpecValue,
} from "@/domain/specs/schema";

/* ============================================================================
   De cadastro livre a ficha tipada

   O banco guarda `ProductSpec` como texto livre — rótulo e valor digitados no
   painel — e mais uma dúzia de colunas estruturadas (voltage, weightGrams,
   warrantyMonths, anvisaCode...). Antes, cada bloco da página lia um pedaço
   disso à sua maneira, e era daí que vinham as cinco versões do mesmo "220 V".

   Aqui as duas origens viram um objeto só:

     1. As colunas estruturadas preenchem a chave canônica. Elas vencem o texto
        livre: `voltage` é um campo; "Alimentação: 220" é uma frase.
     2. O texto livre preenche o que sobrar, casando o rótulo digitado com a
        chave pelos `aliases` da definição.
     3. O que não casa com nenhuma definição não é jogado fora: vira linha com
        definição sintética, no grupo que o rótulo sugere. Perder dado seria
        pior do que exibi-lo fora da taxonomia.

   Nada é inventado. Chave sem dado não vira zero nem "—" mudo: ela simplesmente
   não entra em `total`, e a tela mostra travessão com `title` explicando que o
   fabricante não informou.
   ============================================================================ */

export type UnidadeParaFicha = {
  serialNumber: string | null;
  manufactureYear: number | null;
  usageHours: number | null;
  usageCycles: number | null;
  warrantyMonths: number | null;
  acquiredFrom?: string | null;
};

export type ProdutoParaFicha = {
  nome: string;
  sku: string;
  modelo?: string | null;
  condicao: string;
  marca?: string | null;
  categoria?: { slug: string; nome: string } | null;
  fabricante?: string | null;
  detentor?: string | null;
  anvisa?: string | null;
  voltagem?: string | null;
  pesoGramas?: number | null;
  larguraMm?: number | null;
  alturaMm?: number | null;
  profundidadeMm?: number | null;
  garantiaMeses?: number | null;
  requisitos?: readonly string[];
  itensInclusos?: readonly string[];
  /** "inclusa" | "a_parte" | "nao_informada" — vem de `installationPolicy`. */
  politicaDeInstalacao?: string | null;
  specs?: readonly { label: string; value: string; order?: number }[];
  unidade?: UnidadeParaFicha | null;
};

const ROTULO_CONDICAO: Record<string, string> = {
  novo: "Novo",
  seminovo: "Seminovo JB",
  usado: "Usado",
  recondicionado: "Recondicionado JB",
};

/* Espelha `InstallationPolicy`. "Instalação: inclusa no preço" contra
   "opcional, à parte" é uma diferença de milhares de reais entre dois modelos,
   e era a única informação que só existia no comparador — na ficha da PDP ela
   estava enterrada em prosa dentro de um acordeão. */
const ROTULO_INSTALACAO: Record<string, string> = {
  inclusa: "Inclusa no preço",
  opcional: "Opcional, cobrada à parte",
  sob_consulta: "Sob consulta",
  nao_oferecida: "A JB não instala este equipamento",
  nao_informada: "",
};

/**
 * Para qual atributo um valor de "Ciclo" deve ir.
 *
 * O campo é um só no cadastro e guarda duas coisas diferentes. Quem decide é
 * o valor: grau Celsius vai para temperatura, minuto vai para duração, e o
 * que não for nem um nem outro fica no "Ciclo" genérico — sem que a ficha
 * afirme o que não sabe.
 */
function chaveDoCiclo(valor: string): "temperatura-ciclo" | "duracao-ciclo" | "ciclo" {
  const texto = semAcento(valor);
  if (/°\s*c|graus|\bc\b(?!\w)/.test(texto)) return "temperatura-ciclo";
  if (/\bmin\b|minuto/.test(texto)) return "duracao-ciclo";
  return "ciclo";
}

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function emCentimetros(mm: number) {
  return Number((mm / 10).toFixed(1));
}

/** Grupo provável de um rótulo que não casou com nenhuma definição. */
function grupoProvavel(rotulo: string): SpecGroupId {
  const texto = semAcento(rotulo);
  if (/tensao|voltagem|potencia|consumo|dimens|peso|medida|instalacao|energia|agua|ar comprimido/.test(texto)) {
    return "instalacao";
  }
  if (/garantia|acompanha|inclus|nota fiscal|entrega/.test(texto)) return "comercial";
  if (/serie|fabricacao|uso|procedencia/.test(texto)) return "unidade";
  if (/marca|modelo|fabricante|registro|anvisa|sku|codigo/.test(texto)) return "identidade";
  return "desempenho";
}

/** Definição sintética para um rótulo livre que não existe no registro. */
function definicaoLivre(rotulo: string, ordem: number): SpecDefinition {
  return {
    key: `livre:${semAcento(rotulo).replace(/[^a-z0-9]+/g, "-")}`,
    label: rotulo.trim(),
    group: grupoProvavel(rotulo),
    comparable: true,
    decisive: false,
    order: 500 + ordem,
  };
}

type Coletado = { definicao: SpecDefinition; valor: SpecValue };

/**
 * Monta a ficha inteira de um produto (e, quando existe, da unidade física).
 *
 * O resultado é serializável: pode atravessar de Server Component para Client
 * Component sem perder nada.
 */
export function construirFicha(produto: ProdutoParaFicha): FichaDeEspecificacoes {
  const familia = familiaDoProduto({
    nome: produto.nome,
    categoriaSlug: produto.categoria?.slug,
    categoriaNome: produto.categoria?.nome,
  });

  const permitidas = definicoesDaFamilia(familia);
  const permitidasPorChave = new Map(permitidas.map((d) => [d.key, d]));

  const coletados = new Map<string, Coletado>();

  function registrar(
    key: string,
    value: SpecValue["value"],
    source: ProcedenciaSpec = "fabricante",
    extras: { unit?: SpecValue["unit"]; note?: string } = {},
  ) {
    if (value === null || value === "" || coletados.has(key)) return;
    const definicao = permitidasPorChave.get(key) ?? DEFINICOES.find((d) => d.key === key);
    if (!definicao) return;
    coletados.set(key, {
      definicao,
      valor: { key, value, source, unit: extras.unit, note: extras.note },
    });
  }

  /* ---------------------------------------- 1. colunas estruturadas */

  registrar("marca", produto.marca ?? null);
  registrar("modelo", produto.modelo?.trim() || null);
  registrar("sku", produto.sku);
  registrar("condicao", ROTULO_CONDICAO[produto.condicao] ?? produto.condicao);
  registrar("fabricante", produto.fabricante ?? null);
  registrar("anvisa", produto.anvisa ?? null);
  registrar("detentor", produto.detentor ?? null);

  if (produto.voltagem?.trim()) {
    const definicao = DEFINICOES.find((d) => d.key === "tensao")!;
    const lido = interpretarValor(produto.voltagem, definicao);
    registrar("tensao", lido.valor, "fabricante", { unit: lido.unidade });
  }

  if (
    produto.larguraMm &&
    produto.alturaMm &&
    produto.profundidadeMm
  ) {
    registrar(
      "dimensoes",
      `${emCentimetros(produto.larguraMm).toLocaleString("pt-BR")} × ${emCentimetros(
        produto.alturaMm,
      ).toLocaleString("pt-BR")} × ${emCentimetros(produto.profundidadeMm).toLocaleString(
        "pt-BR",
      )} cm`,
    );
  }

  if (produto.pesoGramas) {
    registrar("peso", Number((produto.pesoGramas / 1000).toFixed(2)), "fabricante", {
      unit: "kg",
    });
  }

  if ((produto.garantiaMeses ?? 0) > 0) {
    registrar("garantia", produto.garantiaMeses!, "fabricante", {
      unit: "meses",
      note: "Garantia do modelo, declarada pelo fabricante.",
    });
  }

  if (produto.politicaDeInstalacao) {
    registrar(
      "instalacao-inclusa",
      ROTULO_INSTALACAO[produto.politicaDeInstalacao] ?? produto.politicaDeInstalacao,
    );
  }

  if (produto.requisitos && produto.requisitos.length > 0) {
    registrar("requisitos", produto.requisitos.join(" · "));
  }

  if (produto.itensInclusos && produto.itensInclusos.length > 0) {
    registrar("itens-inclusos", produto.itensInclusos.join(" · "));
  }

  /* ------------------------------------------ 2. specs de texto livre */

  const livres: Coletado[] = [];

  const ordenadas = [...(produto.specs ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  ordenadas.forEach((spec, indice) => {
    const rotulo = spec.label?.trim();
    const valorBruto = spec.value?.trim();
    if (!rotulo || !valorBruto) return;

    const normalizado = semAcento(rotulo);
    let definicao = permitidas.find((candidata) =>
      candidata.aliases?.some((padrao) => padrao.test(normalizado)),
    );

    /* O "Ciclo" do cadastro se desdobra em dois atributos conforme o valor. */
    if (definicao?.key === "ciclo") {
      const destino = chaveDoCiclo(valorBruto);
      definicao = permitidas.find((candidata) => candidata.key === destino) ?? definicao;
    }

    if (definicao && !coletados.has(definicao.key)) {
      const lido = interpretarValor(valorBruto, definicao);
      if (lido.valor !== null) {
        coletados.set(definicao.key, {
          definicao,
          valor: {
            key: definicao.key,
            value: lido.valor,
            unit: lido.unidade,
            source: "fabricante",
          },
        });
      }
      return;
    }

    if (definicao) return; // já preenchido por coluna estruturada — não duplica

    const sintetica = definicaoLivre(rotulo, indice);
    livres.push({
      definicao: sintetica,
      valor: { key: sintetica.key, value: valorBruto, source: "fabricante" },
    });
  });

  /* ------------------------------------------------ 3. esta unidade */

  const unidade = produto.unidade;
  if (unidade) {
    const nota = "Conferido na bancada da JB.";
    registrar("serie", unidade.serialNumber ?? null, "inspecao-jb", { note: nota });
    registrar("ano-fabricacao", unidade.manufactureYear ?? null, "inspecao-jb", {
      note: nota,
    });
    registrar("horas-uso", unidade.usageHours ?? null, "inspecao-jb", {
      unit: "h",
      note: nota,
    });
    registrar("ciclos-uso", unidade.usageCycles ?? null, "inspecao-jb", {
      unit: "ciclos",
      note: nota,
    });
    registrar("procedencia-unidade", unidade.acquiredFrom?.trim() || null, "inspecao-jb");

    /* Garantia da unidade sobrepõe a do modelo — é a que vale na nota. */
    if ((unidade.warrantyMonths ?? 0) > 0) {
      coletados.set("garantia", {
        definicao: DEFINICOES.find((d) => d.key === "garantia")!,
        valor: {
          key: "garantia",
          value: unidade.warrantyMonths!,
          unit: "meses",
          source: "inspecao-jb",
          note: "Garantia desta unidade, prestada pela JB.",
        },
      });
    }
  }

  /* ------------------------------------------------- 4. montagem */

  const todas = [...coletados.values(), ...livres];

  const grupos: GrupoDaFicha[] = GRUPOS_DA_FICHA.map((grupo) => {
    const linhas: LinhaDaFicha[] = todas
      .filter((item) => item.definicao.group === grupo.id)
      .sort((a, b) => a.definicao.order - b.definicao.order)
      .map((item) => ({
        definicao: item.definicao,
        valor: item.valor,
        texto: formatarSpec(item.definicao, item.valor),
      }))
      .filter((linha) => linha.texto !== null);

    return { id: grupo.id, titulo: grupo.titulo, resumo: grupo.resumo, linhas };
  }).filter((grupo) => grupo.linhas.length > 0);

  const total = grupos.reduce((soma, grupo) => soma + grupo.linhas.length, 0);

  const decisivas = grupos
    .flatMap((grupo) => grupo.linhas)
    .filter((linha) => linha.definicao.decisive)
    .sort((a, b) => a.definicao.order - b.definicao.order)
    .slice(0, 3);

  const procedencias = [
    ...new Set(
      grupos.flatMap((grupo) =>
        grupo.linhas.map((linha) => linha.valor?.source ?? "fabricante"),
      ),
    ),
  ] as ProcedenciaSpec[];

  return { familia, grupos, total, decisivas, procedencias };
}

/** As chaves comparáveis de uma família, na ordem da ficha. */
export function chavesComparaveis(familia: FamiliaEquipamento): SpecDefinition[] {
  return definicoesDaFamilia(familia).filter((definicao) => definicao.comparable);
}
