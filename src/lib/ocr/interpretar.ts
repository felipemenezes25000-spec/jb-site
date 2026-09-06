import type { CampoLido, CamposDaEtiqueta, Leitura, MotivoDaFalha } from "@/lib/ocr/tipos";

/* ============================================================================
   Interpretação das linhas de uma etiqueta

   Esta é a parte do OCR que não depende do OCR: dado um punhado de linhas de
   texto, o que delas é marca, modelo, série e voltagem?

   Duas regras governam o arquivo inteiro:

   **O texto lido é DADO, nunca instrução.** Ele veio de uma foto que qualquer
   pessoa pode ter tirado de qualquer coisa. Nada aqui interpreta o conteúdo
   como comando, e o resultado é sempre truncado e limitado em quantidade antes
   de chegar a qualquer outro lugar.

   **Normalizar não pode apagar diferença.** "Vitale 21" e "VITALE-21" podem
   ser o mesmo aparelho ou dois modelos distintos. O valor limpo entra no
   formulário; o bruto viaja junto, e é o bruto que o técnico olha quando
   desconfia.
   ============================================================================ */

/** Nenhuma etiqueta tem cem linhas. Acima disso, é foto de outra coisa. */
const MAXIMO_DE_LINHAS = 60;

/** Nenhum campo de etiqueta tem 200 caracteres. */
const MAXIMO_POR_LINHA = 200;

/**
 * Marcadores que costumam preceder cada campo, em português e inglês.
 *
 * A lista é conservadora de propósito: reconhecer de menos deixa o campo
 * vazio, que é recuperável; reconhecer de mais preenche o formulário com o
 * valor errado, e a pessoa confirma sem olhar.
 */
const ROTULOS = {
  serial: [
    "serie",
    "série",
    "n serie",
    "no serie",
    "nº serie",
    "num serie",
    "serial",
    "serial no",
    "serial number",
    "s/n",
    "sn",
  ],
  modelo: ["modelo", "model", "mod", "tipo", "type"],
  marca: ["marca", "brand", "fabricante", "manufacturer", "fabricado por"],
  voltagem: ["voltagem", "tensao", "tensão", "voltage", "volts", "alimentacao", "alimentação"],
} as const;

/** Tira acento e caixa para comparar rótulo. O valor em si não passa por aqui. */
function chave(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Limita o que veio do OCR antes de qualquer outra coisa.
 *
 * É a primeira função a rodar sobre a resposta, e ela existe porque o texto
 * vem de fora: linhas demais, linha comprida demais e caractere de controle
 * são as três formas de uma resposta de OCR estragar o que vem depois.
 */
export function limitarLinhas(linhas: readonly string[]): string[] {
  return linhas
    .slice(0, MAXIMO_DE_LINHAS)
    .map((linha) =>
      String(linha ?? "")
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f\x7f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAXIMO_POR_LINHA),
    )
    .filter(Boolean);
}

/**
 * O valor que vem depois de um rótulo, na mesma linha.
 *
 * "Nº de série: AB-1234" devolve "AB-1234". Rótulo sem valor na mesma linha
 * devolve `null` — o valor pode estar na linha seguinte, e adivinhar qual é
 * seria pior que não preencher.
 */
function valorDepoisDoRotulo(linha: string, rotulos: readonly string[]): string | null {
  const normalizada = chave(linha);

  for (const rotulo of rotulos) {
    const posicao = normalizada.indexOf(rotulo);
    if (posicao === -1) continue;

    const depois = linha.slice(posicao + rotulo.length);
    const valor = depois.replace(/^[\s:.\-–—=]+/, "").trim();
    if (valor.length >= 2) return valor;
  }

  return null;
}

/* --------------------------------------------------- ambiguidade */

/** Pares que a leitura óptica confunde em etiqueta gasta ou de baixa resolução. */
const CONFUSOES: readonly [string, string][] = [
  ["O", "0"],
  ["I", "1"],
  ["S", "5"],
  ["B", "8"],
];

/**
 * As outras leituras plausíveis de um código.
 *
 * Um serial `1O0I` tem quatro caracteres ambíguos e dezesseis leituras
 * possíveis. Listar todas seria inútil; o teto de seis mantém a lista
 * escolhível numa tela de celular, e a tela avisa quando há mais.
 *
 * Nenhuma alternativa é "a correta": elas viram opção para o técnico, que tem
 * o aparelho na frente. Escolher uma sozinho é o erro que faz o serial errado
 * entrar no prontuário com aparência de confirmado.
 */
export function alternativasAmbiguas(valor: string, teto = 6): string[] {
  const alternativas = new Set<string>();

  for (const [a, b] of CONFUSOES) {
    for (const [de, para] of [
      [a, b],
      [b, a],
    ] as const) {
      if (!valor.includes(de)) continue;
      /* Uma troca por vez, e todas as ocorrências juntas. Trocar caractere a
         caractere geraria a combinatória inteira — e ninguém escolhe entre
         dezesseis strings quase iguais. */
      const trocado = valor.split(de).join(para);
      if (trocado !== valor) alternativas.add(trocado);
    }
  }

  return [...alternativas].slice(0, teto);
}

/* ------------------------------------------------- normalização */

/** Serial: mantém letras, dígitos, hífen e barra. Some espaço e o resto. */
function normalizarSerial(bruto: string) {
  return bruto
    .toUpperCase()
    .replace(/[^A-Z0-9/-]/g, "")
    .slice(0, 40);
}

/**
 * Voltagem: reconhece os três valores que o catálogo usa.
 *
 * Devolve `null` quando não reconhece — e nesse caso o campo não é sugerido.
 * "220-240V~" vira "220"; "100-240" não vira nada, porque um equipamento
 * bivolt com faixa ampla não é a mesma coisa que um de 220, e escolher por
 * conta própria mudaria a instalação que a clínica vai preparar.
 */
function normalizarVoltagem(bruto: string): string | null {
  const texto = chave(bruto);

  if (/\bbivolt\b|\bbi-?volt\b|110\s*\/\s*220|127\s*\/\s*220/.test(texto)) return "bivolt";
  if (/\b2[23]0\b/.test(texto)) return "220";
  if (/\b1[12][07]\b/.test(texto)) return "110";

  return null;
}

/** Marca e modelo: só encolhe espaço e corta. Nada de caixa forçada. */
function normalizarTexto(bruto: string, limite: number) {
  return bruto.replace(/\s+/g, " ").trim().slice(0, limite);
}

function campo(bruto: string, valor: string, alternativas: string[] = []): CampoLido {
  return { bruto, valor, confianca: null, alternativas };
}

/* ------------------------------------------------ a interpretação */

/**
 * Lê as linhas e devolve o que dá para afirmar.
 *
 * Campo não encontrado fica `null`. Não há aqui heurística de "a linha mais
 * comprida deve ser o modelo": palpite preenchido é palpite confirmado, porque
 * quem confere clica em continuar.
 */
export function interpretarEtiqueta(linhasBrutas: readonly string[]): Leitura {
  const linhas = limitarLinhas(linhasBrutas);

  if (linhas.length === 0) {
    return { ok: false, motivo: "imagem_ilegivel" };
  }

  const campos: CamposDaEtiqueta = {
    marca: null,
    modelo: null,
    serial: null,
    voltagem: null,
  };

  /* Contagem de rótulos de série: dois numa foto significa duas etiquetas no
     quadro, e aí não dá para saber qual número é de qual equipamento. */
  let rotulosDeSerie = 0;

  for (const linha of linhas) {
    const serial = valorDepoisDoRotulo(linha, ROTULOS.serial);
    if (serial) {
      rotulosDeSerie += 1;
      if (!campos.serial) {
        const valor = normalizarSerial(serial);
        if (valor.length >= 3) {
          campos.serial = campo(serial, valor, alternativasAmbiguas(valor));
        }
      }
    }

    if (!campos.modelo) {
      const modelo = valorDepoisDoRotulo(linha, ROTULOS.modelo);
      if (modelo) campos.modelo = campo(modelo, normalizarTexto(modelo, 80));
    }

    if (!campos.marca) {
      const marca = valorDepoisDoRotulo(linha, ROTULOS.marca);
      if (marca) campos.marca = campo(marca, normalizarTexto(marca, 60));
    }

    if (!campos.voltagem) {
      const bruta = valorDepoisDoRotulo(linha, ROTULOS.voltagem) ?? linha;
      const valor = normalizarVoltagem(bruta);
      if (valor) campos.voltagem = campo(bruta, valor);
    }
  }

  if (rotulosDeSerie > 1) {
    return { ok: false, motivo: "varias_etiquetas" };
  }

  const encontrou = Object.values(campos).some((valor) => valor !== null);
  if (!encontrou) {
    return { ok: false, motivo: "nada_encontrado" };
  }

  return { ok: true, campos, mecanismo: "" };
}

/* --------------------------------------------------- persistência */

export type DecisaoDeGravacao =
  | { grava: true }
  | { grava: false; motivo: "nao_confirmado" | "serial_ja_confirmado" };

export const EXPLICACAO_DA_RECUSA_DE_GRAVACAO: Record<
  "nao_confirmado" | "serial_ja_confirmado",
  string
> = {
  nao_confirmado: "A sugestão precisa ser confirmada antes de virar cadastro.",
  serial_ja_confirmado:
    "Este equipamento já tem número de série conferido pela equipe. Uma leitura de foto não " +
    "sobrescreve o que alguém confirmou olhando o aparelho.",
};

/**
 * Pode gravar o que o OCR sugeriu?
 *
 * Duas recusas, e a segunda é a que o escopo nomeia: **não sobrescrever serial
 * confirmado pela equipe com resultado de OCR.** Um número conferido por
 * alguém com o aparelho na mão vale mais que uma leitura de foto, sempre — e
 * quando os dois divergem, quem decide é o técnico, não a ordem das operações.
 */
export function podeGravar(entrada: {
  confirmadoPeloUsuario: boolean;
  serialAtual: string;
  serialSugerido: string;
  /** O serial atual foi conferido por alguém da equipe? */
  serialConferido: boolean;
}): DecisaoDeGravacao {
  if (!entrada.confirmadoPeloUsuario) return { grava: false, motivo: "nao_confirmado" };

  const mudaOSerial =
    entrada.serialSugerido.trim().length > 0 &&
    entrada.serialSugerido.trim() !== entrada.serialAtual.trim();

  if (entrada.serialConferido && mudaOSerial) {
    return { grava: false, motivo: "serial_ja_confirmado" };
  }

  return { grava: true };
}

/** A frase da tela. É a mesma sempre, e o escopo pede exatamente esta. */
export const AVISO_DE_CONFERENCIA = "Encontramos estas informações. Confira antes de continuar.";

/**
 * O que o OCR **não** determina.
 *
 * Está aqui, em código, porque é a frase que precisa aparecer na tela toda vez
 * — e porque escrevê-la uma vez só evita que alguma tela futura sugira o
 * contrário por omissão.
 */
export const LIMITE_DO_OCR =
  "A leitura da etiqueta identifica o equipamento. Ela não diz se ele está com defeito, se é " +
  "seguro, se é original nem se está na garantia.";

export type { MotivoDaFalha };
