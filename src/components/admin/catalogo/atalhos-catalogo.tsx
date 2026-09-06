import { SubNav } from "@/components/admin/pagina";

/* ============================================================================
   Atalhos do catálogo

   Produtos, Categorias, Marcas, Serviços e Estoque são cinco telas do mesmo
   assunto, mas só duas delas cabem no menu lateral. Esta faixa é o que liga as
   cinco — sem ela, Categorias e Marcas só existiriam para quem souber o
   endereço de cor.

   O desenho é o mesmo `SubNav` das abas da assistência: até aqui esta faixa
   usava pílulas escuras e a de lá, sublinhado — a mesma navegação parecendo
   dois produtos diferentes. Ele já traz `<nav>` de verdade com `aria-current`
   na tela aberta: quem navega por teclado ou leitor de tela sabe onde está sem
   depender do contraste do fundo.
   ============================================================================ */

export type TelaDoCatalogo = "produtos" | "categorias" | "marcas" | "servicos" | "estoque";

const TELAS: { chave: TelaDoCatalogo; rotulo: string; href: string }[] = [
  { chave: "produtos", rotulo: "Produtos", href: "/admin/produtos" },
  { chave: "categorias", rotulo: "Categorias", href: "/admin/categorias" },
  { chave: "marcas", rotulo: "Marcas", href: "/admin/marcas" },
  { chave: "servicos", rotulo: "Serviços", href: "/admin/servicos" },
  { chave: "estoque", rotulo: "Estoque", href: "/admin/estoque" },
];

export function AtalhosCatalogo({
  atual,
  /** Some com "Estoque" para quem não abre a área. */
  mostrarEstoque = true,
  className,
}: {
  atual: TelaDoCatalogo;
  mostrarEstoque?: boolean;
  className?: string;
}) {
  const telas = mostrarEstoque ? TELAS : TELAS.filter((tela) => tela.chave !== "estoque");

  return (
    <SubNav
      itens={telas.map((tela) => ({ rotulo: tela.rotulo, href: tela.href }))}
      atual={TELAS.find((tela) => tela.chave === atual)?.href ?? ""}
      rotuloDaNavegacao="Seções do catálogo"
      className={className}
    />
  );
}
