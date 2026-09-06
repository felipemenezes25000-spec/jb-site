/* ============================================================================
   O que o arquivo é, e não o que ele diz ser

   `accept` no input e `file.type` no navegador são declarações do cliente.
   Renomear `payload.php` para `foto.jpg` muda os dois e não muda um byte do
   conteúdo. O escopo é explícito: o tipo real precisa ser conferido no
   servidor.

   Este módulo lê os primeiros bytes e responde o que o arquivo é de fato. É
   puro — recebe bytes, devolve resposta — para ser testável sem upload.

   Sobre vídeo: a duração é lida da caixa `mvhd` do contêiner ISO-BMFF (MP4 e
   MOV usam o mesmo). Não é um decodificador — é a leitura do cabeçalho que
   todo arquivo válido do formato precisa ter. WebM não tem essa estrutura e
   por isso devolve duração desconhecida, tratada como recusa explícita em vez
   de "passou".
   ============================================================================ */

export type TipoDetectado = {
  mime: string;
  /** `foto`, `video` ou `desconhecido`. */
  especie: "foto" | "video" | "desconhecido";
};

/** Compara uma assinatura a partir de um deslocamento. */
function bate(bytes: Uint8Array, deslocamento: number, assinatura: number[]) {
  if (bytes.length < deslocamento + assinatura.length) return false;
  return assinatura.every((valor, i) => bytes[deslocamento + i] === valor);
}

function texto(bytes: Uint8Array, inicio: number, tamanho: number) {
  return String.fromCharCode(...bytes.slice(inicio, inicio + tamanho));
}

/**
 * O tipo real, pelos primeiros bytes.
 *
 * Só formatos que a JB aceita. Qualquer outra coisa — inclusive um JPEG
 * corrompido cujo cabeçalho não fecha — devolve `desconhecido`, e quem chama
 * recusa. Aceitar por omissão é como um upload vira execução remota.
 */
export function detectarTipo(bytes: Uint8Array): TipoDetectado {
  // imagens
  if (bate(bytes, 0, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", especie: "foto" };
  if (bate(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", especie: "foto" };
  }
  if (texto(bytes, 0, 4) === "RIFF" && texto(bytes, 8, 4) === "WEBP") {
    return { mime: "image/webp", especie: "foto" };
  }

  // contêiner ISO-BMFF: AVIF, HEIC e MP4/MOV compartilham o cabeçalho `ftyp`
  if (texto(bytes, 4, 4) === "ftyp") {
    const marca = texto(bytes, 8, 4).toLowerCase();

    if (marca.startsWith("avif") || marca.startsWith("avis")) {
      return { mime: "image/avif", especie: "foto" };
    }
    /* HEIC é o padrão da câmera do iPhone. O escopo manda tratá-lo — e
       tratá-lo é aceitar o arquivo e converter, não recusar em silêncio. */
    if (["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(marca)) {
      return { mime: "image/heic", especie: "foto" };
    }
    if (marca === "qt  ") return { mime: "video/quicktime", especie: "video" };
    /* isom, mp41, mp42, avc1, iso2… todos são MP4 para o que importa aqui. */
    return { mime: "video/mp4", especie: "video" };
  }

  // WebM / Matroska
  if (bate(bytes, 0, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { mime: "video/webm", especie: "video" };
  }

  return { mime: "application/octet-stream", especie: "desconhecido" };
}

/* --------------------------------------------------------- duração do vídeo */

export type DuracaoDeVideo =
  | { conhecida: true; segundos: number }
  | { conhecida: false; motivo: string };

/**
 * Duração de um MP4/MOV, lida da caixa `mvhd`.
 *
 * O ISO-BMFF é uma árvore de caixas: cada uma traz 4 bytes de tamanho, 4 de
 * tipo e o conteúdo. `mvhd` fica dentro de `moov` e carrega a escala de tempo
 * e a duração. Percorrer o arquivo procurando a assinatura é suficiente e não
 * exige decodificar vídeo nenhum.
 *
 * Devolve `conhecida: false` quando não encontra — e quem chama trata isso
 * como recusa, não como aprovação. O escopo é explícito: não confiar no
 * JavaScript do cliente para a duração, e manter estado de quarentena
 * enquanto não se sabe.
 */
export function duracaoDeVideo(bytes: Uint8Array): DuracaoDeVideo {
  const visao = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  for (let i = 0; i + 32 < bytes.length; i++) {
    if (
      bytes[i] !== 0x6d || // m
      bytes[i + 1] !== 0x76 || // v
      bytes[i + 2] !== 0x68 || // h
      bytes[i + 3] !== 0x64 // d
    ) {
      continue;
    }

    const versao = bytes[i + 4];

    try {
      if (versao === 0) {
        // versão 0: escala e duração em 32 bits, depois de 4 bytes de versão
        // e flags e 8 bytes de datas
        const escala = visao.getUint32(i + 16);
        const duracao = visao.getUint32(i + 20);
        if (escala > 0) return { conhecida: true, segundos: Math.round(duracao / escala) };
      }

      if (versao === 1) {
        // versão 1: datas em 64 bits, então escala e duração ficam adiante
        const escala = visao.getUint32(i + 24);
        const duracao = Number(visao.getBigUint64(i + 28));
        if (escala > 0) return { conhecida: true, segundos: Math.round(duracao / escala) };
      }
    } catch {
      /* Arquivo cortado no meio do cabeçalho: cai no desconhecido abaixo. */
      break;
    }
  }

  return {
    conhecida: false,
    motivo: "não foi possível ler a duração deste arquivo de vídeo",
  };
}
