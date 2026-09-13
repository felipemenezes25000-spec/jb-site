import type { CondicaoProduto } from "@/components/loja/produto/condicao";
import type { CertificadoDaUnidade } from "@/components/loja/produto/selo-certificado";

export type ItemDeChecklist = {
  id: string;
  rotulo: string;
  resultado: string;
  nota: string;
};

type Props = {
  id?: string;
  condicao: CondicaoProduto;
  numeroDeSerie: string | null;
  anoDeFabricacao: number | null;
  horasDeUso: number | null;
  ciclos: number | null;
  garantiaMeses: number | null;
  notasDeEstado: string;
  notasDeInspecao: string;
  checklist: ItemDeChecklist[];
  certificado?: CertificadoDaUnidade | null;
  vendida?: boolean;
};

/**
 * O antigo "passaporte da unidade" foi retirado da vitrine.
 * Mantemos a assinatura do componente temporariamente para não acoplar a
 * remoção visual ao restante da lógica de unidade/certificação da PDP.
 */
export function UnidadeFisica(_props: Props) {
  return null;
}
