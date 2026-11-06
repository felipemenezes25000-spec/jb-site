/* ============================================================================
   Planta de raio-X de cada foto

   Os traços moram em `public/site/raiox/<arquivo>`, gerados a partir da foto
   real por `scripts/gerar-raiox.mjs`. Uma foto sem planta simplesmente não
   ganha o scanner: o efeito nunca é condição para a foto aparecer.
   ============================================================================ */

const ORIGENS = ["/site/equip/portfolio/", "/site/"] as const;

const COM_PLANTA = new Set([
  "amalgamador",
  "articulador",
  "autoclave",
  "bomba-de-vacuo",
  "cadeira-odontologica",
  "compressor",
  "destilador",
  "equipo",
  "fotopolimerizador",
  "incubadora-biologica",
  "lavadora-ultrassonica",
  "mocho",
  "pecas-de-mao",
  "raio-x",
  "refletor",
  "seladora",
  "ultrassom-profilaxia",
  "bancada",
]);

/** Caminho da planta de uma foto do site, ou `null` quando ela não tem uma. */
export function plantaDaFoto(src: string): string | null {
  for (const origem of ORIGENS) {
    if (!src.startsWith(origem)) continue;
    const arquivo = src.slice(origem.length);
    const nome = arquivo.replace(/\.webp$/, "");
    if (nome.includes("/") || !COM_PLANTA.has(nome)) return null;
    return `/site/raiox/${nome}.webp`;
  }
  return null;
}
