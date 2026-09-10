/**
 * Navegação pública da JB. Cabeçalho, gaveta mobile, rodapé e sitemap partem
 * destas listas para não existir uma nomenclatura diferente em cada tela.
 */

export type ChaveMega = "catalogo" | "assistencia";

export type ItemMenu = {
  rotulo: string;
  href: string;
  descricao?: string;
  megaMenu?: ChaveMega;
};

export const MENU_PRINCIPAL: ItemMenu[] = [
  {
    rotulo: "Loja",
    href: "/loja",
    descricao: "Produtos por categoria e condição",
    megaMenu: "catalogo",
  },
  {
    rotulo: "Seminovos",
    href: "/seminovos",
    descricao: "Unidades seminovas disponíveis",
  },
  {
    rotulo: "Assistência técnica",
    href: "/assistencia-tecnica",
    descricao: "Abra um chamado e acompanhe o atendimento",
    megaMenu: "assistencia",
  },
  {
    rotulo: "Manutenção",
    href: "/manutencao-preventiva",
    descricao: "Manutenção preventiva programada",
  },
  {
    rotulo: "Central Técnica",
    href: "/central-tecnica",
    descricao: "Conteúdo técnico da equipe JB",
  },
];

export const CONDICOES = [
  { slug: "novos", rotulo: "Novos", valor: "novo" },
  { slug: "seminovos", rotulo: "Seminovos JB", valor: "seminovo" },
  { slug: "usados", rotulo: "Usados", valor: "usado" },
  { slug: "recondicionados", rotulo: "Recondicionados JB", valor: "recondicionado" },
] as const;

export const MENU_ASSISTENCIA: ItemMenu[] = [
  {
    rotulo: "Solicitar assistência",
    href: "/assistencia-tecnica/solicitar",
    descricao: "Abra um chamado em poucos passos",
  },
  {
    rotulo: "Como funciona",
    href: "/assistencia-tecnica#como-funciona",
    descricao: "Do diagnóstico à conclusão",
  },
  {
    rotulo: "Manutenção preventiva",
    href: "/manutencao-preventiva",
    descricao: "Organize o cuidado antes da parada",
  },
  {
    rotulo: "Planos de manutenção",
    href: "/planos-de-manutencao",
    descricao: "Opções de acompanhamento para a clínica",
  },
];

export const ATALHOS_CLIENTE: ItemMenu[] = [
  { rotulo: "Pedidos", href: "/minha-jb/pedidos" },
  { rotulo: "Equipamentos", href: "/minha-jb/equipamentos" },
  { rotulo: "Assistência", href: "/minha-jb/assistencia" },
  { rotulo: "Orçamentos", href: "/minha-jb/orcamentos" },
  { rotulo: "Favoritos", href: "/minha-jb/favoritos" },
];

export const RODAPE_LOJA: ItemMenu[] = [
  { rotulo: "Todos os produtos", href: "/loja" },
  { rotulo: "Novos", href: "/novos" },
  { rotulo: "Seminovos JB", href: "/seminovos" },
  { rotulo: "Usados", href: "/usados" },
  { rotulo: "Recondicionados", href: "/recondicionados" },
  { rotulo: "Peças e acessórios", href: "/pecas-e-acessorios" },
  { rotulo: "Marcas", href: "/marcas" },
  { rotulo: "Comparar equipamentos", href: "/comparar" },
  { rotulo: "Reparar, seminovo ou novo", href: "/simulador-de-custo" },
];

export const RODAPE_ASSISTENCIA: ItemMenu[] = [
  { rotulo: "Assistência técnica", href: "/assistencia-tecnica" },
  { rotulo: "Solicitar assistência", href: "/assistencia-tecnica/solicitar" },
  { rotulo: "Manutenção preventiva", href: "/manutencao-preventiva" },
  { rotulo: "Planos de manutenção", href: "/planos-de-manutencao" },
  { rotulo: "Serviços", href: "/servicos" },
  { rotulo: "Pedir orçamento", href: "/orcamento" },
];

export const RODAPE_CLIENTE: ItemMenu[] = [
  { rotulo: "Entrar", href: "/entrar" },
  { rotulo: "Criar conta", href: "/cadastro" },
  { rotulo: "Meus pedidos", href: "/minha-jb/pedidos" },
  { rotulo: "Meus equipamentos", href: "/minha-jb/equipamentos" },
  { rotulo: "Assistência", href: "/minha-jb/assistencia" },
  { rotulo: "Favoritos", href: "/minha-jb/favoritos" },
];

export const RODAPE_INSTITUCIONAL: ItemMenu[] = [
  { rotulo: "Central Técnica", href: "/central-tecnica" },
  { rotulo: "Cases técnicos", href: "/cases" },
  { rotulo: "Depoimentos", href: "/depoimentos" },
  { rotulo: "Sobre a JB", href: "/sobre" },
  { rotulo: "Nossa estrutura", href: "/estrutura" },
  { rotulo: "Contato", href: "/contato" },
  { rotulo: "Dúvidas frequentes", href: "/faq" },
];

export const RODAPE_POLITICAS: ItemMenu[] = [
  { rotulo: "Entrega e retirada", href: "/entrega" },
  { rotulo: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
  { rotulo: "Privacidade", href: "/privacidade" },
  { rotulo: "Termos de uso", href: "/termos" },
];

export const MENU_CLIENTE: ItemMenu[] = [
  { rotulo: "Visão geral", href: "/minha-jb" },
  { rotulo: "Pedidos", href: "/minha-jb/pedidos" },
  { rotulo: "Meus equipamentos", href: "/minha-jb/equipamentos" },
  { rotulo: "Assistência", href: "/minha-jb/assistencia" },
  { rotulo: "Manutenções", href: "/minha-jb/manutencoes" },
  { rotulo: "Orçamentos", href: "/minha-jb/orcamentos" },
  { rotulo: "Documentos", href: "/minha-jb/documentos" },
  { rotulo: "Favoritos", href: "/minha-jb/favoritos" },
  { rotulo: "Endereços", href: "/minha-jb/enderecos" },
  { rotulo: "Meus dados", href: "/minha-jb/perfil" },
];

export function rotaAtiva(pathname: string, href: string) {
  const alvo = href.split("#")[0];
  if (alvo === "/") return pathname === "/";
  return pathname === alvo || pathname.startsWith(`${alvo}/`);
}
