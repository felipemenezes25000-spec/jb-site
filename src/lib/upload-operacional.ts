import "server-only";

import {
  ehImagem,
  ErroDeUpload,
  formatarLimite,
  guardarPrivado,
  guardarPrivadoNoBanco,
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
 * A regra não mudou: disponibilidade nunca vence confidencialidade, e objeto
 * público com nome de 32 hexadecimais continua não sendo controle de acesso.
 *
 * O que mudou é o que acontece quando a loja de blobs recusa `access:
 * private`. Antes o envio morria em 503 — correto e inútil: o preview da JB
 * roda num plano que recusa objeto privado, então TODA foto de chamado
 * respondia 503, inclusive no "tentar de novo", numa etapa cuja própria cópia
 * diz que a foto "resolve metade do diagnóstico".
 *
 * Agora existe um terceiro destino, e ele é privado de verdade: o banco. O
 * objeto público de contenção continua sendo apagado; os bytes vão para
 * `StoredBlob` e só saem pelas rotas que conferem sessão e dono. A ordem de
 * preferência fica: Blob privado → banco → falha.
 */
export async function guardarPrivadoEstrito(
  pathname: string,
  bytes: Buffer,
  mime: string,
) {
  const guardado = await guardarPrivado(pathname, bytes, mime);
  if (guardado.privado) return guardado;

  /* Chegou aqui: a loja devolveu objeto PÚBLICO. Ele sai antes de qualquer
     outra coisa — um arquivo de clínica não fica num endereço que abre sem
     sessão nem por um instante. */
  try {
    await removerArquivo(guardado.url);
  } catch (erro) {
    console.error("[upload-privado] falha ao limpar fallback público", erro);
  }

  try {
    console.warn(
      "[upload-privado] a loja de blobs recusou objeto privado; gravando no banco.",
    );
    return await guardarPrivadoNoBanco(pathname, bytes, mime);
  } catch (erro) {
    console.error("[upload-privado] o banco também recusou o arquivo", erro);
    throw new ErroDeUpload(
      "O armazenamento de arquivos está indisponível. O arquivo não foi publicado. " +
        "Siga sem anexo — a equipe pede as imagens pelo WhatsApp — ou tente mais tarde.",
      503,
    );
  }
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
