import "server-only";

import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Envio, guarda e entrega de arquivos — um caminho só para o painel, a área do
 * cliente e os formulários públicos.
 *
 * ---------------------------------------------------------------------------
 * PÚBLICO E PRIVADO SÃO PASTAS DIFERENTES
 * ---------------------------------------------------------------------------
 * Nem todo arquivo enviado aqui é a mesma coisa. Foto de produto, logo de marca
 * e imagem do CMS são conteúdo de vitrine: existem para serem servidos ao mundo,
 * direto do CDN, sem sessão. Já a nota fiscal, o laudo técnico e o contrato são
 * do cliente — trazem nome, CNPJ e endereço de clínica — e não podem ficar num
 * endereço que abre para quem tiver o link.
 *
 * Por isso cada pasta declara a sua `visibilidade`:
 *
 *   publico  — vai para o CDN ou para `public/uploads` e é referenciado direto
 *              na tela.
 *   privado  — vai para o Blob privado (ou para `.arquivos/`, FORA de `public/`)
 *              e SÓ sai por uma rota que confere sessão e dono antes de ler os
 *              bytes. O endereço guardado no banco não abre no navegador.
 *
 * A fronteira de autorização é a rota, não a URL. Por isso `respostaDeArquivo()`
 * lê o arquivo no servidor e devolve o corpo — nunca redireciona para o storage.
 *
 * ---------------------------------------------------------------------------
 * QUANDO O BLOB PRIVADO NÃO ESTÁ DISPONÍVEL
 * ---------------------------------------------------------------------------
 * `@vercel/blob` 2.8 aceita `access: "private"` em `put()` e autentica a leitura
 * em `get()`. Se a loja de blobs recusar objeto privado (plano sem o recurso), o
 * arquivo é gravado como público com nome de 32 hexadecimais aleatórios e um
 * aviso vai para o log. **Nome imprevisível não é controle de acesso**: quem
 * receber o link continua abrindo o arquivo sem sessão. É contenção enquanto o
 * plano não oferece objeto privado, não a solução.
 *
 * ---------------------------------------------------------------------------
 * MIGRAÇÃO DO QUE JÁ EXISTE EM `public/uploads`
 * ---------------------------------------------------------------------------
 * Tudo que foi gravado antes desta mudança está em `public/uploads/<pasta>/` e o
 * Next serve esses caminhos estaticamente. As pastas privadas precisam sair de
 * lá. No servidor, uma vez, com a aplicação parada:
 *
 *   mkdir -p .arquivos
 *   mv public/uploads/documentos .arquivos/documentos
 *
 * Os registros antigos guardam `/uploads/documentos/...`. `abrirArquivo()`
 * procura o mesmo caminho relativo primeiro em `.arquivos/` e só depois em
 * `public/uploads/`, então o link antigo volta a funcionar pela rota autenticada
 * assim que o arquivo muda de lugar — sem migração de banco.
 *
 * `.arquivos/` ganha um `.gitignore` próprio na criação, para nunca ser
 * versionada mesmo que a raiz do repositório esqueça de ignorá-la.
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

/**
 * Teto do que a rota de download aceita colocar na resposta. Fica acima do
 * limite de envio de propósito: cobre arquivo herdado de antes desta regra sem
 * abrir espaço para o servidor tentar servir um objeto de tamanho arbitrário.
 */
export const LIMITE_DOWNLOAD = 64 * MB;

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

/** Onde o arquivo pode ficar e por onde ele sai. */
export type VisibilidadeUpload = "publico" | "privado";

const IMAGENS_E_PDF = [...TIPOS_IMAGEM, ...TIPOS_DOCUMENTO] as const;

export const PASTAS: Record<
  PastaUpload,
  { rotulo: string; tipos: readonly TipoAceito[]; visibilidade: VisibilidadeUpload }
> = {
  midia: { rotulo: "Biblioteca de mídia", tipos: TIPOS_IMAGEM, visibilidade: "publico" },
  produtos: { rotulo: "Fotos de produto", tipos: TIPOS_IMAGEM, visibilidade: "publico" },

  // As três pastas abaixo guardam material do cliente (foto de chamado, foto de
  // equipamento, foto de OS) e o lugar delas é o armazenamento privado. Hoje o
  // endereço devolvido aqui é usado direto em `<img src>` nas telas do painel e
  // da Minha JB, que não têm por onde pedir os bytes a uma rota autenticada:
  // marcá-las como privadas agora deixaria essas telas sem imagem nenhuma. Ficam
  // públicas com nome imprevisível até existir a rota genérica de mídia
  // protegida — está registrado nas pendências desta entrega.
  chamados: { rotulo: "Anexos de chamado", tipos: IMAGENS_E_PDF, visibilidade: "publico" },
  equipamentos: {
    rotulo: "Fotos de equipamento",
    tipos: IMAGENS_E_PDF,
    visibilidade: "publico",
  },
  ordens: { rotulo: "Ordens de serviço", tipos: IMAGENS_E_PDF, visibilidade: "publico" },

  // Nota fiscal, laudo, contrato, garantia. Só sai pelas rotas de download.
  documentos: { rotulo: "Documentos", tipos: IMAGENS_E_PDF, visibilidade: "privado" },
};

/** Pastas em que o cliente final pode escrever. O resto é só da equipe. */
export const PASTAS_DO_CLIENTE: readonly PastaUpload[] = ["chamados", "equipamentos"];

export function ehPastaValida(valor: string): valor is PastaUpload {
  return (PASTAS_UPLOAD as readonly string[]).includes(valor);
}

export function visibilidadeDaPasta(pasta: PastaUpload): VisibilidadeUpload {
  return PASTAS[pasta].visibilidade;
}

export function ehPastaPrivada(pasta: PastaUpload) {
  return visibilidadeDaPasta(pasta) === "privado";
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

/**
 * Tamanho do sufixo aleatório do nome, em bytes.
 *
 * Em pasta pública o sufixo existe só para dois envios com o mesmo nome não se
 * atropelarem — 4 bytes bastam. Em pasta privada ele é a última linha de defesa
 * caso o objeto acabe gravado como público (plano sem objeto privado): 16 bytes
 * = 128 bits, faixa que não se varre por tentativa. Continua não sendo controle
 * de acesso, e sim contenção.
 */
const BYTES_SUFIXO: Record<VisibilidadeUpload, number> = { publico: 4, privado: 16 };

/** Nome previsível, sem acento, sem espaço e com sufixo aleatório. */
export function sanitizarNome(
  nomeOriginal: string,
  tipo: TipoAceito,
  visibilidade: VisibilidadeUpload = "publico",
) {
  const bruto = nomeOriginal ?? "";
  const base = path
    .basename(bruto, path.extname(bruto))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .toLowerCase();

  const sufixo = crypto.randomBytes(BYTES_SUFIXO[visibilidade]).toString("hex");
  return `${base || "arquivo"}-${sufixo}${EXTENSAO_POR_TIPO[tipo]}`;
}

/* ---------------------------------------------------------------- caminhos */

const PREFIXO_PUBLICO = "/uploads";
const RAIZ_PUBLICA = path.resolve(process.cwd(), "public", "uploads");

/**
 * Raiz do que não pode ser servido estaticamente. Fica na raiz do projeto e
 * FORA de `public/`, então o Next não expõe nenhum caminho daqui.
 */
const PREFIXO_PRIVADO = "/arquivos";
const RAIZ_PRIVADA = path.resolve(process.cwd(), ".arquivos");

function raizDe(visibilidade: VisibilidadeUpload) {
  return visibilidade === "privado" ? RAIZ_PRIVADA : RAIZ_PUBLICA;
}

function prefixoDe(visibilidade: VisibilidadeUpload) {
  return visibilidade === "privado" ? PREFIXO_PRIVADO : PREFIXO_PUBLICO;
}

/** Impede que um caminho manipulado escape da raiz de arquivos. */
function caminhoLocal(raiz: string, relativo: string) {
  const destino = path.resolve(raiz, relativo);
  if (destino !== raiz && !destino.startsWith(raiz + path.sep)) {
    throw new ErroDeUpload("Caminho de arquivo inválido.");
  }
  return destino;
}

/** Igual ao anterior, mas devolve `null` em vez de lançar. */
function caminhoLocalOuNulo(raiz: string, relativo: string) {
  try {
    return caminhoLocal(raiz, relativo);
  } catch {
    return null;
  }
}

function usaBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Só o host da Vercel Blob é buscado pelo servidor — o resto seria SSRF. */
const SUFIXO_HOST_BLOB = ".blob.vercel-storage.com";

function ehUrlDeBlob(valor: string) {
  try {
    const url = new URL(valor);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.endsWith(SUFIXO_HOST_BLOB)
    );
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------- escrita */

/**
 * Guarda a resposta da loja de blobs sobre objeto privado. Uma recusa por falta
 * do recurso vale para os envios seguintes: sem isto, cada upload pagaria uma
 * ida e volta perdida.
 */
let blobPrivadoIndisponivel = false;

/** Recusa por falta do recurso no plano — não por rede, token ou tamanho. */
function pareceFaltaDeSuportePrivado(erro: unknown) {
  const mensagem = erro instanceof Error ? erro.message.toLowerCase() : "";
  return (
    mensagem.includes("private") ||
    mensagem.includes("not supported") ||
    mensagem.includes("not enabled") ||
    mensagem.includes("not available") ||
    mensagem.includes("upgrade") ||
    mensagem.includes("plan")
  );
}

type Guardado = { url: string; pathname: string; visibilidade: VisibilidadeUpload };

async function guardarNoBlob(
  pathname: string,
  bytes: Buffer,
  tipo: TipoAceito,
  visibilidade: VisibilidadeUpload,
): Promise<Guardado> {
  const { put } = await import("@vercel/blob");

  if (visibilidade === "privado" && !blobPrivadoIndisponivel) {
    try {
      const enviado = await put(pathname, bytes, {
        access: "private",
        contentType: tipo,
        addRandomSuffix: false,
      });
      return { url: enviado.url, pathname: enviado.pathname, visibilidade: "privado" };
    } catch (erro) {
      if (!pareceFaltaDeSuportePrivado(erro)) throw erro;
      blobPrivadoIndisponivel = true;
      console.error(
        "Vercel Blob recusou objeto privado. O arquivo será gravado como PÚBLICO com nome " +
          "de 32 hexadecimais. Nome difícil de adivinhar NÃO é controle de acesso: quem " +
          "receber o link abre o arquivo sem sessão. Habilite objeto privado na loja de blobs.",
        erro,
      );
    }
  }

  const enviado = await put(pathname, bytes, {
    access: "public",
    contentType: tipo,
    addRandomSuffix: false,
  });
  return { url: enviado.url, pathname: enviado.pathname, visibilidade: "publico" };
}

/** Cria a raiz privada já ignorada pelo git, independente do `.gitignore` da raiz. */
async function garantirRaizPrivada() {
  await fs.mkdir(RAIZ_PRIVADA, { recursive: true });
  try {
    await fs.writeFile(path.join(RAIZ_PRIVADA, ".gitignore"), "*\n", { flag: "wx" });
  } catch (erro) {
    const codigo = (erro as NodeJS.ErrnoException).code;
    if (codigo !== "EEXIST") throw erro;
  }
}

async function guardar(
  pathname: string,
  bytes: Buffer,
  tipo: TipoAceito,
  visibilidade: VisibilidadeUpload,
): Promise<Guardado> {
  if (usaBlob()) return guardarNoBlob(pathname, bytes, tipo, visibilidade);

  if (visibilidade === "privado") await garantirRaizPrivada();

  const destino = caminhoLocal(raizDe(visibilidade), pathname);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, bytes);
  return { url: `${prefixoDe(visibilidade)}/${pathname}`, pathname, visibilidade };
}

export type ArquivoEnviado = {
  url: string;
  pathname: string;
  contentType: TipoAceito;
  size: number;
  /**
   * Como o arquivo ficou de fato guardado. Vem `"publico"` mesmo em pasta
   * privada quando a loja de blobs recusou objeto privado — quem chama pode
   * decidir avisar na tela.
   */
  visibilidade: VisibilidadeUpload;
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
  const visibilidade = visibilidadeDaPasta(opcoes.pasta);
  const nome = sanitizarNome(opcoes.nome ?? arquivo.name, tipo, visibilidade);
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

  const guardado = await guardar(pathname, bytes, tipo, visibilidade);

  return {
    url: guardado.url,
    pathname: guardado.pathname,
    contentType: tipo,
    size: bytes.byteLength,
    visibilidade: guardado.visibilidade,
    largura,
    altura,
  };
}

/* ----------------------------------------------------------------- leitura */

export type ArquivoAberto = {
  corpo: ReadableStream<Uint8Array>;
  /** MIME informado pelo armazenamento; pode faltar. */
  contentType: string | null;
  tamanho: number | null;
  /**
   * `true` só quando o tamanho veio do disco. O `content-length` de uma resposta
   * HTTP pode se referir ao corpo comprimido, e anunciar um valor errado trava o
   * download no navegador.
   */
  tamanhoConfiavel: boolean;
};

/** Caminhos de disco onde uma chave relativa pode estar, na ordem de procura. */
function candidatosLocais(chave: string): string[] {
  let relativo: string;
  let raizes: string[];

  if (chave.startsWith(`${PREFIXO_PRIVADO}/`)) {
    relativo = chave.slice(PREFIXO_PRIVADO.length + 1);
    raizes = [RAIZ_PRIVADA];
  } else if (chave.startsWith(`${PREFIXO_PUBLICO}/`)) {
    // registro antigo: o arquivo pode já ter sido movido para a raiz privada
    relativo = chave.slice(PREFIXO_PUBLICO.length + 1);
    raizes = [RAIZ_PRIVADA, RAIZ_PUBLICA];
  } else {
    relativo = chave.replace(/^\/+/, "");
    raizes = [RAIZ_PRIVADA, RAIZ_PUBLICA];
  }

  let decodificado: string;
  try {
    decodificado = decodeURIComponent(relativo);
  } catch {
    decodificado = relativo;
  }
  if (!decodificado) return [];

  return raizes
    .map((raiz) => caminhoLocalOuNulo(raiz, decodificado))
    .filter((valor): valor is string => valor !== null);
}

async function abrirLocal(chave: string): Promise<ArquivoAberto | null> {
  for (const destino of candidatosLocais(chave)) {
    let tamanho: number;

    try {
      const info = await fs.stat(destino);
      if (!info.isFile()) continue;
      tamanho = info.size;
    } catch (erro) {
      const codigo = (erro as NodeJS.ErrnoException).code;
      if (codigo !== "ENOENT" && codigo !== "ENOTDIR") {
        console.error("Falha ao consultar arquivo protegido", erro);
      }
      continue;
    }

    if (tamanho > LIMITE_DOWNLOAD) {
      throw new ErroDeUpload(
        `O arquivo passa de ${formatarLimite(LIMITE_DOWNLOAD)} e não pode ser entregue por aqui.`,
        413,
      );
    }

    // stream: o servidor não carrega o arquivo inteiro na memória
    const corpo = Readable.toWeb(
      createReadStream(destino),
    ) as unknown as ReadableStream<Uint8Array>;

    return { corpo, contentType: null, tamanho, tamanhoConfiavel: true };
  }

  return null;
}

async function abrirNoBlob(url: string): Promise<ArquivoAberto | null> {
  if (usaBlob()) {
    const { get } = await import("@vercel/blob");
    // com URL completa o SDK só usa `access` para montar o endereço quando a
    // entrada é um pathname; a autenticação vai no cabeçalho de qualquer forma,
    // então isto atende tanto o objeto privado novo quanto o público antigo
    const achado = await get(url, { access: "private" });
    if (!achado || achado.statusCode !== 200) return null;

    return {
      corpo: achado.stream,
      contentType: achado.blob.contentType || null,
      tamanho: achado.blob.size || null,
      tamanhoConfiavel: false,
    };
  }

  // sem token não há como autenticar: só resta o endereço público herdado
  const resposta = await fetch(url, { cache: "no-store", redirect: "follow" });
  if (!resposta.ok || !resposta.body) return null;

  const declarado = Number(resposta.headers.get("content-length"));
  return {
    corpo: resposta.body,
    contentType: resposta.headers.get("content-type"),
    tamanho: Number.isFinite(declarado) && declarado > 0 ? declarado : null,
    tamanhoConfiavel: false,
  };
}

/**
 * Abre para leitura no servidor o arquivo guardado sob `chave`.
 *
 * `chave` é o que ficou no banco: URL da Vercel Blob, `/arquivos/...`,
 * `/uploads/...` (registro antigo) ou o pathname puro. Devolve `null` quando o
 * arquivo não existe mais e lança `ErroDeUpload` quando existe mas não cabe na
 * resposta.
 *
 * Esta função NÃO autoriza nada: quem chama já conferiu sessão e dono.
 */
export async function abrirArquivo(chave: string): Promise<ArquivoAberto | null> {
  const valor = (chave ?? "").trim();
  if (!valor) return null;

  if (/^https?:\/\//i.test(valor)) {
    if (!ehUrlDeBlob(valor)) {
      console.error("Endereço de arquivo fora do armazenamento conhecido:", valor);
      return null;
    }
    return abrirNoBlob(valor);
  }

  return abrirLocal(valor);
}

/* ----------------------------------------------------------------- entrega */

const TIPOS_ENTREGAVEIS = new Set<string>([...TIPOS_IMAGEM, ...TIPOS_DOCUMENTO]);

/**
 * Nunca devolve o MIME gravado sem conferir. Um registro com `text/html` viraria
 * página executando no domínio da JB se o navegador resolvesse abrir inline.
 */
function tipoSeguro(...candidatos: (string | null | undefined)[]) {
  for (const candidato of candidatos) {
    const limpo = (candidato ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (TIPOS_ENTREGAVEIS.has(limpo)) return limpo;
  }
  return "application/octet-stream";
}

function semAcento(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\- ]+/g, "_")
    .trim();
}

/** Nome do arquivo baixado: legível, com a extensão que o storage guardou. */
export function nomeParaDownload(titulo: string, chave: string, mime: string) {
  const caminho = (chave ?? "").split("?")[0] ?? "";
  const extensaoDoCaminho = path.extname(caminho);
  const extensao = extensaoDoCaminho || (mime === "application/pdf" ? ".pdf" : "");
  const base = semAcento(titulo ?? "").slice(0, 80) || "documento";
  return base.toLowerCase().endsWith(extensao.toLowerCase()) ? base : `${base}${extensao}`;
}

function textoSimples(mensagem: string, status: number) {
  return new Response(mensagem, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

export type EntregaDeArquivo = {
  /** Nome que o navegador usa ao salvar. */
  nome: string;
  /** MIME registrado no banco; só entra se estiver na lista de tipos aceitos. */
  mime?: string | null;
  /** `attachment` (padrão) força o download; `inline` deixa o navegador abrir. */
  disposicao?: "attachment" | "inline";
};

/**
 * Resposta pronta com os BYTES do arquivo.
 *
 * É a peça que tira a URL do storage da fronteira de autorização: quem chama já
 * conferiu sessão e dono, e a resposta sai daqui — nada de redirecionar para um
 * endereço que abriria sem sessão nenhuma.
 */
export async function respostaDeArquivo(
  chave: string,
  entrega: EntregaDeArquivo,
): Promise<Response> {
  let aberto: ArquivoAberto | null;

  try {
    aberto = await abrirArquivo(chave);
  } catch (erro) {
    if (erro instanceof ErroDeUpload) return textoSimples(erro.message, erro.status);
    console.error("Falha ao abrir arquivo protegido", erro);
    return textoSimples(
      "Não foi possível abrir o arquivo agora. Tente de novo em alguns instantes.",
      502,
    );
  }

  if (!aberto) {
    return textoSimples(
      "O arquivo não está mais disponível. Fale com a equipe da JB para receber uma nova via.",
      404,
    );
  }

  if (aberto.tamanho !== null && aberto.tamanho > LIMITE_DOWNLOAD) {
    await aberto.corpo.cancel().catch(() => undefined);
    return textoSimples(
      `O arquivo passa de ${formatarLimite(LIMITE_DOWNLOAD)} e não pode ser entregue por aqui.`,
      413,
    );
  }

  // aspas e quebra de linha no `filename` quebram o cabeçalho; o nome completo,
  // com acento, vai no `filename*`, que é o que o navegador moderno usa
  const simples = semAcento(entrega.nome).replace(/["\\\r\n]/g, "") || "documento";
  const disposicao = entrega.disposicao ?? "attachment";

  const cabecalhos = new Headers({
    "content-type": tipoSeguro(entrega.mime, aberto.contentType),
    "content-disposition": `${disposicao}; filename="${simples}"; filename*=UTF-8''${encodeURIComponent(entrega.nome)}`,
    // arquivo privado: nada de cache compartilhado
    "cache-control": "private, no-store, max-age=0",
    "x-content-type-options": "nosniff",
    // arquivo de terceiro aberto no nosso domínio não executa nada
    "content-security-policy": "default-src 'none'; sandbox",
    "referrer-policy": "no-referrer",
  });

  if (aberto.tamanhoConfiavel && aberto.tamanho !== null) {
    cabecalhos.set("content-length", String(aberto.tamanho));
  }

  return new Response(aberto.corpo, { status: 200, headers: cabecalhos });
}

/* ----------------------------------------------------------------- remoção */

/**
 * Remove o arquivo do lugar em que ele estiver. Devolve `false` quando não há
 * o que remover — nunca lança, porque apagar um registro não pode falhar só
 * porque o binário já tinha sumido.
 */
export async function removerArquivo(url: string): Promise<boolean> {
  const valor = (url ?? "").trim();
  if (!valor) return false;

  if (valor.startsWith(`${PREFIXO_PUBLICO}/`) || valor.startsWith(`${PREFIXO_PRIVADO}/`)) {
    let removeu = false;

    // o mesmo caminho relativo pode ter ficado nas duas raízes durante a
    // migração de `public/uploads` para `.arquivos`: apaga onde encontrar
    for (const destino of candidatosLocais(valor)) {
      try {
        await fs.unlink(destino);
        removeu = true;
      } catch (erro) {
        const codigo = (erro as NodeJS.ErrnoException).code;
        if (codigo !== "ENOENT" && codigo !== "ENOTDIR") {
          console.error("Falha ao remover arquivo local", erro);
        }
      }
    }

    return removeu;
  }

  if (!usaBlob() || !ehUrlDeBlob(valor)) return false;

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
