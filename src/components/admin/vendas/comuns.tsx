import type {
  ContractStatus,
  CouponKind,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  QuoteStatus,
  ShippingKind,
} from "@prisma/client";

import { CabecalhoBase, GradeDados, ParDados } from "@/components/admin/pagina";
import { Etiqueta, type Tom } from "@/components/ui/data";
import { cn } from "@/lib/utils";

/* ============================================================================
   Vocabulário compartilhado do backoffice comercial

   Rótulo e cor de estado moram aqui porque pedido, pagamento e orçamento
   aparecem em cinco telas diferentes — lista, detalhe, ficha do cliente,
   impressão e painel. Repetir o mapa em cada uma é como acabam surgindo dois
   nomes para o mesmo status.

   Só valores e componentes puros: nada aqui importa banco ou sessão, então o
   arquivo atravessa a fronteira servidor/cliente sem problema.
   ============================================================================ */

/* --------------------------------------------------------------- pedido */

export const TOM_PEDIDO: Record<OrderStatus, Tom> = {
  aguardando_pagamento: "aguardando",
  pagamento_em_analise: "aguardando",
  pago: "ok",
  separacao: "andamento",
  revisao_tecnica: "andamento",
  aguardando_frete: "andamento",
  pronto_retirada: "andamento",
  enviado: "andamento",
  instalacao_agendada: "andamento",
  entregue: "ok",
  concluido: "ok",
  cancelado: "alerta",
  reembolsado: "alerta",
};

/** Pedidos que dependem de alguém da JB mexer para andar. */
export const PEDIDOS_EM_ACAO: OrderStatus[] = [
  "pagamento_em_analise",
  "pago",
  "separacao",
  "revisao_tecnica",
  "aguardando_frete",
  "pronto_retirada",
  "instalacao_agendada",
];

export const ORDEM_STATUS_PEDIDO: OrderStatus[] = [
  "aguardando_pagamento",
  "pagamento_em_analise",
  "pago",
  "separacao",
  "revisao_tecnica",
  "aguardando_frete",
  "pronto_retirada",
  "enviado",
  "instalacao_agendada",
  "entregue",
  "concluido",
  "cancelado",
  "reembolsado",
];

/* ------------------------------------------------------------ pagamento */

export const ROTULO_PAGAMENTO: Record<PaymentStatus, string> = {
  criado: "Criado",
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
  expirado: "Expirado",
  cancelado: "Cancelado",
  estornado: "Estornado",
};

export const TOM_PAGAMENTO: Record<PaymentStatus, Tom> = {
  criado: "neutro",
  pendente: "aguardando",
  em_analise: "aguardando",
  aprovado: "ok",
  recusado: "alerta",
  expirado: "neutro",
  cancelado: "neutro",
  estornado: "alerta",
};

export const ROTULO_METODO: Record<PaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  manual: "Manual (fora do site)",
};

export const ORDEM_STATUS_PAGAMENTO: PaymentStatus[] = [
  "criado",
  "pendente",
  "em_analise",
  "aprovado",
  "recusado",
  "expirado",
  "cancelado",
  "estornado",
];

/** Nome de exibição do provedor, sem inventar marca que não está configurada. */
export function rotuloProvedor(provedor: string) {
  if (provedor === "mock") return "Simulado (teste)";
  if (provedor === "manual") return "Registro manual";
  if (provedor === "mercadopago") return "Mercado Pago";
  return provedor;
}

/* ------------------------------------------------------------ orçamento */

export const TOM_ORCAMENTO: Record<QuoteStatus, Tom> = {
  rascunho: "neutro",
  enviado: "andamento",
  em_duvida: "aguardando",
  aprovado: "ok",
  recusado: "alerta",
  expirado: "neutro",
  convertido: "marca",
};

export const ORDEM_STATUS_ORCAMENTO: QuoteStatus[] = [
  "rascunho",
  "enviado",
  "em_duvida",
  "aprovado",
  "convertido",
  "recusado",
  "expirado",
];

/* --------------------------------------------------------------- outros */

export const ROTULO_FRETE: Record<ShippingKind, string> = {
  retirada: "Retirada na JB",
  entrega_local: "Entrega local",
  transportadora: "Transportadora",
  sob_orcamento: "Sob orçamento",
  gratis: "Frete grátis",
  nao_aplicavel: "Não se aplica",
};

export const ROTULO_CUPOM: Record<CouponKind, string> = {
  percentual: "Percentual",
  valor_fixo: "Valor fixo",
};

export const ROTULO_CONTRATO_CURTO: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
};

export const TOM_CONTRATO: Record<ContractStatus, Tom> = {
  rascunho: "neutro",
  ativo: "ok",
  suspenso: "aguardando",
  encerrado: "neutro",
};

/* ============================================================================
   Peças visuais reaproveitadas
   ============================================================================ */

/** Cabeçalho de página do painel: título, apoio e ações à direita. */
export function CabecalhoPagina({
  titulo,
  apoio,
  acoes,
  className,
}: {
  titulo: React.ReactNode;
  apoio?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
}) {
  // O desenho vem de `admin/pagina.tsx`, o mesmo das áreas técnica e de
  // conteúdo — só a supressão na impressão é daqui, porque estas telas viram
  // folha de pedido e o cabeçalho da tela não entra no papel.
  return (
    <CabecalhoBase
      titulo={titulo}
      descricao={apoio}
      acoes={acoes}
      className={cn("print:hidden", className)}
    />
  );
}

/** Par rótulo/valor da ficha. Sem valor, diz que o dado não foi informado. */
export function Dado({
  rotulo,
  children,
  vazio,
  className,
}: {
  rotulo: string;
  children?: React.ReactNode;
  /** Frase para quando não há valor. O padrão de ParDados é "Não informado". */
  vazio?: string;
  className?: string;
}) {
  return (
    <ParDados rotulo={rotulo} vazio={vazio} className={className}>
      {children}
    </ParDados>
  );
}

/** Grade de `Dado`. Duas colunas a partir de sm, três a partir de lg. */
export function ListaDeDados({
  children,
  colunas = 2,
  className,
}: {
  children: React.ReactNode;
  colunas?: 2 | 3;
  className?: string;
}) {
  return (
    <GradeDados colunas={colunas} className={className}>
      {children}
    </GradeDados>
  );
}

/** Linha de total em bloco de valores. `forte` marca o total final. */
export function LinhaDeTotal({
  rotulo,
  valor,
  forte,
  negativo,
}: {
  rotulo: string;
  valor: string;
  forte?: boolean;
  negativo?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5",
        forte && "mt-1 border-t border-graf-200 pt-3",
      )}
    >
      <span className={cn("text-sm", forte ? "font-bold text-graf-900" : "text-graf-600")}>
        {rotulo}
      </span>
      <span
        className={cn(
          "tabular",
          forte ? "text-lg font-bold text-graf-950" : "text-sm font-semibold text-graf-800",
          negativo && !forte && "text-ok-700",
        )}
      >
        {negativo ? `− ${valor}` : valor}
      </span>
    </div>
  );
}

/** Etiqueta de status de pedido, sempre com o texto junto da cor. */
export function EtiquetaPedido({
  status,
  rotulo,
  ponto,
}: {
  status: OrderStatus;
  rotulo: string;
  ponto?: boolean;
}) {
  return (
    <Etiqueta tom={TOM_PEDIDO[status]} ponto={ponto}>
      {rotulo}
    </Etiqueta>
  );
}
