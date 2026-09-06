/* ============================================================================
   Resumo antes da visita

   O que o técnico precisa saber antes de sair, montado a partir dos registros
   — e só deles. Nada aqui é gerado por modelo de linguagem, e a razão não é
   ideológica: um resumo automático de um chamado de equipamento pressurizado
   que troque "não pressuriza" por "não aquece" manda o técnico com a peça
   errada, e ninguém percebe até a bancada.

   Três regras governam o arquivo:

   1. **Determinístico.** Cada frase deste resumo aponta para um registro. A
      função `origemDoFato` existe para a tela conseguir mostrar qual.
   2. **Hipótese não é diagnóstico.** Se um dia houver sugestão automatizada,
      ela entra como `sugestao`, com origem, e a tela a marca como interna a
      confirmar. Ela nunca vira o campo de diagnóstico e nunca é publicada ao
      cliente.
   3. **Conflito não se esconde.** Quando o relato de hoje contradiz o
      histórico, isso vira um item destacado — e não uma média silenciosa
      entre as duas versões.

   Texto de cliente, OCR e documento são dados não confiáveis. Nada neste
   módulo os interpreta como instrução, e nenhum deles altera aprovação,
   diagnóstico ou visibilidade.
   ============================================================================ */

export type OrigemDoFato =
  | { tipo: "relato_do_cliente"; quando: Date }
  | { tipo: "registro_de_os"; numero: string; quando: Date }
  | { tipo: "cadastro_do_equipamento" }
  | { tipo: "contrato"; numero: string }
  | { tipo: "sugestao_interna"; mecanismo: string };

export const ROTULO_DA_ORIGEM: Record<OrigemDoFato["tipo"], string> = {
  relato_do_cliente: "Relato do cliente",
  registro_de_os: "Ordem de serviço",
  cadastro_do_equipamento: "Cadastro do equipamento",
  contrato: "Contrato de manutenção",
  sugestao_interna: "Sugestão interna, a confirmar",
};

export type FatoDoPreparo = {
  texto: string;
  origem: OrigemDoFato;
  /** `true` quando o fato merece destaque no topo. */
  destaque?: boolean;
};

/* ------------------------------------------------------------- conflito */

export type IntervencaoAnterior = {
  numero: string;
  quando: Date;
  /** O que foi diagnosticado naquela vez. */
  diagnostico: string;
};

export type Conflito = {
  texto: string;
  anterior: IntervencaoAnterior;
};

/**
 * O relato de hoje contradiz alguma coisa do histórico?
 *
 * A detecção é deliberadamente simples e conservadora: ela procura pelo mesmo
 * sintoma tratado antes. Não porque isso baste para concluir algo — mas porque
 * é o suficiente para o técnico olhar duas vezes, e porque uma heurística mais
 * ambiciosa acabaria escondendo o histórico atrás do palpite dela.
 *
 * Reincidência não é diagnóstico: pode ser peça que falhou de novo, pode ser
 * causa nunca resolvida, pode ser sintoma parecido de origem diferente. O que
 * a função afirma é só que os dois textos falam da mesma coisa.
 */
export function conflitosComOHistorico(
  relatoAtual: string,
  historico: readonly IntervencaoAnterior[],
  agora = new Date(),
): Conflito[] {
  const relato = normalizar(relatoAtual);
  if (relato.length < 8) return [];

  const doze = 365 * 86_400_000;
  const conflitos: Conflito[] = [];

  for (const anterior of historico) {
    if (agora.getTime() - anterior.quando.getTime() > doze) continue;

    const palavrasEmComum = palavrasSignificativas(relato).filter((palavra) =>
      normalizar(anterior.diagnostico).includes(palavra),
    );

    if (palavrasEmComum.length >= 2) {
      conflitos.push({
        texto:
          `O relato de agora se parece com o que foi atendido na ${anterior.numero}. ` +
          "Vale conferir se é a mesma causa antes de repetir o reparo — reincidência não é " +
          "diagnóstico, e pode ser causa que ficou.",
        anterior,
      });
    }
  }

  return conflitos;
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Palavras curtas e conectivos não dizem nada sobre coincidência de sintoma. */
const VAZIAS = new Set([
  "que",
  "com",
  "para",
  "não",
  "nao",
  "uma",
  "dos",
  "das",
  "por",
  "mas",
  "esta",
  "está",
  "muito",
  "quando",
  "depois",
  "ainda",
]);

function palavrasSignificativas(texto: string) {
  return [...new Set(texto.split(/\W+/))].filter(
    (palavra) => palavra.length >= 4 && !VAZIAS.has(palavra),
  );
}

/* --------------------------------------------------- checklist preparatório */

export type ItemDePreparo = {
  texto: string;
  /** Por que este item entrou na lista. Nunca genérico. */
  porque: string;
};

export type ContextoDaVisita = {
  /** Situação atual do equipamento. */
  situacao: string;
  /** Há garantia vigente documentada? */
  garantiaVigente: boolean;
  /** Peças já selecionadas pela equipe ou registradas no diagnóstico. */
  pecasSelecionadas: string[];
  /** Chamados do mesmo equipamento nos últimos 12 meses. */
  chamados12Meses: number;
  /** O cliente anexou foto ou vídeo? */
  temMidia: boolean;
  /** O equipamento tem número de série cadastrado? */
  temSerial: boolean;
};

/**
 * O checklist que o técnico leva.
 *
 * Cada item existe por causa de um fato do chamado, e o `porque` diz qual.
 * Uma lista genérica de "leve as ferramentas" seria ignorada na terceira
 * visita; uma lista que muda com o caso é lida.
 */
export function checklistDaVisita(contexto: ContextoDaVisita): ItemDePreparo[] {
  const itens: ItemDePreparo[] = [];

  if (contexto.pecasSelecionadas.length > 0) {
    itens.push({
      texto: `Levar: ${contexto.pecasSelecionadas.join(", ")}.`,
      porque: "Peças registradas no diagnóstico ou separadas pela equipe.",
    });
  } else {
    itens.push({
      texto: "Nenhuma peça foi separada para esta visita.",
      porque:
        "O diagnóstico ainda não indicou peça. Se o sintoma sugerir alguma, vale conferir o " +
        "estoque antes de sair.",
    });
  }

  if (!contexto.temSerial) {
    itens.push({
      texto: "Registrar o número de série do equipamento.",
      porque: "O cadastro está sem série, e sem ela o histórico não se conecta ao aparelho.",
    });
  }

  if (contexto.garantiaVigente) {
    itens.push({
      texto: "Equipamento em garantia — conferir a cobertura antes de orçar.",
      porque: "Há garantia vigente documentada no prontuário.",
    });
  }

  if (contexto.chamados12Meses >= 2) {
    itens.push({
      texto: `Terceiro atendimento ou mais: ${contexto.chamados12Meses} chamados em 12 meses.`,
      porque:
        "Reincidência. Vale investigar a causa em vez de repetir o reparo anterior — e o " +
        "histórico completo está no prontuário.",
    });
  }

  if (contexto.situacao !== "operacional") {
    itens.push({
      texto: `O equipamento está registrado como ${contexto.situacao.replace("_", " ")}.`,
      porque: "Situação no prontuário. Confirme no local antes de mexer.",
    });
  }

  if (contexto.temMidia) {
    itens.push({
      texto: "Ver a foto ou o vídeo que o cliente anexou antes de sair.",
      porque: "Há mídia no chamado, e ela costuma mostrar o que a descrição não alcança.",
    });
  }

  return itens;
}

/* ---------------------------------------------------------- sugestão */

export type SugestaoInterna = {
  texto: string;
  mecanismo: string;
  /** Registros que a sustentam. Vazio significa que ela não se sustenta. */
  baseadaEm: string[];
};

export type SugestaoApresentavel =
  | { mostrar: true; sugestao: SugestaoInterna; aviso: string }
  | { mostrar: false; motivo: string };

/** O aviso que acompanha toda sugestão. Fixo, e sempre presente. */
export const AVISO_DA_SUGESTAO =
  "Sugestão interna, gerada a partir dos registros. Não é diagnóstico, não foi confirmada por " +
  "ninguém e não aparece para o cliente.";

/**
 * Uma sugestão automatizada pode ser mostrada ao técnico?
 *
 * Só quando ela aponta para os registros que a fundamentam. Sugestão sem base
 * conferível é palpite com aparência de análise — e num contexto em que o
 * leitor vai agir sobre ela, isso é pior que não ter sugestão nenhuma.
 *
 * Hoje nenhuma sugestão é gerada neste projeto. A função existe porque o dia
 * em que alguém acrescentar uma, esta é a porta por onde ela passa.
 */
export function apresentarSugestao(sugestao: SugestaoInterna | null): SugestaoApresentavel {
  if (!sugestao) {
    return { mostrar: false, motivo: "Nenhuma sugestão automatizada foi gerada." };
  }

  if (sugestao.baseadaEm.length === 0) {
    return {
      mostrar: false,
      motivo:
        "A sugestão não aponta para nenhum registro. Sem base conferível, ela não é mostrada.",
    };
  }

  return { mostrar: true, sugestao, aviso: AVISO_DA_SUGESTAO };
}
