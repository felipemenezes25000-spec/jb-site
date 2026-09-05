"use client";

import { useId } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Campos de formulário. Todo campo tem label real, erro por campo e estado de
 * erro que não depende só de cor — a mensagem sempre aparece por escrito.
 */

const BASE_CAMPO =
  // 16px no celular de propósito: abaixo disso o iOS dá zoom ao focar o campo.
  "w-full rounded-lg border bg-white text-base text-graf-900 shadow-xs sm:text-[0.9375rem] " +
  "transition-[border-color,box-shadow] duration-150 " +
  "placeholder:text-graf-500 " +
  "focus:outline-none focus:ring-4 " +
  "disabled:cursor-not-allowed disabled:border-graf-200 disabled:bg-graf-50 disabled:text-graf-500 " +
  "read-only:bg-graf-50";

/* O foco tem dois sinais somados — a borda vira vermelha e o anel abre em
   volta. Um só não bastava: a borda sozinha some no scroll rápido e o anel
   sozinho, translúcido, não marca a caixa. */
/* graf-450 e não graf-300: a caixa é o único sinal de que ali se digita, e a
   WCAG 1.4.11 pede 3:1 para esse contorno. graf-300 dava 1,72:1 sobre branco;
   graf-450 dá 3,39:1. O hover sobe para graf-500 (5,23:1) para continuar
   sendo um degrau perceptível acima do estado de repouso. */
const NORMAL = "border-graf-450 hover:border-graf-500 focus:border-jb-500 focus:ring-jb-500/20";
const COM_ERRO = "border-jb-500 focus:border-jb-600 focus:ring-jb-500/25";

function Rotulo({
  htmlFor,
  children,
  obrigatorio,
}: {
  htmlFor: string;
  children: React.ReactNode;
  obrigatorio?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-graf-800">
      {children}
      {obrigatorio ? (
        <span className="ml-0.5 text-jb-600" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

function Ajuda({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-1.5 text-xs leading-relaxed text-graf-500">
      {texto}
    </p>
  );
}

export function Erro({ id, texto }: { id?: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-jb-700">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{texto}</span>
    </p>
  );
}

type CampoProps = React.InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  prefixo?: string;
  className?: string;
};

export function Campo({ rotulo, erro, ajuda, prefixo, className, required, ...props }: CampoProps) {
  const gerado = useId();
  const id = props.id ?? gerado;

  return (
    <div className={className}>
      <Rotulo htmlFor={id} obrigatorio={required}>
        {rotulo}
      </Rotulo>
      <div className="relative">
        {prefixo ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-graf-500">
            {prefixo}
          </span>
        ) : null}
        <input
          {...props}
          id={id}
          required={required}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
          className={cn(BASE_CAMPO, erro ? COM_ERRO : NORMAL, "h-11 px-3.5", prefixo && "pl-10")}
        />
      </div>
      <Erro id={`${id}-erro`} texto={erro} />
      {!erro ? <Ajuda id={`${id}-ajuda`} texto={ajuda} /> : null}
    </div>
  );
}

type AreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  className?: string;
};

export function Area({ rotulo, erro, ajuda, className, required, rows = 4, ...props }: AreaProps) {
  const gerado = useId();
  const id = props.id ?? gerado;

  return (
    <div className={className}>
      <Rotulo htmlFor={id} obrigatorio={required}>
        {rotulo}
      </Rotulo>
      <textarea
        {...props}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
        className={cn(BASE_CAMPO, erro ? COM_ERRO : NORMAL, "resize-y px-3.5 py-3 leading-relaxed")}
      />
      <Erro id={`${id}-erro`} texto={erro} />
      {!erro ? <Ajuda id={`${id}-ajuda`} texto={ajuda} /> : null}
    </div>
  );
}

type SelecaoProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string;
  erro?: string;
  ajuda?: string;
  className?: string;
};

export function Selecao({
  rotulo,
  erro,
  ajuda,
  className,
  required,
  children,
  ...props
}: SelecaoProps) {
  const gerado = useId();
  const id = props.id ?? gerado;

  return (
    <div className={className}>
      <Rotulo htmlFor={id} obrigatorio={required}>
        {rotulo}
      </Rotulo>
      <select
        {...props}
        id={id}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : ajuda ? `${id}-ajuda` : undefined}
        className={cn(BASE_CAMPO, erro ? COM_ERRO : NORMAL, "h-11 px-3 pr-9")}
      >
        {children}
      </select>
      <Erro id={`${id}-erro`} texto={erro} />
      {!erro ? <Ajuda id={`${id}-ajuda`} texto={ajuda} /> : null}
    </div>
  );
}

export function Marcador({
  rotulo,
  ajuda,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { rotulo: React.ReactNode; ajuda?: string }) {
  const gerado = useId();
  const id = props.id ?? gerado;

  return (
    /* O alvo de toque de um marcador é o rótulo, não o quadradinho: por isso o
       rótulo tem 44px de altura mínima. Com o rótulo alto, o quadrado centra
       no bloco inteiro — alinhá-lo à primeira linha exigiria uma margem fixa
       que quebra assim que o tamanho do texto muda. */
    <div className={cn("flex items-center gap-3", className)}>
      <input
        {...props}
        id={id}
        type="checkbox"
        className={cn(
          "size-5 shrink-0 cursor-pointer rounded border-graf-450 text-jb-500",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      />
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer flex-col justify-center text-sm leading-snug text-graf-700"
      >
        <span className="font-medium text-graf-800">{rotulo}</span>
        {ajuda ? <span className="mt-0.5 block text-xs text-graf-500">{ajuda}</span> : null}
      </label>
    </div>
  );
}

/** Grupo de opções em forma de "pílulas" — usado em urgência, condição, filtros. */
export function Opcoes<T extends string>({
  nome,
  rotulo,
  valor,
  opcoes,
  aoMudar,
  className,
}: {
  nome: string;
  rotulo?: string;
  valor: T;
  opcoes: { valor: T; rotulo: string; descricao?: string }[];
  aoMudar?: (v: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      {rotulo ? (
        <legend className="mb-2 text-sm font-semibold text-graf-800">{rotulo}</legend>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => {
          const ativo = opcao.valor === valor;
          return (
            <label
              key={opcao.valor}
              className={cn(
                "flex min-h-11 cursor-pointer flex-col justify-center rounded-lg border px-4 py-2.5 text-sm",
                "transition-[border-color,background-color,color] duration-150",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-jb-500",
                ativo
                  ? "border-jb-500 bg-jb-50 font-semibold text-jb-800 shadow-xs"
                  : "border-graf-450 bg-white text-graf-700 hover:border-graf-500 hover:bg-graf-50",
              )}
            >
              <input
                type="radio"
                name={nome}
                value={opcao.valor}
                checked={ativo}
                onChange={() => aoMudar?.(opcao.valor)}
                className="sr-only"
              />
              {opcao.rotulo}
              {opcao.descricao ? (
                <span className="mt-0.5 block text-xs font-normal text-graf-500">
                  {opcao.descricao}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
