import { redirect } from "next/navigation";
import type { StaffRole } from "@prisma/client";

import { sessaoStaff, type StaffUser } from "@/lib/auth";

/**
 * Mapa único das áreas do backoffice.
 *
 * Este arquivo é a fonte da verdade de navegação e autorização do /admin:
 * menu lateral, guarda de rota e blocos do painel saem todos daqui. Adicionar
 * uma área é adicionar uma entrada em `AREAS` — nada de espalhar comparação de
 * papel por página.
 *
 * ATENÇÃO — MÓDULO DE SERVIDOR. `exigirArea` depende de `@/lib/auth`, que é
 * `server-only`. Componentes cliente NÃO devem importar este arquivo: o layout
 * do admin já resolve as áreas visíveis no servidor e passa a lista pronta
 * (`ItemMenu[]`, dados serializáveis) para a casca. Se um componente cliente
 * precisar saber de permissão, receba por prop.
 *
 * A camada de área é mais restrita que o objeto `PODE` de `@/lib/auth`: `PODE`
 * responde "pode executar esta capacidade", `AREAS` responde "pode abrir esta
 * tela". Quando os dois discordam, quem manda na navegação é este arquivo.
 */

export type AreaAdmin =
  | "painel"
  | "pedidos"
  | "pagamentos"
  | "clientes"
  | "suporte"
  | "orcamentos"
  | "cupons"
  | "frete"
  | "produtos"
  | "estoque"
  | "assistencia"
  | "os"
  | "agenda"
  | "manutencao"
  | "equipamentos"
  | "tecnicos"
  | "conteudo"
  | "central"
  | "leads"
  | "usuarios"
  | "configuracoes"
  | "mensagens"
  | "auditoria";

/** Agrupamento do menu lateral, na ordem em que aparece. */
export type GrupoAdmin = "geral" | "comercial" | "catalogo" | "assistencia" | "conteudo" | "sistema";

export const ROTULO_GRUPO: Record<GrupoAdmin, string> = {
  geral: "Geral",
  comercial: "Comercial",
  catalogo: "Catálogo",
  assistencia: "Assistência",
  conteudo: "Conteúdo",
  sistema: "Sistema",
};

export const ORDEM_GRUPOS: GrupoAdmin[] = [
  "geral",
  "comercial",
  "catalogo",
  "assistencia",
  "conteudo",
  "sistema",
];

export type DefinicaoArea = {
  rotulo: string;
  href: string;
  /**
   * Nome do ícone no lucide-react. O componente é resolvido pelo mapa fechado
   * `ICONES` de `@/components/admin/menu-admin` — nome novo aqui só desenha no
   * menu depois de ser importado lá; sem isso o item cai no ícone padrão.
   */
  icone: string;
  /** Papéis que abrem a área e podem escrever nela. */
  papeis: StaffRole[];
  /** Papéis que abrem a área apenas para consulta. */
  leitura: StaffRole[];
  grupo: GrupoAdmin;
  descricao: string;
};

const TODOS: StaffRole[] = ["admin", "gestor", "comercial", "tecnico", "editor"];

export const AREAS: Record<AreaAdmin, DefinicaoArea> = {
  painel: {
    rotulo: "Painel",
    href: "/admin",
    icone: "LayoutDashboard",
    papeis: TODOS,
    leitura: [],
    grupo: "geral",
    descricao: "Números do dia e o que precisa de ação agora",
  },

  pedidos: {
    rotulo: "Pedidos",
    href: "/admin/pedidos",
    icone: "ShoppingCart",
    papeis: ["admin", "gestor", "comercial"],
    leitura: [],
    grupo: "comercial",
    descricao: "Vendas da loja, pagamento, separação e entrega",
  },
  pagamentos: {
    rotulo: "Pagamentos",
    href: "/admin/pagamentos",
    icone: "CreditCard",
    papeis: ["admin", "gestor", "comercial"],
    leitura: [],
    grupo: "comercial",
    descricao: "Cobranças de cada pedido: Pix, cartão, aprovação e estorno",
  },
  clientes: {
    rotulo: "Clientes",
    href: "/admin/clientes",
    icone: "Users",
    papeis: ["admin", "gestor", "comercial"],
    leitura: [],
    grupo: "comercial",
    descricao: "Cadastro, endereços, histórico de compras e chamados",
  },
  suporte: {
    rotulo: "Suporte",
    href: "/admin/suporte",
    icone: "LifeBuoy",
    papeis: ["admin", "gestor", "comercial"],
    leitura: [],
    grupo: "comercial",
    descricao: "Tickets de atendimento abertos pelo cliente e as respostas da equipe",
  },
  orcamentos: {
    rotulo: "Orçamentos",
    href: "/admin/orcamentos",
    icone: "FileText",
    papeis: ["admin", "gestor", "comercial"],
    leitura: [],
    grupo: "comercial",
    descricao: "Propostas comerciais e de assistência, com aprovação do cliente",
  },
  cupons: {
    rotulo: "Cupons",
    href: "/admin/cupons",
    icone: "TicketPercent",
    papeis: ["admin", "gestor", "comercial"],
    leitura: [],
    grupo: "comercial",
    descricao: "Códigos de desconto do carrinho, validade e limite de uso",
  },
  // Frete fica no grupo Comercial, e não em Sistema, porque quem responde pelo
  // prazo e pelo valor da entrega é quem vende. As chaves de provedor e os
  // dados fiscais continuam em Configurações, restritos ao administrador.
  frete: {
    rotulo: "Frete",
    href: "/admin/frete",
    icone: "Truck",
    papeis: ["admin", "gestor", "comercial"],
    leitura: [],
    grupo: "comercial",
    descricao: "Perfis de entrega, faixas de CEP, prazo e valor",
  },

  produtos: {
    rotulo: "Produtos",
    href: "/admin/produtos",
    icone: "Package",
    papeis: ["admin", "gestor"],
    leitura: ["comercial"],
    grupo: "catalogo",
    descricao: "Catálogo, preços, fotos e ficha técnica",
  },
  estoque: {
    rotulo: "Estoque",
    href: "/admin/estoque",
    icone: "Boxes",
    papeis: ["admin", "gestor"],
    leitura: [],
    grupo: "catalogo",
    descricao: "Unidades, entradas, saídas e alerta de estoque baixo",
  },

  assistencia: {
    rotulo: "Chamados",
    href: "/admin/assistencia",
    icone: "Stethoscope",
    papeis: ["admin", "gestor", "tecnico"],
    leitura: [],
    grupo: "assistencia",
    descricao: "Solicitações de assistência técnica, da triagem à conclusão",
  },
  os: {
    rotulo: "Ordens de serviço",
    href: "/admin/os",
    icone: "ClipboardList",
    papeis: ["admin", "gestor", "tecnico"],
    leitura: [],
    grupo: "assistencia",
    descricao: "Execução em campo: diagnóstico, peças, mão de obra e laudo",
  },
  agenda: {
    rotulo: "Agenda",
    href: "/admin/agenda",
    icone: "CalendarDays",
    papeis: ["admin", "gestor", "tecnico"],
    leitura: [],
    grupo: "assistencia",
    descricao: "Visitas, preventivas e instalações no mesmo calendário",
  },
  manutencao: {
    rotulo: "Manutenção",
    href: "/admin/manutencao",
    icone: "CalendarClock",
    papeis: ["admin", "gestor", "tecnico"],
    leitura: [],
    grupo: "assistencia",
    descricao: "Contratos preventivos e agenda de visitas",
  },
  equipamentos: {
    rotulo: "Equipamentos",
    href: "/admin/equipamentos",
    icone: "MonitorCog",
    papeis: ["admin", "gestor", "tecnico"],
    leitura: [],
    grupo: "assistencia",
    descricao: "Parque instalado dos clientes, garantia e histórico",
  },
  // Cadastro de equipe, não de trabalho: define quem atende em campo, com quais
  // especialidades e em que cor aparece na agenda. Por isso o próprio técnico
  // NÃO entra — quem escala a equipe é administrador ou gestor.
  tecnicos: {
    rotulo: "Técnicos",
    href: "/admin/tecnicos",
    icone: "HardHat",
    papeis: ["admin", "gestor"],
    leitura: [],
    grupo: "assistencia",
    descricao: "Equipe de campo: especialidades, cor na agenda e carga de trabalho",
  },

  conteudo: {
    rotulo: "Conteúdo",
    href: "/admin/conteudo",
    icone: "Newspaper",
    papeis: ["admin", "gestor", "editor"],
    leitura: [],
    grupo: "conteudo",
    descricao: "Páginas, banners, seções da home e perguntas frequentes",
  },
  central: {
    rotulo: "Central Técnica",
    href: "/admin/central-tecnica",
    icone: "BookOpen",
    papeis: ["admin", "gestor", "editor"],
    leitura: ["tecnico"],
    grupo: "conteudo",
    descricao: "Artigos técnicos: rascunho, revisão, publicação e arquivo",
  },
  leads: {
    rotulo: "Leads",
    href: "/admin/leads",
    icone: "Inbox",
    papeis: ["admin", "gestor", "editor"],
    leitura: ["comercial"],
    grupo: "conteudo",
    descricao: "Contatos vindos dos formulários do site",
  },

  usuarios: {
    rotulo: "Usuários",
    href: "/admin/usuarios",
    icone: "UserCog",
    papeis: ["admin"],
    leitura: [],
    grupo: "sistema",
    descricao: "Equipe interna, papéis e acesso ao painel",
  },
  configuracoes: {
    rotulo: "Configurações",
    href: "/admin/configuracoes",
    icone: "Settings",
    papeis: ["admin"],
    leitura: [],
    grupo: "sistema",
    descricao: "Dados da empresa, contato, frete, pagamento e SEO",
  },
  // Fila de saída. Fica em Sistema e não em Conteúdo porque o que se decide
  // aqui é infraestrutura de envio — reprocessar lote, reenviar linha travada
  // —, não o texto que o cliente lê.
  mensagens: {
    rotulo: "Mensagens",
    href: "/admin/mensagens",
    icone: "Send",
    papeis: ["admin", "gestor"],
    leitura: [],
    grupo: "sistema",
    descricao: "Fila de e-mails: o que saiu, o que falhou e o que ainda vai sair",
  },
  auditoria: {
    rotulo: "Auditoria",
    href: "/admin/auditoria",
    icone: "ScrollText",
    papeis: ["admin", "gestor"],
    leitura: [],
    grupo: "sistema",
    descricao: "Quem alterou o quê, e quando",
  },
};

export const ROTULO_PAPEL: Record<StaffRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  comercial: "Comercial",
  tecnico: "Técnico",
  editor: "Editor",
};

export const DESCRICAO_PAPEL: Record<StaffRole, string> = {
  admin: "Acesso total, incluindo equipe e configurações",
  gestor: "Operação inteira, sem mexer em equipe e configurações",
  comercial:
    "Pedidos, pagamentos, clientes, suporte, orçamentos, cupons e frete; catálogo só para consulta",
  tecnico: "Chamados, ordens de serviço, agenda, manutenção e equipamentos",
  editor: "Conteúdo do site e leads",
};

/* ------------------------------------------------------------------ leitura */

/** A área aparece no menu e a página pode ser aberta. */
export function podeVer(user: StaffUser | null, area: AreaAdmin): boolean {
  if (!user) return false;
  const definicao = AREAS[area];
  return definicao.papeis.includes(user.role) || definicao.leitura.includes(user.role);
}

/** A área aceita escrita — criar, editar, mudar status, excluir. */
export function podeEditar(user: StaffUser | null, area: AreaAdmin): boolean {
  if (!user) return false;
  return AREAS[area].papeis.includes(user.role);
}

/** Abre a área, mas só para consulta. Use para esconder botões de ação. */
export function somenteLeitura(user: StaffUser | null, area: AreaAdmin): boolean {
  return podeVer(user, area) && !podeEditar(user, area);
}

export function areasVisiveis(user: StaffUser | null): AreaAdmin[] {
  const chaves = Object.keys(AREAS) as AreaAdmin[];
  return chaves.filter((area) => podeVer(user, area));
}

/** Item já resolvido para o menu — dados puros, atravessa a fronteira cliente. */
export type ItemMenu = {
  area: AreaAdmin;
  rotulo: string;
  href: string;
  icone: string;
  descricao: string;
  somenteLeitura: boolean;
};

export type GrupoMenu = {
  grupo: GrupoAdmin;
  rotulo: string;
  itens: ItemMenu[];
};

/**
 * Menu lateral do usuário, agrupado e sem grupo vazio. É o que o layout do
 * admin entrega para a casca — por isso só carrega valores serializáveis.
 */
export function menuDoUsuario(user: StaffUser | null): GrupoMenu[] {
  const visiveis = areasVisiveis(user);

  return ORDEM_GRUPOS.map((grupo) => ({
    grupo,
    rotulo: ROTULO_GRUPO[grupo],
    itens: visiveis
      .filter((area) => AREAS[area].grupo === grupo)
      .map((area) => ({
        area,
        rotulo: AREAS[area].rotulo,
        href: AREAS[area].href,
        icone: AREAS[area].icone,
        descricao: AREAS[area].descricao,
        somenteLeitura: somenteLeitura(user, area),
      })),
  })).filter((g) => g.itens.length > 0);
}

/* ------------------------------------------------------------------ guardas */

/**
 * Sessão obrigatória no backoffice.
 *
 * Faz o mesmo que `exigirStaff()` de `@/lib/auth` — os dois mandam para
 * `/admin/entrar`. Existe aqui para que as guardas de área tenham um único
 * ponto de entrada e o destino do redirecionamento fique ao lado das regras
 * que decidem quem entra.
 */
export async function exigirStaffAdmin(): Promise<StaffUser> {
  const user = await sessaoStaff();
  if (!user) redirect("/admin/entrar");
  return user;
}

/**
 * Guarda de página. Toda página dentro de /admin (menos /admin/entrar) começa
 * com isto — a autorização é do servidor, esconder o link do menu não basta.
 *
 *   export default async function Pagina() {
 *     const usuario = await exigirArea("pedidos");
 *     ...
 *   }
 */
export async function exigirArea(area: AreaAdmin): Promise<StaffUser> {
  const user = await exigirStaffAdmin();
  if (!podeVer(user, area)) redirect(`/admin?erro=permissao&area=${area}`);
  return user;
}

/** Guarda de escrita — para server actions e páginas de edição. */
export async function exigirEdicao(area: AreaAdmin): Promise<StaffUser> {
  const user = await exigirStaffAdmin();
  if (!podeEditar(user, area)) redirect(`/admin?erro=permissao&area=${area}`);
  return user;
}
