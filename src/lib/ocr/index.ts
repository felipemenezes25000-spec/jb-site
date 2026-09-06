import "server-only";

import { interpretarEtiqueta } from "@/lib/ocr/interpretar";
import type { Leitura, MecanismoDeOcr } from "@/lib/ocr/tipos";

/* ============================================================================
   O mecanismo de OCR — e a decisão de não ter um

   **Nenhum OCR está configurado neste projeto, e isso é uma escolha
   registrada, não uma pendência esquecida.**

   As opções avaliadas:

   | Caminho | Por que não |
   |---|---|
   | Tesseract em WebAssembly, no navegador | Bundle de vários MB e leitura fraca em etiqueta metálica com reflexo — que é a etiqueta real de autoclave e compressor. O caso de uso é celular em clínica, muitas vezes em 4G. |
   | Tesseract nativo no servidor | Exige binário no host. A Vercel não o tem, e trocar o host por causa disto seria decidir a infraestrutura pela funcionalidade menos crítica do escopo. |
   | Provedor de nuvem (Google Vision, AWS Textract, Azure) | É o que lê etiqueta metálica de verdade. Exige credencial que a JB não tem e custo por leitura que ninguém aprovou. E manda a foto do equipamento de uma clínica para um terceiro — o que precisa ser dito ao usuário antes, e autorizado. |

   O escopo prevê exatamente esta situação e diz o que fazer: implementar o
   contrato, o adaptador, os testes e o **fallback manual** — e não fingir uma
   extração com dado embutido, chamando isso de OCR operante.

   É o que está aqui. `mecanismoDeOcr()` devolve `null`, a leitura responde
   `sem_mecanismo`, e a tela oferece o preenchimento manual sem drama. Quando
   a JB decidir o provedor, o que muda é um arquivo: o adaptador implementa
   `MecanismoDeOcr` e passa a ser devolvido por esta função. A interpretação, a
   validação, a tela de conferência e os testes já existem e não mudam.
   ============================================================================ */

/** Teto de bytes que chega a ser processado. Foto de celular cabe folgada. */
export const TAMANHO_MAXIMO = 8 * 1024 * 1024;

export type DiagnosticoDeOcr = {
  configurado: boolean;
  mecanismo: string;
  /** O que a JB precisa fazer para ligar. Vazio quando já está ligado. */
  passo: string;
};

/**
 * O mecanismo ativo, ou `null`.
 *
 * A resolução mora numa função — e não numa constante — para o dia em que a
 * escolha depender de variável de ambiente. Hoje não depende: não há nenhuma.
 */
export function mecanismoDeOcr(): MecanismoDeOcr | null {
  return null;
}

export function diagnosticoDeOcr(): DiagnosticoDeOcr {
  const mecanismo = mecanismoDeOcr();

  if (mecanismo) {
    return { configurado: true, mecanismo: mecanismo.nome, passo: "" };
  }

  return {
    configurado: false,
    mecanismo: "nenhum",
    passo:
      "Escolher o provedor de leitura (Google Vision, AWS Textract ou Azure), aprovar o custo " +
      "por leitura, criar a credencial e implementar o adaptador em src/lib/ocr. A tela de " +
      "conferência e a interpretação já existem e não mudam.",
  };
}

/**
 * Lê uma etiqueta.
 *
 * O caminho inteiro está pronto: valida o tamanho, chama o mecanismo, limita e
 * interpreta a resposta. Só o mecanismo não existe — e por isso a primeira
 * linha devolve a recusa nomeada, em vez de um resultado inventado.
 */
export async function lerEtiqueta(imagem: Buffer, mime: string): Promise<Leitura> {
  const mecanismo = mecanismoDeOcr();
  if (!mecanismo) return { ok: false, motivo: "sem_mecanismo" };

  if (imagem.byteLength > TAMANHO_MAXIMO) {
    return { ok: false, motivo: "imagem_ilegivel", detalhe: "Arquivo acima do limite." };
  }

  let linhas: string[];
  try {
    linhas = await mecanismo.lerLinhas(imagem, mime);
  } catch {
    return { ok: false, motivo: "falha_do_provedor" };
  }

  /* Resposta que não é lista de strings é resposta inválida, e não uma lista
     vazia. A diferença importa: a tela diz coisas diferentes para "não deu
     para ler" e para "o serviço respondeu algo que não dá para aproveitar". */
  if (!Array.isArray(linhas) || linhas.some((linha) => typeof linha !== "string")) {
    return { ok: false, motivo: "resposta_invalida" };
  }

  const leitura = interpretarEtiqueta(linhas);
  return leitura.ok ? { ...leitura, mecanismo: mecanismo.nome } : leitura;
}
