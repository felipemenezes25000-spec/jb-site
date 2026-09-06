/* ============================================================================
   A origem pública do site — um lugar só

   Todo link absoluto que a JB emite sai daqui: canônico, sitemap, JSON-LD,
   imagem de Open Graph, e-mail de redefinição de senha, feed comercial. Antes
   a expressão `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`
   aparecia em quatro arquivos, cada um com o próprio fallback — e um deles
   caía em `"jbsolucoesodontologicas.com.br"` sem protocolo.

   Fallback silencioso é o problema que este módulo resolve. Uma produção
   publicada sem a variável não deve gerar canônicos apontando para
   `localhost:3000`: isso não quebra nada visivelmente, some nos testes e
   aparece semanas depois como páginas fora do índice. Aqui, produção sem
   origem válida **falha na hora**, com o nome da variável na mensagem.

   Os quatro ambientes são tratados como coisas diferentes de propósito:

     produção   `VERCEL_ENV=production` — exige a variável, exige HTTPS e
                recusa localhost. Sem isso, lança.
     preview    a URL do deploy serve; `noindex` continua valendo pelo proxy.
     CI/teste   localhost é legítimo — o `next build` roda com
                `NODE_ENV=production`, e tratar isso como produção real
                tornaria impossível construir em CI.
     local      localhost, sem exigência.

   O ponto sutil: `NODE_ENV === "production"` NÃO significa produção. Ele é o
   modo de compilação, e vale igualmente em `pnpm build` na máquina de quem
   desenvolve. Quem distingue é `VERCEL_ENV`.
   ============================================================================ */

export type AmbienteDePublicacao = "producao" | "preview" | "desenvolvimento";

/**
 * As duas variáveis que este módulo lê, e só elas.
 *
 * Um tipo próprio em vez de `NodeJS.ProcessEnv` para que o teste possa montar
 * um ambiente com dois campos sem fingir ser o `process.env` inteiro — e para
 * deixar explícito no tipo o que a resolução de origem depende.
 */
export type VariaveisDeOrigem = {
  VERCEL_ENV?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  /* Aceita o resto do ambiente sem ler nada dele: assim `process.env` serve
     de argumento e o teste pode montar um objeto com dois campos. */
  [outra: string]: string | undefined;
};

/** Em qual dos ambientes este processo está rodando. */
export function ambienteDePublicacao(
  env: VariaveisDeOrigem = process.env,
): AmbienteDePublicacao {
  if (env.VERCEL_ENV === "production") return "producao";
  if (env.VERCEL_ENV === "preview") return "preview";
  return "desenvolvimento";
}

export type ProblemaDeOrigem = {
  /** Mensagem para o log de build ou para a tela de diagnóstico. */
  mensagem: string;
  /** `true` quando a publicação não deve seguir. */
  impeditivo: boolean;
};

const LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

/**
 * A origem é utilizável neste ambiente?
 *
 * Devolve `null` quando está tudo certo. Não lança: quem chama decide se o
 * problema derruba o processo (produção) ou vira aviso (preview).
 */
export function conferirOrigem(
  bruta: string | undefined,
  ambiente: AmbienteDePublicacao,
): ProblemaDeOrigem | null {
  const valor = (bruta ?? "").trim();

  if (!valor) {
    return {
      mensagem:
        "NEXT_PUBLIC_SITE_URL não está definida. Todo link absoluto do site — canônico, " +
        "sitemap, JSON-LD e o link do e-mail de redefinição de senha — sai dela.",
      impeditivo: ambiente === "producao",
    };
  }

  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return {
      mensagem:
        `NEXT_PUBLIC_SITE_URL="${valor}" não é uma URL absoluta. ` +
        'Use o endereço completo, com protocolo: "https://exemplo.com.br".',
      impeditivo: true,
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      mensagem: `NEXT_PUBLIC_SITE_URL usa o protocolo "${url.protocol}", que não serve para um site.`,
      impeditivo: true,
    };
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    return {
      mensagem:
        `NEXT_PUBLIC_SITE_URL="${valor}" traz caminho, busca ou âncora. ` +
        "Ela é a ORIGEM do site; o caminho é acrescentado por quem monta cada link.",
      impeditivo: true,
    };
  }

  if (ambiente === "producao") {
    if (url.protocol !== "https:") {
      return {
        mensagem: `Em produção, NEXT_PUBLIC_SITE_URL precisa ser HTTPS. Recebido: "${valor}".`,
        impeditivo: true,
      };
    }
    if (LOCAIS.has(url.hostname)) {
      return {
        mensagem: `Em produção, NEXT_PUBLIC_SITE_URL não pode apontar para "${url.hostname}".`,
        impeditivo: true,
      };
    }
  }

  return null;
}

/** Sem barra no fim: quem monta link acrescenta o caminho com a sua. */
export function normalizarOrigem(bruta: string) {
  return bruta.trim().replace(/\/+$/, "");
}

const PADRAO_LOCAL = "http://localhost:3000";

/**
 * A origem pública, resolvida uma vez.
 *
 * Em produção mal configurada isto **lança**, e lançar é a decisão. A
 * alternativa — cair em localhost — publica um site cujos links apontam para a
 * máquina de quem fez o deploy, sem erro visível em lugar nenhum.
 */
export function resolverOrigem(env: VariaveisDeOrigem = process.env): string {
  const ambiente = ambienteDePublicacao(env);
  const bruta = env.NEXT_PUBLIC_SITE_URL;
  const problema = conferirOrigem(bruta, ambiente);

  if (problema?.impeditivo) {
    throw new Error(`[configuração] ${problema.mensagem}`);
  }

  if (problema) {
    // preview sem a variável: aviso no log, e segue com o que der
    console.warn(`[configuração] ${problema.mensagem}`);
  }

  return normalizarOrigem(bruta?.trim() ? bruta : PADRAO_LOCAL);
}
