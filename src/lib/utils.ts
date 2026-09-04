import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Sem isso o twMerge confunde os tamanhos customizados (`text-hero`,
 * `text-display`, `text-section`) com cores de texto e os descarta quando a
 * classe também traz um `text-<cor>`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["hero", "display", "section"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatDate(date: Date | string, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...opts,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return formatDate(date, { hour: "2-digit", minute: "2-digit" });
}

/** Só os dígitos, para href de tel: e wa.me */
export function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function whatsappHref(phone: string, message?: string) {
  const n = digits(phone);
  const full = n.startsWith("55") ? n : `55${n}`;
  const q = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${full}${q}`;
}
