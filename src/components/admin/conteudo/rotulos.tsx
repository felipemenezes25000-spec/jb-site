import type { TicketStatus } from "@prisma/client";

import type { Tom } from "@/components/ui/data";

/* ============================================================================
   Rótulos do backoffice de conteúdo, relacionamento e sistema

   Texto que aparece na tela mora num lugar só: listagem, ficha, formulário e
   ação usam a mesma palavra para a mesma coisa. Nenhum destes mapas tem lógica
   nem toca no banco, então serve tanto para componente de servidor quanto de
   cliente.
   ============================================================================ */

/* -------------------------------------------------------------------- leads */

/**
 * `Lead.status` é texto livre no banco (herança do site anterior). Estes são
 * os valores que o painel escreve; qualquer outro que apareça é exibido como
 * veio, sem inventar tradução.
 */
export const STATUS_LEAD = [
  "novo",
  "em_atendimento",
  "atendido",
  "convertido",
  "descartado",
] as const;

export type StatusLead = (typeof STATUS_LEAD)[number];

export const ROTULO_LEAD: Record<StatusLead, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  atendido: "Atendido",
  convertido: "Virou cliente",
  descartado: "Descartado",
};

export const TOM_LEAD: Record<StatusLead, Tom> = {
  novo: "alerta",
  em_atendimento: "andamento",
  atendido: "ok",
  convertido: "marca",
  descartado: "neutro",
};

export function rotuloLead(status: string) {
  return status in ROTULO_LEAD ? ROTULO_LEAD[status as StatusLead] : status;
}

export function tomLead(status: string): Tom {
  return status in TOM_LEAD ? TOM_LEAD[status as StatusLead] : "neutro";
}

/* ----------------------------------------------------------------- suporte */

export const ROTULO_TICKET: Record<TicketStatus, string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  aguardando_cliente: "Aguardando o cliente",
  fechado: "Fechado",
};

export const TOM_TICKET: Record<TicketStatus, Tom> = {
  aberto: "alerta",
  respondido: "andamento",
  aguardando_cliente: "aguardando",
  fechado: "ok",
};

/** Tickets que ainda dependem de alguém da JB. */
export const TICKETS_NA_FILA: TicketStatus[] = ["aberto", "aguardando_cliente"];

/* ------------------------------------------------------------ seções da home */

/**
 * Os tipos aceitos em `HomeSection.kind`. A lista é fechada de propósito: a
 * home só sabe desenhar o que está aqui, então deixar o campo livre criaria
 * seção que nunca aparece.
 */
export const TIPOS_SECAO = [
  "hero",
  "confianca",
  "categorias",
  "destaques",
  "seminovos",
  "assistencia",
  "como_funciona",
  "minha_jb",
  "planos",
  "sobre",
  "faq",
  "cta",
] as const;

export type TipoSecao = (typeof TIPOS_SECAO)[number];

export const SECOES: Record<TipoSecao, { rotulo: string; descricao: string }> = {
  hero: {
    rotulo: "Abertura",
    descricao: "Primeiro bloco da home, com título, chamada e botão principal",
  },
  confianca: {
    rotulo: "Prova de confiança",
    descricao: "Tempo de casa, atendimento e diferenciais da JB",
  },
  categorias: {
    rotulo: "Categorias",
    descricao: "Atalhos para as categorias publicadas do catálogo",
  },
  destaques: {
    rotulo: "Produtos em destaque",
    descricao: "Vitrine dos produtos marcados como destaque",
  },
  seminovos: {
    rotulo: "Seminovos revisados",
    descricao: "Vitrine dos equipamentos seminovos disponíveis",
  },
  assistencia: {
    rotulo: "Assistência técnica",
    descricao: "Chamada para abrir chamado e conhecer o serviço",
  },
  como_funciona: {
    rotulo: "Como funciona",
    descricao: "Passo a passo do atendimento, da solicitação à entrega",
  },
  minha_jb: {
    rotulo: "Minha JB",
    descricao: "Convite para a área do cliente e o prontuário do equipamento",
  },
  planos: {
    rotulo: "Planos de manutenção",
    descricao: "Contratos preventivos oferecidos pela JB",
  },
  sobre: { rotulo: "Sobre a empresa", descricao: "Resumo institucional na home" },
  faq: { rotulo: "Dúvidas frequentes", descricao: "Perguntas do grupo geral" },
  cta: { rotulo: "Chamada final", descricao: "Último bloco, com convite para contato" },
};

export function ehTipoSecao(valor: string): valor is TipoSecao {
  return (TIPOS_SECAO as readonly string[]).includes(valor);
}

/** Tipos que só listam dados do catálogo: título e texto são o enquadramento. */
export const SECOES_AUTOMATICAS: TipoSecao[] = [
  "categorias",
  "destaques",
  "seminovos",
  "planos",
  "faq",
];

/* --------------------------------------------------------------------- faq */

export const GRUPOS_FAQ = ["geral", "compra", "entrega", "assistencia", "produto"] as const;

export type GrupoFaq = (typeof GRUPOS_FAQ)[number];

export const ROTULO_GRUPO_FAQ: Record<GrupoFaq, string> = {
  geral: "Geral",
  compra: "Compra e pagamento",
  entrega: "Entrega e retirada",
  assistencia: "Assistência técnica",
  produto: "Sobre um produto",
};

export function rotuloGrupoFaq(grupo: string) {
  return grupo in ROTULO_GRUPO_FAQ ? ROTULO_GRUPO_FAQ[grupo as GrupoFaq] : grupo;
}

/* ---------------------------------------------------------- configurações */

export const ROTULO_GRUPO_CONFIG: Record<string, string> = {
  identidade: "Identidade",
  contato: "Contato",
  endereco: "Endereço",
  loja: "Loja",
  social: "Redes sociais",
  seo: "Busca e compartilhamento",
  integracoes: "Integrações",
};

export const DESCRICAO_GRUPO_CONFIG: Record<string, string> = {
  identidade: "Como a empresa se apresenta no site inteiro",
  contato: "Telefones, WhatsApp, e-mail e horário — usados no cabeçalho e no rodapé",
  endereco: "Endereço da JB e o mapa exibido na página de contato",
  loja: "Regras de exibição da vitrine e do checkout",
  social: "Perfis exibidos no rodapé. Deixe vazio para esconder o ícone.",
  seo: "Título e descrição padrão de quem chega pela busca ou por um link compartilhado",
  integracoes: "Chaves de serviços externos",
};

/* -------------------------------------------------------------- auditoria */

/** Nome legível da entidade registrada na trilha de auditoria. */
export const ROTULO_ENTIDADE: Record<string, string> = {
  User: "Usuário",
  usuario: "Usuário",
  pagina: "Página",
  secao_home: "Seção da home",
  slide: "Slide",
  faq: "Pergunta frequente",
  midia: "Mídia",
  lead: "Lead",
  ticket: "Ticket de suporte",
  cliente: "Cliente",
  Customer: "Cliente",
  configuracoes: "Configurações",
  pedido: "Pedido",
  Order: "Pedido",
  produto: "Produto",
  Product: "Produto",
  chamado: "Chamado",
  ordem_servico: "Ordem de serviço",
  orcamento: "Orçamento",
  estoque: "Estoque",
};

export function rotuloEntidade(entidade: string) {
  return ROTULO_ENTIDADE[entidade] ?? entidade;
}
