import { PaginaEquipamento, metadataDoEquipamento } from "@/components/site/pagina-equipamento";

/* Página de pouso de anúncio: "Cadeira odontológica". O conteúdo mora em
   `@/lib/paginas-equipamento`; o desenho, em `PaginaEquipamento`. */

const SLUG = "cadeira-odontologica";

export function generateMetadata() {
  return metadataDoEquipamento(SLUG);
}

export default function Page() {
  return <PaginaEquipamento slug={SLUG} />;
}
