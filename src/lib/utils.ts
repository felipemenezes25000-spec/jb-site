import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Sem isso o twMerge confunde os tamanhos customizados com cores de texto e
 * descarta o primeiro quando a classe também traz um `text-<cor>`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["hero", "display", "title"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
