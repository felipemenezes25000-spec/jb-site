"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

/* Primitivas do painel. Tailwind aqui é seguro: só carrega em /admin. */

export function Campo({
  label,
  name,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string }) {
  const id = `campo-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={name}
        {...props}
        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus:border-jb-500 focus:ring-2 focus:ring-jb-500/20"
      />
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Area({
  label,
  name,
  hint,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
  hint?: string;
}) {
  const id = `campo-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={4}
        {...props}
        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 shadow-xs outline-none transition-colors placeholder:text-slate-400 focus:border-jb-500 focus:ring-2 focus:ring-jb-500/20"
      />
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Selecao({
  label,
  name,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; name: string }) {
  const id = `campo-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <select
        id={id}
        name={name}
        {...props}
        className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none focus:border-jb-500 focus:ring-2 focus:ring-jb-500/20"
      >
        {children}
      </select>
    </div>
  );
}

export function Alternar({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-slate-300 text-jb-500 focus:ring-jb-500"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Salvar({ children = "Salvar" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-md bg-jb-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-jb-600 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}

export function Aviso({ erro, ok }: { erro?: string; ok?: string }) {
  if (!erro && !ok) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        erro
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {erro ?? ok}
    </p>
  );
}

export function Etiqueta({ tom, children }: { tom: "verde" | "cinza" | "ambar"; children: React.ReactNode }) {
  const cores = {
    verde: "bg-emerald-100 text-emerald-800",
    cinza: "bg-slate-100 text-slate-600",
    ambar: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", cores[tom])}>
      {children}
    </span>
  );
}
