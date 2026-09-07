import { Suspense } from "react";

import { Cabecalho } from "@/components/loja/cabecalho";
import {
  AcessoDaConta,
  AcessoDaContaEsqueleto,
  ContadorDoCarrinho,
  ContadorDoCarrinhoEsqueleto,
} from "@/components/loja/cabecalho-pessoal";
import { Rodape } from "@/components/loja/rodape";
import { categoriasDoMenu, condicoesDoMenu, configuracoesPublicas } from "@/lib/loja-publica";

/**
 * Casca da loja pública.
 *
 * A leitura pública continua separada da personalizada. O seletor no elemento
 * raiz só amplia o container do header em monitores largos; não cria um novo
 * ancestral em torno do `header`, então o comportamento sticky continua
 * funcionando normalmente.
 */
export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  const [s, categorias, condicoes] = await Promise.all([configuracoesPublicas(), categoriasDoMenu(), condicoesDoMenu()]);

  return (
    <div className="flex min-h-dvh flex-col [&>header_.container-jb]:max-w-[112rem]">
      <Cabecalho
        categorias={categorias}
        condicoes={condicoes}
        acessoDaConta={
          <Suspense fallback={<AcessoDaContaEsqueleto />}>
            <AcessoDaConta />
          </Suspense>
        }
        contadorDoCarrinho={
          <Suspense fallback={<ContadorDoCarrinhoEsqueleto />}>
            <ContadorDoCarrinho />
          </Suspense>
        }
        telefone={s.telefone}
        whatsapp={s.whatsapp}
        horario={s.horario}
        desde={s.empresa_desde}
        cidade={s.endereco_cidade}
      />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <Rodape />
    </div>
  );
}
