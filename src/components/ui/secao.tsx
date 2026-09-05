import { cn } from "@/lib/utils";

/* ============================================================================
   Seção / Faixa

   O envelope de uma faixa inteira da página pública: fundo, respiro vertical
   e container já embutidos. É o que impede que cada tela invente o seu
   próprio espaçamento e a página acabe com nove ritmos diferentes.

       <Secao fundo="clara" espaco="lg">
         <TituloSecao … />
         …
       </Secao>

   Em `fundo="grafite"` a faixa ganha `.on-dark`: título fica branco, o texto
   secundário de `texto-suave` clareia sozinho e o anel de foco vira branco.
   Grafite é área estratégica — uma, no máximo duas faixas por página.
   ============================================================================ */

export type FundoSecao = "branco" | "clara" | "afundada" | "grafite" | "marca";
export type EspacoSecao = "sm" | "md" | "lg" | "xl" | "nenhum";
export type LarguraSecao = "padrao" | "estreita" | "cheia";

const FUNDOS: Record<FundoSecao, string> = {
  branco: "bg-white",
  clara: "bg-surface-muted",
  afundada: "bg-surface-sunken",
  grafite: "on-dark bg-graf-950 text-graf-200",
  marca: "bg-jb-50",
};

/* Respiro vertical: sempre menor no celular, sempre proporcional. */
const ESPACOS: Record<EspacoSecao, string> = {
  nenhum: "",
  sm: "py-10 md:py-12",
  md: "py-14 md:py-20",
  lg: "py-16 md:py-24 lg:py-28",
  xl: "py-20 md:py-28 lg:py-36",
};

const LARGURAS: Record<LarguraSecao, string> = {
  padrao: "container-jb",
  estreita: "container-estreito",
  cheia: "w-full",
};

export function Secao({
  fundo = "branco",
  espaco = "md",
  largura = "padrao",
  separador,
  padraoDeFundo,
  como = "section",
  id,
  rotulo,
  rotuladoPor,
  className,
  classNameInterno,
  children,
}: {
  fundo?: FundoSecao;
  espaco?: EspacoSecao;
  largura?: LarguraSecao;
  /** Linha fina no alto, para separar faixas de mesma cor. */
  separador?: boolean;
  /** Malha discreta da marca. Só em faixa grande — nunca como papel de parede. */
  padraoDeFundo?: boolean;
  como?: "section" | "div" | "header" | "footer" | "article";
  id?: string;
  /** Nome acessível da região, quando ela não começa por um heading visível. */
  rotulo?: string;
  /** Id do heading que dá nome à região. */
  rotuladoPor?: string;
  className?: string;
  /** Classes do container interno — grade, alinhamento, largura extra. */
  classNameInterno?: string;
  children: React.ReactNode;
}) {
  const Elemento = como;

  return (
    <Elemento
      id={id}
      aria-label={rotulo}
      aria-labelledby={rotuladoPor}
      className={cn(
        "relative isolate",
        FUNDOS[fundo],
        ESPACOS[espaco],
        separador && (fundo === "grafite" ? "border-t border-white/10" : "border-t border-graf-200"),
        className,
      )}
    >
      {padraoDeFundo ? (
        <span
          aria-hidden
          className={cn(
            "field-orbit pointer-events-none absolute inset-0 -z-10",
            fundo === "grafite" ? "opacity-100" : "opacity-40",
            "[mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]",
          )}
        />
      ) : null}
      <div className={cn(LARGURAS[largura], classNameInterno)}>{children}</div>
    </Elemento>
  );
}

/**
 * Faixa de destaque — o convite ao próximo passo no fim de uma página.
 *
 * Não inventa conteúdo: título, apoio e ações vêm de quem usa. Só garante o
 * desenho — grafite com o vermelho no botão, ou vermelho pleno quando a
 * chamada é a única da tela.
 */
export function FaixaChamada({
  titulo,
  descricao,
  acoes,
  fundo = "grafite",
  className,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  fundo?: Extract<FundoSecao, "grafite" | "marca" | "clara">;
  className?: string;
}) {
  const escuro = fundo === "grafite";

  return (
    <Secao fundo={fundo} espaco="lg" className={className}>
      <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className={cn("text-display", escuro ? "text-white" : "texto-forte")}>{titulo}</h2>
          {descricao ? (
            <p
              className={cn(
                "texto-guia mt-4",
                escuro ? "text-graf-300" : "text-graf-600",
              )}
            >
              {descricao}
            </p>
          ) : null}
        </div>
        {acoes ? <div className="flex flex-wrap items-center gap-3">{acoes}</div> : null}
      </div>
    </Secao>
  );
}
