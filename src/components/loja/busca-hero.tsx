"use client";

import { BuscaComSugestoes } from "@/components/loja/busca-sugestoes";

/**
 * Busca grande — hero da home, página 404 e página de erro.
 *
 * Mesma máquina do campo do cabeçalho (`BuscaComSugestoes`), um degrau maior:
 * caixa de 56px no celular e 64px no desktop, botão de enviar dentro dela e
 * foco marcado por borda e anel ao mesmo tempo.
 *
 * O botão é grafite de propósito. Nesta altura da página o vermelho já está
 * reservado para a ação principal (comprar, solicitar assistência) — dois
 * botões vermelhos lado a lado apagariam a hierarquia.
 *
 * Este arquivo continua existindo por ser o nome que 404 e erro já importam, e
 * porque "a busca grande" é uma decisão de página, não do componente.
 */
export function BuscaHero({
  placeholder = "Busque equipamento, marca, modelo ou SKU",
  rotulo = "Buscar no catálogo",
}: {
  placeholder?: string;
  rotulo?: string;
}) {
  return <BuscaComSugestoes forma="hero" placeholder={placeholder} rotulo={rotulo} />;
}
