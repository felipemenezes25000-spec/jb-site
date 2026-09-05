"use client";

import { useEffect } from "react";

import { ConteudoErro } from "@/components/loja/pagina-erro";

/**
 * Fronteira de erro das rotas da loja.
 *
 * Sem ela, a falha de uma página subia até a tela de erro da raiz, que traz o
 * próprio logotipo — e o resultado era duas marcas e dois rodapés na mesma
 * tela, já que o layout de (loja) continua montado. Aqui só o miolo é
 * substituído: o cabeçalho, a navegação e o rodapé seguem no lugar, que é o
 * que dá a quem estava comprando um caminho de volta.
 */
export default function ErroDaLoja({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    console.error("Falha ao renderizar uma página da loja", error);
  }, [error]);

  return (
    <div className="container-jb pb-20 pt-10 lg:pt-14">
      <ConteudoErro digest={error.digest} tentarDeNovo={retry ?? reset} />
    </div>
  );
}
