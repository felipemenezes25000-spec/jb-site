import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getSettings, lerSettingsDoBanco, SETTING_DEFAULTS, type SettingsMap } from "@/lib/settings";

/* ============================================================================
   Dados públicos do site de assistência

   Só o que é igual para todo mundo: configurações e o que a equipe publicou.
   Nunca sessão, cookie ou qualquer coisa de uma pessoa só. Um cache
   compartilhado com dado pessoal serve essa pessoa para a próxima.

   Com `cacheComponents` ligado, buscar dado é dinâmico por padrão e o que se
   marca é o que pode ser guardado. Quem edita no painel chama `revalidateTag`
   com a etiqueta correspondente, e a mudança aparece na hora.

   Estas peças moravam em `@/lib/loja-publica`, junto com o menu de categorias
   da loja. Vieram para cá porque sobrevivem à saída do comércio; a loja-publica
   só as reexporta enquanto ainda existe.
   ============================================================================ */

export const ETIQUETA_CONFIGURACOES = "configuracoes";
/** Publicações da Central Técnica. */
export const ETIQUETA_CENTRAL = "central-tecnica";

/**
 * Configurações públicas do site.
 *
 * `getSettings` já é memoizado por requisição com o `cache` do React; aqui o
 * cache atravessa requisições. Telefone e horário mudam raramente, e a
 * etiqueta derruba o cache na hora em que alguém salva no painel.
 *
 * Sem banco, a página de assistência continua de pé com os valores padrão,
 * que são os dados reais da JB (`SETTING_DEFAULTS`). Quem chegou de anúncio
 * precisa do botão do WhatsApp mesmo quando o Postgres soluça. Esse caminho
 * fica em cache só por minutos, para o valor salvo no painel voltar logo.
 */
export async function configuracoesPublicas(): Promise<SettingsMap> {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);

  try {
    const configuracoes = await lerComSegundaChance();
    cacheLife("hours");
    return configuracoes;
  } catch (erro) {
    console.error("[site-publico] configurações indisponíveis; usando os padrões", erro);
    cacheLife("minutes");
    return { ...SETTING_DEFAULTS };
  }
}

/**
 * Uma segunda tentativa antes de cair nos padrões.
 *
 * Falha de conexão costuma ser passageira: o Neon acordando a computação, ou
 * o pico de conexões de um build que prerenderiza com vários workers. Sem a
 * segunda chance, a página ficava gerada com os padrões por alguns minutos —
 * sem o telefone editado no painel e sem os destinos de medição. A repetição
 * vai direto ao banco: o `cache` do React guardaria a mesma rejeição.
 */
async function lerComSegundaChance(): Promise<SettingsMap> {
  try {
    return await getSettings();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return lerSettingsDoBanco();
  }
}

/**
 * A Central Técnica tem texto no ar?
 *
 * Item de menu promete que existe algo do outro lado. Enquanto a Central
 * estiver vazia, ela não aparece na navegação principal, e volta sozinha na
 * primeira publicação.
 */
export async function centralTemPublicacao(): Promise<boolean> {
  "use cache";
  cacheTag(ETIQUETA_CENTRAL);
  cacheLife("hours");

  try {
    const publicados = await prisma.article.count({ where: { status: "publicado" } });
    return publicados > 0;
  } catch {
    /* Sem banco, o menu segue como sempre foi. Esconder um item por causa de
       uma falha de leitura seria trocar um problema de conteúdo por um de
       navegação. */
    return true;
  }
}

/**
 * Quantos anos desde o "em atividade desde" das configurações.
 *
 * Dentro de `use cache` porque ler o relógio fora dele tornaria a página
 * inteira dinâmica. Um dia de validade basta: o número só muda na virada do
 * ano. Ano ilegível devolve `null` e o bloco do contador não aparece, em vez
 * de mostrar "0 anos" ou um número negativo.
 */
export async function anosDesde(ano: string): Promise<number | null> {
  "use cache";
  cacheLife("days");

  const inicio = Number(ano);
  if (!Number.isInteger(inicio) || inicio < 1950) return null;
  const anos = new Date().getFullYear() - inicio;
  return anos > 0 ? anos : null;
}
