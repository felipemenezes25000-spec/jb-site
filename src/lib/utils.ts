import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Sem isso o twMerge confunde os tamanhos customizados com cores de texto e
 * descarta o primeiro quando a classe também traz um `text-<cor>`.
 */
/**
 * A lista precisa conter TODO degrau customizado da escala.
 *
 * Ela parava em `title`, e `bloco` — criado depois, para o `h2` de seção da
 * ficha de produto — nunca entrou: em qualquer `cn("text-bloco", "text-graf-950")`
 * o tamanho era descartado em silêncio e o texto caía para 16px herdados.
 * `apoio` e `corpo` entram agora pelo mesmo motivo; sem eles, 7 elementos que
 * mediam 13px passaram a medir 16 na primeira medição depois da renomeação.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["hero", "display", "section", "title", "bloco", "apoio", "corpo"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
