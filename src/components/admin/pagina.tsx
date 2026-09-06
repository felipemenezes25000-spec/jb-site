import Link from "next/link";

import { Trilha, type Migalha } from "@/components/ui/data";
import { cn } from "@/lib/utils";

/* ============================================================================
   Chassi das telas do painel

   Antes deste arquivo, o mesmo cabeçalho de página existia desenhado de três
   jeitos — um em `conteudo/cabecalho.tsx`, um em `servico/cabecalho.tsx` e um
   em `vendas/comuns.tsx` —, cada um com um tamanho de título e um respiro
   diferente. O mesmo valia para o par rótulo/valor e para a moldura branca dos
   formulários. Quem abria Pedidos e depois Chamados via dois produtos.

   Agora o desenho mora aqui e cada área continua exportando o nome que já
   usava, apenas repassando. As telas não precisaram mudar de import e o
   espaçamento externo de cada variante foi preservado — o que se unificou é o
   miolo: escala do título, peso, cor e ritmo.

   Tudo aqui é marcação pura, sem estado e sem evento: serve igual em página de
   servidor e dentro de formulário cliente.
   ============================================================================ */

export function CabecalhoBase({
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
  /** Selo de estado ao lado do título — situação, contagem, aviso curto. */
  etiquetas?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {trilha && trilha.length > 0 ? <Trilha itens={trilha} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        {/* `min-w-0` para o título longo truncar dentro da coluna em vez de
            empurrar as ações para fora da tela em 360px. */}
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-[1.625rem] font-bold leading-[1.15] tracking-[-0.02em] text-graf-950 sm:text-[1.75rem]">
              {titulo}
            </h1>
            {etiquetas}
          </div>
          {descricao ? (
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-graf-500">{descricao}</p>
          ) : null}
        </div>

        {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------ rótulo/valor */

/**
 * Par rótulo/valor da ficha.
 *
 * Sem valor, o lugar não fica com um travessão solto: diz por escrito que o
 * dado não foi informado, que é o que a pessoa precisa saber para ir atrás
 * dele. O rótulo continua na tela porque a ficha é uma lista fixa — some o
 * rótulo e a coluna da direita desalinha da esquerda.
 */
export function ParDados({
  rotulo,
  children,
  vazio = "Não informado",
  className,
}: {
  rotulo: string;
  children?: React.ReactNode;
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
      <dt className="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-graf-500">
        {rotulo}
      </dt>
      <dd
        className={cn(
          "mt-1 text-[0.9375rem] leading-relaxed",
          temValor ? "text-graf-900" : "italic text-graf-500",
        )}
      >
        {temValor ? children : vazio}
      </dd>
    </div>
  );
}

/** Grade de `ParDados`. Empilha no celular, duas ou três colunas depois. */
export function GradeDados({
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
        "grid grid-cols-1 gap-x-8 gap-y-5",
        colunas === 2 && "sm:grid-cols-2",
        colunas === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </dl>
  );
}

/* ------------------------------------------------------------ formulários */

/**
 * Moldura branca de um bloco de formulário.
 *
 * Borda no lugar de sombra: no painel um formulário longo tem seis dessas
 * caixas na mesma tela, e seis sombras viram sujeira. A sombra fica para o que
 * precisa flutuar de verdade — menu, diálogo, barra grudada no rodapé.
 */
export function BlocoForm({
  titulo,
  descricao,
  acao,
  espacado = true,
  children,
  className,
}: {
  titulo?: React.ReactNode;
  descricao?: React.ReactNode;
  /** Comando no canto do bloco — "Adicionar", "Ver no site". */
  acao?: React.ReactNode;
  /** Distribui os campos com respiro próprio. Desligue se o filho já cuida disso. */
  espacado?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-graf-200 bg-white p-5 sm:p-6", className)}>
      {titulo ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="text-[1.0625rem] font-bold leading-snug text-graf-950">{titulo}</h2>
            {descricao ? (
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-graf-500">{descricao}</p>
            ) : null}
          </div>
          {acao}
        </div>
      ) : null}

      {espacado ? <div className="space-y-5">{children}</div> : children}
    </section>
  );
}

/**
 * Barra de ação grudada no fim do formulário.
 *
 * As margens negativas dependem do respiro de quem embrulha, por isso vêm de
 * fora por `className` — o que é igual em toda tela é a altura, a borda, o
 * fundo e o lugar da linha de ajuda.
 */
export function BarraForm({
  ajuda,
  children,
  className,
}: {
  ajuda?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-graf-200 bg-white/95 py-3.5 backdrop-blur",
        className,
      )}
    >
      {ajuda ? (
        <p className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-graf-500">{ajuda}</p>
      ) : null}
      <div className={cn("flex flex-wrap items-center gap-3", !ajuda && "ml-auto")}>{children}</div>
    </div>
  );
}

/** Título de um grupo de campos dentro de um bloco — divide sem virar acordeão. */
export function GrupoCampos({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-graf-500">
          {titulo}
        </h3>
        {descricao ? (
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-graf-500">{descricao}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------- sub-navegação */

export type ItemSubNav = { rotulo: string; href: string; contador?: number };

/**
 * Abas de uma área — "Visitas / Contratos / Planos", "Produtos / Categorias /
 * Marcas". Recebe qual está ativa por prop em vez de ler o pathname: assim
 * continua sendo componente de servidor e a página, que já sabe onde está, não
 * paga um bundle de cliente por isso.
 *
 * Um desenho só para todas as áreas. Antes o catálogo usava pílulas escuras e a
 * assistência usava sublinhado: a mesma navegação parecia dois produtos.
 */
export function SubNav({
  itens,
  atual,
  rotuloDaNavegacao = "Seções da área",
  className,
}: {
  itens: ItemSubNav[];
  /** `href` do item ativo. */
  atual: string;
  rotuloDaNavegacao?: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={rotuloDaNavegacao}
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
                  "-mb-px inline-flex min-h-12 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-[0.9375rem] font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500",
                  ativo
                    ? "border-jb-500 text-jb-700"
                    : "border-transparent text-graf-500 hover:border-graf-300 hover:text-graf-800",
                )}
              >
                {item.rotulo}
                {typeof item.contador === "number" ? (
                  <span
                    className={cn(
                      // 12px e não 11: o contador é informação, e 1px aqui não muda
                      // o desenho da pílula mas tira o texto do limite do legível
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
