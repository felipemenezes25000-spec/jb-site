import Link from "next/link";

import { Trilha, type Migalha } from "@/components/ui/data";
import type { StaffUser } from "@/lib/auth";
import { podeVer, type AreaAdmin } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

/* ============================================================================
   Peças de página do backoffice técnico

   Cabeçalho, sub-navegação e lista rótulo/valor. São componentes de servidor:
   sem estado, sem evento — só o desenho que se repete em toda tela desta área,
   para que "Chamados", "OS" e "Manutenção" pareçam o mesmo produto.
   ============================================================================ */

export function CabecalhoPagina({
  trilha,
  titulo,
  descricao,
  etiquetas,
  acoes,
  className,
}: {
  trilha?: Migalha[];
  titulo: string;
  descricao?: React.ReactNode;
  /** Etiquetas de estado ao lado do título. */
  etiquetas?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {trilha && trilha.length > 0 ? <Trilha itens={trilha} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl font-bold leading-tight text-graf-950">{titulo}</h1>
            {etiquetas}
          </div>
          {descricao ? (
            <p className="mt-1.5 text-sm leading-relaxed text-graf-500">{descricao}</p>
          ) : null}
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
      </div>
    </header>
  );
}

export type ItemSubNav = { rotulo: string; href: string; contador?: number };

/**
 * Sub-navegação da área. Recebe qual está ativa por prop em vez de ler o
 * pathname: assim continua sendo componente de servidor e a página, que já
 * sabe onde está, não paga um bundle de cliente por isso.
 */
export function SubNavegacao({
  itens,
  atual,
  className,
}: {
  itens: ItemSubNav[];
  /** `href` do item ativo. */
  atual: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Seções da área"
      className={cn("scrollbar-none -mx-1 overflow-x-auto px-1", className)}
    >
      <ul className="flex min-w-max items-center gap-1 border-b border-graf-200">
        {itens.map((item) => {
          const ativo = item.href === atual;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                  ativo
                    ? "border-jb-500 text-jb-700"
                    : "border-transparent text-graf-500 hover:border-graf-300 hover:text-graf-800",
                )}
              >
                {item.rotulo}
                {typeof item.contador === "number" ? (
                  <span
                    className={cn(
                      // text-xs (12px) em vez de 11px: contador é informação, e 1px aqui não
                      // muda o desenho da pílula mas tira o texto do limite do legível
                      "tabular inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                      ativo ? "bg-jb-100 text-jb-700" : "bg-graf-100 text-graf-600",
                    )}
                  >
                    {item.contador}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Seções do serviço em campo, cada uma amarrada à área que a protege.
 *
 * A barra atravessa cinco telas que o menu lateral mostra separadas (Agenda,
 * Manutenção e Técnicos são áreas distintas em `@/lib/permissoes`), e nem todo
 * papel abre as cinco: o técnico opera manutenção e agenda, mas o cadastro da
 * equipe é de administrador e gestor. Por isso a lista é filtrada por
 * `podeVer` antes de virar tela — mostrar uma aba que só devolve
 * "sem permissão" é levar a pessoa a um beco.
 */
const SECOES_SERVICO: (ItemSubNav & { area: AreaAdmin })[] = [
  { rotulo: "Visitas", href: "/admin/manutencao", area: "manutencao" },
  { rotulo: "Contratos", href: "/admin/manutencao/contratos", area: "manutencao" },
  { rotulo: "Planos", href: "/admin/manutencao/planos", area: "manutencao" },
  { rotulo: "Agenda", href: "/admin/agenda", area: "agenda" },
  { rotulo: "Técnicos", href: "/admin/tecnicos", area: "tecnicos" },
];

/**
 * Abas da área de serviço que este usuário realmente abre.
 *
 * Chamar do componente de servidor da página, que já tem o usuário devolvido
 * por `exigirArea`. Isto é conveniência de navegação, não autorização: quem
 * decide é a guarda de cada página.
 */
export function subnavServico(usuario: StaffUser | null): ItemSubNav[] {
  return SECOES_SERVICO.filter((secao) => podeVer(usuario, secao.area)).map((secao) => ({
    rotulo: secao.rotulo,
    href: secao.href,
  }));
}

/** Lista rótulo/valor. Duas colunas a partir de sm, empilhada no celular. */
export function Dados({
  children,
  colunas = 2,
  className,
}: {
  children: React.ReactNode;
  colunas?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        colunas === 1 ? "grid-cols-1" : colunas === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function Dado({
  rotulo,
  children,
  vazio = "—",
  className,
}: {
  rotulo: string;
  children?: React.ReactNode;
  /** O que mostrar quando não há valor. Nunca deixe a linha em branco. */
  vazio?: string;
  className?: string;
}) {
  const temValor =
    children !== null &&
    children !== undefined &&
    children !== false &&
    children !== "" &&
    !(Array.isArray(children) && children.length === 0);

  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-graf-500">{rotulo}</dt>
      <dd className={cn("mt-1 text-sm", temValor ? "text-graf-900" : "text-graf-500")}>
        {temValor ? children : vazio}
      </dd>
    </div>
  );
}

/** Bloco de contagem clicável usado nas barras de status das listagens. */
export function Contador({
  rotulo,
  valor,
  href,
  ativo,
  className,
}: {
  rotulo: string;
  valor: number;
  href: string;
  ativo?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "true" : undefined}
      className={cn(
        "flex min-h-11 min-w-[7.5rem] flex-1 flex-col justify-center rounded-lg border px-3 py-2 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        ativo
          ? "border-jb-500 bg-jb-50"
          : "border-graf-200 bg-white hover:border-graf-300 hover:bg-graf-50",
        className,
      )}
    >
      <span className={cn("tabular text-lg font-bold leading-none", ativo ? "text-jb-700" : "text-graf-950")}>
        {valor}
      </span>
      <span className="mt-1 text-xs font-medium leading-snug text-graf-500">{rotulo}</span>
    </Link>
  );
}
