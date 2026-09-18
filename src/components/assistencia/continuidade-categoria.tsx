"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const CHAVE = "jb:assistencia:categoria-escolhida";

function salvarCategoria(nome: string) {
  try {
    sessionStorage.setItem(CHAVE, nome);
  } catch {
    // A navegação continua válida mesmo sem armazenamento da aba.
  }
}

function consumirCategoria(): string {
  try {
    const nome = sessionStorage.getItem(CHAVE) ?? "";
    sessionStorage.removeItem(CHAVE);
    return nome;
  } catch {
    return "";
  }
}

/**
 * Costura a landing de assistência ao formulário sem transformar a página
 * inteira em Client Component.
 *
 * Os cartões públicos já são links reais e continuam funcionando sem JS. Com
 * hidratação, guardamos apenas o NOME público da categoria escolhida. Na tela
 * seguinte ele é resolvido contra as opções que o servidor efetivamente
 * autorizou para aquele formulário; nenhum id vindo do navegador é confiado.
 */
export function ContinuidadeCategoriaAssistencia() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/assistencia-tecnica") return;

    function aoClicar(evento: MouseEvent) {
      const alvo = evento.target;
      if (!(alvo instanceof Element)) return;

      const link = alvo.closest<HTMLAnchorElement>("a[data-assistencia-categoria]");
      if (!link) return;

      const titulo = link.querySelector("p")?.textContent?.trim();
      if (titulo) salvarCategoria(titulo);
    }

    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/assistencia-tecnica/solicitar") return;

    const nome = consumirCategoria();
    if (!nome) return;

    let quadro1 = 0;
    let quadro2 = 0;

    /* O segundo quadro deixa o efeito de hidratação do assistente restaurar o
       rascunho primeiro. Assim a escolha explícita feita AGORA na landing
       vence um rascunho antigo, sem disputar com a hidratação do formulário. */
    quadro1 = requestAnimationFrame(() => {
      quadro2 = requestAnimationFrame(() => {
        const selecao = document.querySelector<HTMLSelectElement>('select[name="categoriaId"]');
        if (!selecao) return;

        const opcao = Array.from(selecao.options).find(
          (item) => item.textContent?.trim().toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"),
        );
        if (!opcao) return;

        const setter = Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,
          "value",
        )?.set;
        setter?.call(selecao, opcao.value);
        selecao.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });

    return () => {
      cancelAnimationFrame(quadro1);
      cancelAnimationFrame(quadro2);
    };
  }, [pathname]);

  return null;
}
