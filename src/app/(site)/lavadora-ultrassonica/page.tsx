import { PaginaEquipamento, metadataDoEquipamento } from "@/components/site/pagina-equipamento";

/* Página de pouso de anúncio: "Lavadora ultrassônica". O conteúdo mora em
   `@/lib/paginas-equipamento`; o desenho, em `PaginaEquipamento`. */

const SLUG = "lavadora-ultrassonica";

export function generateMetadata() {
  return metadataDoEquipamento(SLUG);
}

export default function Page() {
  return <PaginaEquipamento slug={SLUG} />;
}
