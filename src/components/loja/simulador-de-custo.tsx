"use client";

import { useEffect, useRef } from "react";

/* ============================================================================
   Duas melhorias no simulador que não podem morar no servidor

   O simulador é um `<form method="get">` de propósito: o resultado inteiro
   cabe na URL, então ele é compartilhável, sobrevive ao F5 e funciona sem
   JavaScript. Duas consequências disso precisavam de um empurrão do cliente.
   ============================================================================ */

/**
 * O formulário da simulação, que só manda o que foi preenchido.
 *
 * Um GET manda TODO campo do formulário, inclusive os vazios. Com onze campos
 * e três preenchidos, a barra de endereço virava
 * `?anos=5&reparo=&seminovo=&novo=&manutencaoReparo=&manutencaoSeminovo=…` —
 * oito pares dizendo "não informei", que é justamente o que a ausência já
 * diria. E essa URL é o produto do simulador: é ela que a pessoa manda para a
 * sócia, cola no WhatsApp, guarda no favorito. Uma linha de 300 caracteres em
 * que só três pares importam não se lê nem se confere.
 *
 * Campo desabilitado não entra no envio — é a regra do HTML, não um truque de
 * script. Desabilitar no `submit` e religar logo depois deixa o formulário
 * intacto para quem voltar pelo botão do navegador.
 *
 * Sem JavaScript, nada disso acontece e o formulário continua funcionando: a
 * URL fica longa, a simulação fica certa.
 */
export function FormularioDaSimulacao({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    const form = evento.currentTarget;
    const vazios = [...form.elements].filter(
      (elemento): elemento is HTMLInputElement | HTMLSelectElement =>
        (elemento instanceof HTMLInputElement && elemento.type !== "checkbox") ||
        elemento instanceof HTMLSelectElement,
    );

    const desligados = vazios.filter((campo) => campo.value.trim() === "");
    for (const campo of desligados) campo.disabled = true;

    /* Religa depois que o navegador já montou o corpo do envio. Sem isto, quem
       voltar para esta página com o botão "voltar" encontra os campos mortos. */
    window.setTimeout(() => {
      for (const campo of desligados) campo.disabled = false;
    }, 0);
  }

  return (
    <form method="get" onSubmit={aoEnviar} className={className}>
      {children}
    </form>
  );
}

/**
 * Leva a pessoa até o resultado depois de simular.
 *
 * O formulário tem onze campos e ocupa mais de uma tela; o resultado nasce
 * abaixo dele. Sem isto, apertar "Simular" recarregava a página no topo, no
 * mesmo formulário, com os mesmos valores — e a única evidência de que algo
 * aconteceu ficava fora da vista. A auditoria registrou exatamente isso:
 * "cliquei em Simular e não mudou nada".
 *
 * `focus()` além do scroll, porque quem navega por teclado ou leitor de tela
 * não é levado por rolagem: o cursor continuaria no botão, e a próxima
 * tabulação voltaria para o formulário. Com o foco no título, o leitor anuncia
 * "Do menor para o maior, em 5 anos" e o Tab segue dali para dentro do
 * resultado.
 *
 * `prefers-reduced-motion` respeitado: quem pediu menos movimento recebe o
 * salto seco, não a rolagem animada.
 */
export function FocoNoResultado({ chave }: { chave: string }) {
  /* A chave muda a cada simulação diferente. Sem ela, o efeito rodaria uma vez
     só e a segunda simulação não levaria ninguém a lugar nenhum. */
  const ultima = useRef<string | null>(null);

  useEffect(() => {
    if (ultima.current === chave) return;
    ultima.current = chave;

    const alvo = document.getElementById("resultado-da-simulacao");
    if (!alvo) return;

    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    alvo.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
    /* `preventScroll` porque o scroll já foi pedido acima, com o comportamento
       certo; deixar o foco rolar de novo desfaria a escolha. */
    alvo.focus({ preventScroll: true });
  }, [chave]);

  return null;
}
