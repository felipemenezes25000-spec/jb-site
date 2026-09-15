import "server-only";

import {
  ehImagem,
  ErroDeUpload,
  formatarLimite,
  guardarPrivado,
  LIMITE_POR_TIPO,
  removerArquivo,
  sanitizarNome,
  validarArquivo,
  type ArquivoEnviado,
  type PastaUpload,
} from "@/lib/upload";

/**
 * Grava em armazenamento privado e RECUSA qualquer fallback público.
 *
 * `upload.ts` ainda preserva compatibilidade com instalações antigas que
 * aceitavam Blob público. Para material operacional/sensível essa tolerância
 * não serve: se a loja não aceitar `access: private`, o objeto de fallback é
 * removido e o envio falha. Disponibilidade nunca vence confidencialidade.
 */
export async function guardarPrivadoEstrito(
  pathname: string,
  bytes: Buffer,
  mime: string,
) {
  const guardado = await guardarPrivado(pathname, bytes, mime);
  if (guardado.privado) return guardado;

  try {
    await removerArquivo(guardado.url);
  } catch (erro) {
    console.error("[upload-privado] falha ao limpar fallback público", erro);
  }

  throw new ErroDeUpload(
    "O armazenamento privado está indisponível. O arquivo não foi publicado. Tente novamente mais tarde.",
    503,
  );
}

/**
 * Versão privada do pipeline de upload para chamado, equipamento, OS e
 * documentos. Mantém as mesmas validações de MIME/tamanho e devolve o mesmo
 * contrato de `enviarArquivo`, mas nunca permite URL pública como resultado.
 */
export async function enviarArquivoOperacionalPrivado(
  arquivo: File,
  pasta: PastaUpload,
): Promise<ArquivoEnviado> {
  const validacao = validarArquivo(arquivo, pasta);
  if (!validacao.ok) throw new ErroDeUpload(validacao.erro);

  const tipo = validacao.tipo;
  const bytes = Buffer.from(await arquivo.arrayBuffer());

  if (bytes.byteLength > LIMITE_POR_TIPO[tipo]) {
    throw new ErroDeUpload(
      `O arquivo passa de ${formatarLimite(LIMITE_POR_TIPO[tipo])}.`,
      413,
    );
  }

  if (tipo === "application/pdf" && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new ErroDeUpload("O arquivo não é um PDF válido.");
  }

  let largura: number | null = null;
  let altura: number | null = null;

  if (ehImagem(tipo)) {
    try {
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(bytes, { failOn: "error" }).metadata();
      largura = metadata.width ?? null;
      altura = metadata.height ?? null;
    } catch {
      throw new ErroDeUpload("Não foi possível ler a imagem. Tente outro arquivo.");
    }

    if (largura === null || altura === null) {
      throw new ErroDeUpload("Não foi possível ler a imagem. Tente outro arquivo.");
    }
  }

  const nome = sanitizarNome(arquivo.name, tipo, "privado");
  const pathname = `${pasta}/${nome}`;
  const guardado = await guardarPrivadoEstrito(pathname, bytes, tipo);

  return {
    url: guardado.url,
    pathname: guardado.pathname,
    contentType: tipo,
    size: bytes.byteLength,
    visibilidade: "privado",
    largura,
    altura,
  };
}
