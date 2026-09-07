import type { Metadata } from "next";

import { cacheLife, cacheTag } from "next/cache";

import { Conteudo404 } from "@/components/loja/pagina-404";
import { ETIQUETA_CONFIGURACOES } from "@/lib/loja-publica";
import { SETTING_DEFAULTS, getSettings, type SettingsMap } from "@/lib/settings";

/**
 * 404 das rotas da loja.
 *
 * Existe para não duplicar a moldura: produto, categoria e marca que saíram do
 * ar caem aqui de dentro do layout de (loja), que já desenhou o cabeçalho com
 * a marca e o rodapé com os contatos. O 404 da raiz traz a própria marca — o
 * que, sem esta página, punha duas logos e dois rodapés na mesma tela.
 *
 * As configurações são lidas com rede de proteção: se o banco estiver fora, a
 * página de erro não pode cair junto.
 */

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

/**
 * Configurações desta página, com rede de proteção e cache.
 *
 * Cacheado pelo mesmo motivo do 404 da raiz, que já nascia assim: a tela é
 * igual para todo mundo e não precisa de uma consulta ao banco por visita.
 * Aqui o ganho é maior do que parece — cada endereço inexistente passava por
 * `getSettings()`, então uma varredura de URLs virava uma consulta por
 * tentativa.
 *
 * O que isto NÃO resolve é o status. Endereço inexistente sob `(loja)` ainda
 * responde 200 e não 404: com `cacheComponents`, estas rotas são Partial
 * Prerender e o shell parte com o status já definido, antes de `notFound()`
 * ser alcançado no conteúdo transmitido depois. Medido em build de produção —
 * uma rota igual fora do grupo, que sai estática, responde 404 certinho.
 * `export const dynamic` é recusado junto de `cacheComponents` e `connection()`
 * não muda o resultado; sair do Partial Prerender nas rotas de catálogo custa
 * o cache das páginas mais visitadas do site. A indexação, que é o risco real,
 * já está barrada pelo `noindex` que o próprio Next injeta e pelos metadados
 * das rotas.
 *
 * A rede de proteção continua: banco fora do ar não pode derrubar a própria
 * página de erro, então a falha cai nos valores padrão.
 */
async function configuracoes(): Promise<SettingsMap> {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");
  try {
    return await getSettings();
  } catch (erro) {
    console.error("404 da loja: falha ao ler configurações", erro);
    return { ...SETTING_DEFAULTS };
  }
}

export default async function NaoEncontradoNaLoja() {
  const s = await configuracoes();

  return (
    <div className="container-jb pb-20 pt-10 lg:pt-14">
      <Conteudo404 configuracoes={s} mostrarVoltar={false} />
    </div>
  );
}
