import type { Metadata } from "next";

import { Conteudo404 } from "@/components/loja/pagina-404";
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

async function configuracoes(): Promise<SettingsMap> {
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
