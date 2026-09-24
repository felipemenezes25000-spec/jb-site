import type { IdEquipamento } from "@/lib/diagnostico";

/* ============================================================================
   Portfólio de assistência: os equipamentos em que a JB faz manutenção

   A grade pública da home lê daqui. Cada item é um TIPO de equipamento, com
   foto e nome — nada de modelo, ficha técnica, preço ou descrição de venda.
   Quem vê precisa entender só isto: "a JB conserta esse tipo de aparelho".

   As fotos moram em `public/site/equip/portfolio`, todas no mesmo quadro
   (1000×1000, fundo branco, produto centrado, mesmo tamanho percebido). O
   branco some no cartão com `mix-blend-multiply`. Duas origens:

   - `evoxx`: fotos da linha EVOXX enviadas pela JB (Jeferson, 24/09/2026).
     A JB é assistência técnica autorizada EVOXX, com fonte oficial (ver
     `@/lib/credenciais-de-marca`), então a marca miúda na peça não é
     afirmação nova;
   - `portfolio-2013`: recortes do portfólio técnico de 2013 fornecido pela
     JB.

   Adesivo de fabricante grande o bastante para ler no cartão ou na landing
   foi apagado (o "EVOXX 40L" do tanque do compressor e o do equipo): a JB
   conserta todas as marcas, e a foto ilustra o tipo, não o fabricante.

   Módulo puro: a grade (cliente) e os testes unitários leem daqui.
   ============================================================================ */

export type GrupoDoPortfolio = "esterilizacao" | "ar-e-succao" | "consultorio" | "clinico";

export type Grupo = { id: GrupoDoPortfolio; rotulo: string };

/** Áreas do consultório, na ordem dos filtros da grade. */
export const GRUPOS_DO_PORTFOLIO: readonly Grupo[] = [
  { id: "esterilizacao", rotulo: "Esterilização" },
  { id: "ar-e-succao", rotulo: "Ar e sucção" },
  { id: "consultorio", rotulo: "Consultório" },
  { id: "clinico", rotulo: "Clínico e laboratório" },
];

export type ItemDoPortfolio = {
  /** Id estável: nome do arquivo da foto e valor de `data-equipamento` quando não há `equipamento`. */
  slug: string;
  /** O que o cartão mostra. Tipo de equipamento, nunca modelo comercial. */
  nome: string;
  /** Como o nome entra no meio da mensagem: "raio-X odontológico". */
  naMensagem: string;
  grupo: GrupoDoPortfolio;
  fonte: "evoxx" | "portfolio-2013";
  /** Quando o equipamento também está na triagem e tem landing própria. */
  equipamento?: IdEquipamento;
};

export const PORTFOLIO_DE_ASSISTENCIA: readonly ItemDoPortfolio[] = [
  { slug: "autoclave", nome: "Autoclave", naMensagem: "autoclave", grupo: "esterilizacao", fonte: "evoxx", equipamento: "autoclave" },
  { slug: "compressor", nome: "Compressor odontológico", naMensagem: "compressor odontológico", grupo: "ar-e-succao", fonte: "evoxx", equipamento: "compressor" },
  { slug: "bomba-de-vacuo", nome: "Bomba de vácuo", naMensagem: "bomba de vácuo", grupo: "ar-e-succao", fonte: "evoxx", equipamento: "bomba-vacuo" },
  { slug: "cadeira-odontologica", nome: "Cadeira odontológica", naMensagem: "cadeira odontológica", grupo: "consultorio", fonte: "portfolio-2013", equipamento: "cadeira" },
  { slug: "seladora", nome: "Seladora", naMensagem: "seladora", grupo: "esterilizacao", fonte: "evoxx", equipamento: "seladora" },
  { slug: "destilador", nome: "Destilador de água", naMensagem: "destilador de água", grupo: "esterilizacao", fonte: "evoxx", equipamento: "destilador" },
  { slug: "lavadora-ultrassonica", nome: "Lavadora ultrassônica", naMensagem: "lavadora ultrassônica", grupo: "esterilizacao", fonte: "evoxx", equipamento: "lavadora" },
  { slug: "incubadora-biologica", nome: "Incubadora biológica", naMensagem: "incubadora biológica", grupo: "esterilizacao", fonte: "evoxx" },
  { slug: "pecas-de-mao", nome: "Peças de mão", naMensagem: "peças de mão", grupo: "clinico", fonte: "portfolio-2013" },
  { slug: "raio-x", nome: "Raio-X odontológico", naMensagem: "raio-X odontológico", grupo: "consultorio", fonte: "portfolio-2013" },
  { slug: "ultrassom-profilaxia", nome: "Ultrassom e profilaxia", naMensagem: "ultrassom e profilaxia", grupo: "clinico", fonte: "portfolio-2013" },
  { slug: "fotopolimerizador", nome: "Fotopolimerizador", naMensagem: "fotopolimerizador", grupo: "clinico", fonte: "portfolio-2013" },
  { slug: "amalgamador", nome: "Amalgamador", naMensagem: "amalgamador", grupo: "clinico", fonte: "portfolio-2013" },
  { slug: "equipo", nome: "Equipo odontológico", naMensagem: "equipo odontológico", grupo: "consultorio", fonte: "portfolio-2013" },
  { slug: "refletor", nome: "Refletor odontológico", naMensagem: "refletor odontológico", grupo: "consultorio", fonte: "portfolio-2013" },
  { slug: "mocho", nome: "Mocho odontológico", naMensagem: "mocho odontológico", grupo: "consultorio", fonte: "portfolio-2013" },
  { slug: "articulador", nome: "Articulador", naMensagem: "articulador", grupo: "clinico", fonte: "portfolio-2013" },
];

/** Foto do item no quadro padrão do portfólio. */
export function imagemDoPortfolio(slug: string): string {
  return `/site/equip/portfolio/${slug}.webp`;
}

/** Foto do equipamento da triagem, quando ele está no portfólio. */
export function imagemDoEquipamento(id: IdEquipamento): string | null {
  const item = PORTFOLIO_DE_ASSISTENCIA.find((candidato) => candidato.equipamento === id);
  return item ? imagemDoPortfolio(item.slug) : null;
}

/** O valor de `data-equipamento`: o id da triagem quando existe, para a medição não mudar de nome. */
export function idDeMedicao(item: ItemDoPortfolio): string {
  return item.equipamento ?? item.slug;
}

/** A pessoa revisa e envia no WhatsApp; o site só deixa a frase pronta. */
export function mensagemDoPortfolio(item: Pick<ItemDoPortfolio, "naMensagem"> | null): string {
  const alvo = item ? item.naMensagem : "um equipamento odontológico";
  return `Olá, JB! Vim pelo site e preciso de assistência e manutenção para ${alvo}.`;
}

export function itensDoGrupo(grupo: GrupoDoPortfolio | null): readonly ItemDoPortfolio[] {
  return grupo ? PORTFOLIO_DE_ASSISTENCIA.filter((item) => item.grupo === grupo) : PORTFOLIO_DE_ASSISTENCIA;
}
