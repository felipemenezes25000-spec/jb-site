/**
 * Logotipo de marca, com o arquivo local como reserva.
 *
 * Os PNGs das quatro marcas do catálogo estão em `public/marcas` desde antes
 * de existir upload de logotipo no painel, e nenhum registro de `Brand` tem
 * `logoId` preenchido. O resultado é que o carrossel da home mostrava os
 * logotipos — ele tinha esta tabela embutida — enquanto `/marcas` e a página
 * de cada marca caíam no monograma de iniciais ("ALT", "SCH"), o que dá ao
 * site um ar de inacabado bem onde ele deveria mostrar as marcas que
 * representa.
 *
 * A tabela é reserva, não fonte: assim que alguém enviar o logotipo pelo
 * painel, o que veio do banco tem prioridade e esta lista para de ser
 * consultada para aquela marca. É por isso que ela vive aqui, num lugar só, e
 * não copiada em cada tela.
 */

const LOGOS_LOCAIS: Record<string, string> = {
  alt: "/marcas/logo-alt.png",
  schuster: "/marcas/logo-schuster.png",
  suctron: "/marcas/logo-suctron.png",
  sugmaster: "/marcas/logo-sugmaster.png",
};

/** O slug sem o prefixo de demonstração, que é como a tabela indexa. */
export function chaveDaMarca(slug: string) {
  return slug.toLowerCase().replace(/^demo-/, "");
}

export type MarcaComLogo = {
  slug: string;
  name: string;
  logo?: { url: string; alt?: string | null } | null;
};

/** O logotipo a exibir: o enviado no painel, senão o arquivo local. */
export function logoDaMarca(marca: MarcaComLogo): { url: string; alt: string } | null {
  if (marca.logo?.url) {
    return { url: marca.logo.url, alt: marca.logo.alt || marca.name };
  }

  const local = LOGOS_LOCAIS[chaveDaMarca(marca.slug)];
  return local ? { url: local, alt: marca.name } : null;
}

/** Se a marca tem alguma arte — usado para montar faixas só de logotipos. */
export function temLogo(marca: MarcaComLogo) {
  return logoDaMarca(marca) !== null;
}
