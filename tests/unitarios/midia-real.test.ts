import { describe, expect, it } from "vitest";

import { detectarTipo, duracaoDeVideo } from "@/lib/midia-real";

/* ============================================================================
   Tipo real e duração

   O que estes testes protegem: um arquivo renomeado. `accept` no input e
   `file.type` no navegador são declarações do cliente; renomear payload.php
   para foto.jpg muda as duas e não muda um byte do conteúdo.
   ============================================================================ */

function bytes(...valores: number[]) {
  return new Uint8Array(valores);
}

function comTexto(deslocamento: number, texto: string, tamanho = 64) {
  const saida = new Uint8Array(tamanho);
  for (let i = 0; i < texto.length; i++) saida[deslocamento + i] = texto.charCodeAt(i);
  return saida;
}

describe("detectarTipo — imagens", () => {
  it("reconhece JPEG pelos bytes", () => {
    expect(detectarTipo(bytes(0xff, 0xd8, 0xff, 0xe0)).mime).toBe("image/jpeg");
  });

  it("reconhece PNG pelos bytes", () => {
    expect(detectarTipo(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)).mime).toBe(
      "image/png",
    );
  });

  it("reconhece WebP", () => {
    const arquivo = comTexto(0, "RIFF");
    for (let i = 0; i < 4; i++) arquivo[8 + i] = "WEBP".charCodeAt(i);
    expect(detectarTipo(arquivo).mime).toBe("image/webp");
  });

  it("reconhece HEIC — é o padrão da câmera do iPhone", () => {
    const arquivo = comTexto(4, "ftyp");
    for (let i = 0; i < 4; i++) arquivo[8 + i] = "heic".charCodeAt(i);
    const detectado = detectarTipo(arquivo);
    expect(detectado.mime).toBe("image/heic");
    expect(detectado.especie).toBe("foto");
  });

  it("reconhece AVIF", () => {
    const arquivo = comTexto(4, "ftyp");
    for (let i = 0; i < 4; i++) arquivo[8 + i] = "avif".charCodeAt(i);
    expect(detectarTipo(arquivo).mime).toBe("image/avif");
  });
});

describe("detectarTipo — vídeos", () => {
  it("reconhece MP4", () => {
    const arquivo = comTexto(4, "ftyp");
    for (let i = 0; i < 4; i++) arquivo[8 + i] = "isom".charCodeAt(i);
    const detectado = detectarTipo(arquivo);
    expect(detectado.mime).toBe("video/mp4");
    expect(detectado.especie).toBe("video");
  });

  it("reconhece MOV — é o que o iPhone grava", () => {
    const arquivo = comTexto(4, "ftyp");
    for (let i = 0; i < 4; i++) arquivo[8 + i] = "qt  ".charCodeAt(i);
    expect(detectarTipo(arquivo).mime).toBe("video/quicktime");
  });

  it("reconhece WebM", () => {
    expect(detectarTipo(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0)).especie).toBe("video");
  });
});

describe("detectarTipo — o que não é aceito", () => {
  it("recusa arquivo com extensão mentirosa", () => {
    // "<?php" salvo como foto.jpg: o navegador diz image/jpeg, os bytes não
    const php = bytes(0x3c, 0x3f, 0x70, 0x68, 0x70, 0x20);
    expect(detectarTipo(php).especie).toBe("desconhecido");
  });

  it("recusa PDF, que não é mídia de defeito", () => {
    const pdf = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);
    expect(detectarTipo(pdf).especie).toBe("desconhecido");
  });

  it("recusa arquivo vazio sem estourar", () => {
    expect(detectarTipo(new Uint8Array(0)).especie).toBe("desconhecido");
  });

  it("recusa JPEG cortado no primeiro byte", () => {
    expect(detectarTipo(bytes(0xff)).especie).toBe("desconhecido");
  });
});

describe("duracaoDeVideo", () => {
  /** Monta um `mvhd` versão 0 com a escala e a duração pedidas. */
  function mp4Com(segundos: number, escala = 600) {
    const arquivo = new Uint8Array(128);
    const visao = new DataView(arquivo.buffer);
    const posicao = 32;
    for (let i = 0; i < 4; i++) arquivo[posicao + i] = "mvhd".charCodeAt(i);
    arquivo[posicao + 4] = 0; // versão 0
    visao.setUint32(posicao + 16, escala);
    visao.setUint32(posicao + 20, segundos * escala);
    return arquivo;
  }

  it("lê a duração de um MP4 válido", () => {
    const resultado = duracaoDeVideo(mp4Com(22));
    expect(resultado.conhecida).toBe(true);
    if (resultado.conhecida) expect(resultado.segundos).toBe(22);
  });

  it("lê corretamente com outra escala de tempo", () => {
    const resultado = duracaoDeVideo(mp4Com(45, 1000));
    if (!resultado.conhecida) throw new Error("esperava duração conhecida");
    expect(resultado.segundos).toBe(45);
  });

  it("devolve desconhecida quando não há cabeçalho — e isso é recusa", () => {
    // WebM não tem `mvhd`. Desconhecida NÃO é aprovação: quem chama recusa.
    const resultado = duracaoDeVideo(bytes(0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0));
    expect(resultado.conhecida).toBe(false);
  });

  it("não estoura com arquivo cortado", () => {
    const arquivo = new Uint8Array(40);
    for (let i = 0; i < 4; i++) arquivo[32 + i] = "mvhd".charCodeAt(i);
    expect(() => duracaoDeVideo(arquivo)).not.toThrow();
  });

  it("escala zero não vira divisão por zero", () => {
    expect(duracaoDeVideo(mp4Com(10, 0)).conhecida).toBe(false);
  });
});
