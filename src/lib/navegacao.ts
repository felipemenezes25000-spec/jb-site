/**
 * Navegação da loja — um só lugar para cabeçalho, rodapé e gaveta do celular.
 *
 * Só rota que existe entra aqui: `RODAPE_LOJA`, `RODAPE_ASSISTENCIA`,
 * `RODAPE_INSTITUCIONAL` e `RODAPE_POLITICAS` também alimentam o sitemap,
 * então um item a mais nessas listas é uma URL a mais anunciada ao Google.
 */

/** Painéis grandes que o cabeçalho sabe abrir. */
export type ChaveMega = "catalogo" | "assistencia";

export type ItemMenu = {
  rotulo: string;
  href: string;
  /** Linha de apoio — aparece no mega menu e na gaveta do celular. */
  descricao?: string;
  /** Abre o painel do cabeçalho em vez de só navegar. */
  megaMenu?: ChaveMega;
};

/**
 * As descrições descrevem o destino, não prometem nada sobre o produto:
 * quem escreve prazo, garantia ou revisão é a página, com dado do banco.
 */
export const MENU_PRINCIPAL: ItemMenu[] = [
  {
    rotulo: "Equipamentos",
    href: "/loja",
    descricao: "Catálogo completo por categoria e condição",
    megaMenu: "catalogo",
  },
  {
    rotulo: "Seminovos",
    href: "/seminovos",
    descricao: "Equipamentos seminovos disponíveis",
  },
  {
    rotulo: "Peças e acessórios",
    href: "/pecas-e-acessorios",
    descricao: "Peças de reposição e acessórios",
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
    rotulo: "Sobre a JB",
    href: "/sobre",
    descricao: "Quem somos e como trabalhamos",
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
    descricao: "Evite a parada antes que ela aconteça",
  },
  {
    rotulo: "Planos de manutenção",
    href: "/planos-de-manutencao",
    descricao: "Cobertura contínua para a clínica",
  },
];

/**
 * Atalhos da área da clínica na gaveta do celular. Rótulos curtos de
 * propósito: entram numa grade de duas colunas, e nome que quebra em duas
 * linhas estraga a leitura de um menu.
 */
export const ATALHOS_CLIENTE: ItemMenu[] = [
  { rotulo: "Pedidos", href: "/minha-jb/pedidos" },
  { rotulo: "Equipamentos", href: "/minha-jb/equipamentos" },
  { rotulo: "Assistência", href: "/minha-jb/assistencia" },
  { rotulo: "Orçamentos", href: "/minha-jb/orcamentos" },
  { rotulo: "Favoritos", href: "/minha-jb/favoritos" },
];

export const RODAPE_LOJA: ItemMenu[] = [
  { rotulo: "Todos os equipamentos", href: "/loja" },
  { rotulo: "Novos", href: "/novos" },
  { rotulo: "Seminovos JB", href: "/seminovos" },
  { rotulo: "Usados", href: "/usados" },
  { rotulo: "Recondicionados", href: "/recondicionados" },
  { rotulo: "Peças e acessórios", href: "/pecas-e-acessorios" },
  { rotulo: "Marcas", href: "/marcas" },
];

export const RODAPE_ASSISTENCIA: ItemMenu[] = [
  { rotulo: "Assistência técnica", href: "/assistencia-tecnica" },
  { rotulo: "Solicitar assistência", href: "/assistencia-tecnica/solicitar" },
  { rotulo: "Manutenção preventiva", href: "/manutencao-preventiva" },
  { rotulo: "Planos de manutenção", href: "/planos-de-manutencao" },
  { rotulo: "Serviços", href: "/servicos" },
  { rotulo: "Pedir orçamento", href: "/orcamento" },
];

/**
 * Coluna da área da clínica no rodapé. Fora do sitemap de propósito: são
 * páginas de sessão, que só fazem sentido para quem já é cliente.
 */
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

/**
 * Um item está ativo na rota exata ou em qualquer rota abaixo dela.
 * `startsWith` cru marcaria `/seminovos` dentro de `/seminovos-x`.
 */
export function rotaAtiva(pathname: string, href: string) {
  const alvo = href.split("#")[0];
  if (alvo === "/") return pathname === "/";
  return pathname === alvo || pathname.startsWith(`${alvo}/`);
}
