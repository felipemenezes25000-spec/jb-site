import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Envio de arquivos — um caminho só para o painel, a área do cliente e os
 * formulários públicos.
 *
 * Onde o arquivo vai depende do ambiente: havendo BLOB_READ_WRITE_TOKEN
 * (Vercel), vai para o Vercel Blob, porque lá o disco é efêmero. Sem a
 * variável, grava em `public/uploads` — o que basta em desenvolvimento e em
 * servidor próprio. A aplicação funciona igual nos dois casos: quem consome
 * só enxerga a URL devolvida aqui.
 *
 * A extensão do arquivo salvo vem do MIME conferido, nunca do nome enviado
 * pelo navegador — assim um `.php` renomeado não vira arquivo executável.
 */

const MB = 1024 * 1024;

export const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const TIPOS_DOCUMENTO = ["application/pdf"] as const;

export type TipoImagem = (typeof TIPOS_IMAGEM)[number];
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];
export type TipoAceito = TipoImagem | TipoDocumento;

/** Limite por tipo: foto de equipamento é pequena, manual em PDF nem sempre. */
export const LIMITE_POR_TIPO: Record<TipoAceito, number> = {
  "image/jpeg": 8 * MB,
  "image/png": 8 * MB,
  "image/webp": 8 * MB,
  "image/avif": 8 * MB,
  "application/pdf": 16 * MB,
};

/** Maior limite existente — serve para barrar o corpo da requisição cedo. */
export const LIMITE_ABSOLUTO = Math.max(...Object.values(LIMITE_POR_TIPO));

const EXTENSAO_POR_TIPO: Record<TipoAceito, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "application/pdf": ".pdf",
};

export const ROTULO_TIPO: Record<TipoAceito, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/avif": "AVIF",
  "application/pdf": "PDF",
};

/* ------------------------------------------------------------------ pastas */

export const PASTAS_UPLOAD = [
  "midia",
  "produtos",
  "chamados",
  "equipamentos",
  "ordens",
  "documentos",
] as const;

export type PastaUpload = (typeof PASTAS_UPLOAD)[number];

const IMAGENS_E_PDF = [...TIPOS_IMAGEM, ...TIPOS_DOCUMENTO] as const;

export const PASTAS: Record<
  PastaUpload,
  { rotulo: string; tipos: readonly TipoAceito[] }
> = {
  midia: { rotulo: "Biblioteca de mídia", tipos: TIPOS_IMAGEM },
  produtos: { rotulo: "Fotos de produto", tipos: TIPOS_IMAGEM },
  chamados: { rotulo: "Anexos de chamado", tipos: IMAGENS_E_PDF },
  equipamentos: { rotulo: "Fotos de equipamento", tipos: IMAGENS_E_PDF },
  ordens: { rotulo: "Ordens de serviço", tipos: IMAGENS_E_PDF },
  documentos: { rotulo: "Documentos", tipos: IMAGENS_E_PDF },
};

/** Pastas em que o cliente final pode escrever. O resto é só da equipe. */
export const PASTAS_DO_CLIENTE: readonly PastaUpload[] = ["chamados", "equipamentos"];

export function ehPastaValida(valor: string): valor is PastaUpload {
  return (PASTAS_UPLOAD as readonly string[]).includes(valor);
}

export function tiposAceitos(pasta: PastaUpload): readonly TipoAceito[] {
  return PASTAS[pasta].tipos;
}

/** Valor pronto para o atributo `accept` de `<input type="file">`. */
export function atributoAccept(pasta: PastaUpload) {
  return tiposAceitos(pasta).join(",");
}

export function formatarLimite(bytes: number) {
  return `${Math.round(bytes / MB)} MB`;
}

export function ehImagem(tipo: string): tipo is TipoImagem {
  return (TIPOS_IMAGEM as readonly string[]).includes(tipo);
}

/* ------------------------------------------------------------------- erros */

export class ErroDeUpload extends Error {
  readonly status: number;

  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = "ErroDeUpload";
    this.status = status;
  }
}

/* --------------------------------------------------------------- validação */

export type ValidacaoDeArquivo =
  | { ok: true; tipo: TipoAceito }
  | { ok: false; erro: string };

export function validarArquivo(arquivo: File, pasta: PastaUpload): ValidacaoDeArquivo {
  const tipos = tiposAceitos(pasta);

  if (!arquivo.size) {
    return { ok: false, erro: "O arquivo está vazio." };
  }

  if (!(tipos as readonly string[]).includes(arquivo.type)) {
    const aceitos = tipos.map((t) => ROTULO_TIPO[t]).join(", ");
    return { ok: false, erro: `Formato aceito aqui: ${aceitos}.` };
  }

  const tipo = arquivo.type as TipoAceito;
  const limite = LIMITE_POR_TIPO[tipo];
  if (arquivo.size > limite) {
    return {
      ok: false,
      erro: `O arquivo tem ${formatarLimite(arquivo.size)} e o limite para ${ROTULO_TIPO[tipo]} é ${formatarLimite(limite)}.`,
    };
  }

  return { ok: true, tipo };
}

/** Nome previsível, sem acento, sem espaço e com sufixo aleatório. */
export function sanitizarNome(nomeOriginal: string, tipo: TipoAceito) {
  const bruto = nomeOriginal ?? "";
  const base = path
    .basename(bruto, path.extname(bruto))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toLowerCase();

  return `${base || "arquivo"}-${crypto.randomBytes(4).toString("hex")}${EXTENSAO_POR_TIPO[tipo]}`;
}

/* ------------------------------------------------------------------ escrita */

const PREFIXO_LOCAL = "/uploads";
const RAIZ_LOCAL = path.resolve(process.cwd(), "public", "uploads");

/** Impede que um caminho manipulado escape de `public/uploads`. */
function caminhoLocal(relativo: string) {
  const destino = path.resolve(RAIZ_LOCAL, relativo);
  if (destino !== RAIZ_LOCAL && !destino.startsWith(RAIZ_LOCAL + path.sep)) {
    throw new ErroDeUpload("Caminho de arquivo inválido.");
  }
  return destino;
}

function usaBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function guardar(pathname: string, bytes: Buffer, tipo: TipoAceito) {
  if (usaBlob()) {
    const { put } = await import("@vercel/blob");
    const enviado = await put(pathname, bytes, {
      access: "public",
      contentType: tipo,
      addRandomSuffix: false,
    });
    return { url: enviado.url, pathname: enviado.pathname };
  }

  const destino = caminhoLocal(pathname);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, bytes);
  return { url: `${PREFIXO_LOCAL}/${pathname}`, pathname };
}

export type ArquivoEnviado = {
  url: string;
  pathname: string;
  contentType: TipoAceito;
  size: number;
  /** Só para imagem; PDF vem nulo. */
  largura: number | null;
  altura: number | null;
};

export type OpcoesDeEnvio = {
  pasta: PastaUpload;
  /** Nome de origem, quando diferente do `arquivo.name`. */
  nome?: string;
};

/**
 * Valida, sanitiza e grava. Lança `ErroDeUpload` com mensagem pronta para a
 * tela quando o arquivo não passa — quem chama devolve `erro.message`.
 */
export async function enviarArquivo(
  arquivo: File,
  opcoes: OpcoesDeEnvio,
): Promise<ArquivoEnviado> {
  const validacao = validarArquivo(arquivo, opcoes.pasta);
  if (!validacao.ok) throw new ErroDeUpload(validacao.erro);

  const tipo = validacao.tipo;
  const nome = sanitizarNome(opcoes.nome ?? arquivo.name, tipo);
  const pathname = `${opcoes.pasta}/${nome}`;

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  // o tamanho declarado pelo navegador não é prova: confere o que chegou
  if (bytes.byteLength > LIMITE_POR_TIPO[tipo]) {
    throw new ErroDeUpload(
      `O arquivo passa de ${formatarLimite(LIMITE_POR_TIPO[tipo])}.`,
      413,
    );
  }

  // o MIME declarado é só uma alegação do navegador: confere o conteúdo
  if (tipo === "application/pdf" && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new ErroDeUpload("O arquivo não é um PDF válido.");
  }

  const { largura, altura } = ehImagem(tipo)
    ? await dimensoesDaImagem(bytes)
    : { largura: null, altura: null };

  // imagem que o sharp não consegue abrir não é imagem
  if (ehImagem(tipo) && largura === null) {
    throw new ErroDeUpload("Não foi possível ler a imagem. Tente outro arquivo.");
  }

  const guardado = await guardar(pathname, bytes, tipo);

  return {
    url: guardado.url,
    pathname: guardado.pathname,
    contentType: tipo,
    size: bytes.byteLength,
    largura,
    altura,
  };
}

/**
 * Remove o arquivo do lugar em que ele estiver. Devolve `false` quando não há
 * o que remover — nunca lança, porque apagar um registro não pode falhar só
 * porque o binário já tinha sumido.
 */
export async function removerArquivo(url: string): Promise<boolean> {
  const valor = (url ?? "").trim();
  if (!valor) return false;

  if (valor.startsWith(`${PREFIXO_LOCAL}/`)) {
    let destino: string;
    try {
      destino = caminhoLocal(decodeURIComponent(valor.slice(PREFIXO_LOCAL.length + 1)));
    } catch {
      console.error("Caminho recusado ao remover arquivo:", valor);
      return false;
    }

    try {
      await fs.unlink(destino);
      return true;
    } catch (erro) {
      const codigo = (erro as NodeJS.ErrnoException).code;
      if (codigo !== "ENOENT") console.error("Falha ao remover arquivo local", erro);
      return false;
    }
  }

  if (!usaBlob() || !/^https?:\/\//i.test(valor)) return false;

  try {
    const { del } = await import("@vercel/blob");
    await del(valor);
    return true;
  } catch (erro) {
    console.error("Falha ao remover arquivo do Blob", erro);
    return false;
  }
}

/** Dimensões da imagem. Devolve nulos quando o arquivo não abre. */
export async function dimensoesDaImagem(
  bytes: Buffer,
): Promise<{ largura: number | null; altura: number | null }> {
  try {
    const { default: sharp } = await import("sharp");
    const meta = await sharp(bytes).metadata();
    return { largura: meta.width ?? null, altura: meta.height ?? null };
  } catch {
    return { largura: null, altura: null };
  }
}
