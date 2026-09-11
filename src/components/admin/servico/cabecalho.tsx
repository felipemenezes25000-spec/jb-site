import Link from "next/link";

import {
  CabecalhoBase,
  GradeDados,
  ParDados,
  SubNav,
  type ItemSubNav,
} from "@/components/admin/pagina";
import type { Migalha } from "@/components/ui/data";
import type { StaffUser } from "@/lib/auth";
import { podeVer, type AreaAdmin } from "@/lib/permissoes";
import { cn } from "@/lib/utils";

/* ============================================================================
   Peças de página do backoffice técnico

   Cabeçalho, sub-navegação e lista rótulo/valor. São componentes de servidor:
   sem estado, sem evento — só o desenho que se repete em toda tela desta área,
   para que "Chamados", "OS" e "Manutenção" pareçam o mesmo produto.

   O cabeçalho e a lista de dados vieram para `admin/pagina.tsx`, que é de onde
   as áreas comercial e de conteúdo também desenham as suas: o painel inteiro
   passa a ter um só tamanho de título e um só ritmo de ficha.
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
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  /** Etiquetas de estado ao lado do título. */
  etiquetas?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <CabecalhoBase
      trilha={trilha}
      titulo={titulo}
      descricao={descricao}
      etiquetas={etiquetas}
      acoes={acoes}
      className={className}
    />
  );
}

export type { ItemSubNav };

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
  return <SubNav itens={itens} atual={atual} className={className} />;
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
    <GradeDados colunas={colunas} className={className}>
      {children}
    </GradeDados>
  );
}

export function Dado({
  rotulo,
  children,
  vazio,
  className,
}: {
  rotulo: string;
  children?: React.ReactNode;
  /** O que mostrar quando não há valor. Nunca deixe a linha em branco. */
  vazio?: string;
  className?: string;
}) {
  return (
    <ParDados rotulo={rotulo} vazio={vazio} className={className}>
      {children}
    </ParDados>
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
        "flex min-h-11 min-w-[7.5rem] flex-1 flex-col justify-center rounded-lg border px-3.5 py-2.5 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
        ativo
          ? "border-jb-500 bg-jb-50 ring-1 ring-inset ring-jb-500/25"
          : "border-graf-200 bg-white hover:border-graf-300 hover:bg-graf-50",
        className,
      )}
    >
      <span
        className={cn(
          "tabular text-xl font-bold leading-none",
          ativo ? "text-jb-700" : "text-graf-950",
        )}
      >
        {valor}
      </span>
      <span
        className={cn(
          "mt-1.5 text-apoio font-medium leading-snug",
          ativo ? "text-jb-700" : "text-graf-500",
        )}
      >
        {rotulo}
      </span>
    </Link>
  );
}
