import { SubNav } from "@/components/admin/pagina";

/* ============================================================================
   Atalhos dos cadastros da assistência

   Categorias de equipamento e serviços são duas telas do mesmo assunto, e só
   uma delas cabe no menu lateral. Esta faixa liga as duas. Produtos, marcas e
   estoque saíram junto com a loja.

   O desenho é o mesmo `SubNav` das abas da assistência, com `<nav>` de verdade
   e `aria-current` na tela aberta.
   ============================================================================ */

export type TelaDoCatalogo = "categorias" | "servicos";

const TELAS: { chave: TelaDoCatalogo; rotulo: string; href: string }[] = [
  { chave: "categorias", rotulo: "Categorias de equipamento", href: "/admin/categorias" },
  { chave: "servicos", rotulo: "Serviços", href: "/admin/servicos" },
];

export function AtalhosCatalogo({
  atual,
  className,
}: {
  atual: TelaDoCatalogo;
  className?: string;
}) {
  return (
    <SubNav
      itens={TELAS.map((tela) => ({ rotulo: tela.rotulo, href: tela.href }))}
      atual={TELAS.find((tela) => tela.chave === atual)?.href ?? ""}
      rotuloDaNavegacao="Cadastros da assistência"
      className={className}
    />
  );
}
