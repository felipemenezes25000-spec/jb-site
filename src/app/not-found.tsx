import type { Metadata } from "next";
import Link from "next/link";

import { Conteudo404 } from "@/components/loja/pagina-404";
import { Logo } from "@/components/ui/logo";
import { SETTING_DEFAULTS, getSettings, type SettingsMap } from "@/lib/settings";

/**
 * 404 de fora dos grupos de rota.
 *
 * A loja tem a própria página em `(loja)/not-found.tsx`, que entra dentro do
 * cabeçalho e do rodapé já montados. Esta aqui atende o endereço que não cai
 * em grupo nenhum, então precisa trazer a própria marca e o próprio caminho de
 * volta — é o único lugar em que o logotipo aparece duas vezes se não houver
 * cuidado.
 *
 * As configurações são lidas com rede de proteção: se o banco estiver fora,
 * a página de erro não pode cair junto — ela cai nos valores padrão.
 */

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

async function configuracoes(): Promise<SettingsMap> {
  try {
    return await getSettings();
  } catch (erro) {
    console.error("404: falha ao ler configurações", erro);
    return { ...SETTING_DEFAULTS };
  }
}

export default async function NaoEncontrado() {
  const s = await configuracoes();

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-graf-50 to-white">
      <header className="container-jb py-6">
        <Link
          href="/"
          aria-label={`${s.empresa_nome} — página inicial`}
          className="inline-flex rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-jb-500"
        >
          <Logo altura={40} prioridade />
        </Link>
      </header>

      <main className="container-jb flex-1 pb-16 pt-6 lg:pt-10">
        <Conteudo404 configuracoes={s} />
      </main>
    </div>
  );
}
