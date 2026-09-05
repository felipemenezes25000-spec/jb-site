/** Navegação principal da loja. Um só lugar para cabeçalho, rodapé e menu mobile. */

export type ItemMenu = {
  rotulo: string;
  href: string;
  descricao?: string;
  /** abre o mega menu do catálogo em vez de navegar direto */
  megaMenu?: "catalogo" | "assistencia";
};

export const MENU_PRINCIPAL: ItemMenu[] = [
  { rotulo: "Equipamentos", href: "/loja", megaMenu: "catalogo" },
  { rotulo: "Seminovos", href: "/seminovos", descricao: "Revisados pela JB" },
  { rotulo: "Peças e acessórios", href: "/pecas-e-acessorios" },
  {
    rotulo: "Assistência técnica",
    href: "/assistencia-tecnica",
    megaMenu: "assistencia",
  },
  { rotulo: "Manutenção", href: "/manutencao-preventiva" },
  { rotulo: "Sobre a JB", href: "/sobre" },
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

export const RODAPE_INSTITUCIONAL: ItemMenu[] = [
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
