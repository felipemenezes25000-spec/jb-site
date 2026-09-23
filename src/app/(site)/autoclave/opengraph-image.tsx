import { imagemDoEquipamento } from "@/components/site/imagem-equipamento-og";

export const alt = "Conserto de autoclave com a JB Soluções Odontológicas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return imagemDoEquipamento("autoclave");
}
