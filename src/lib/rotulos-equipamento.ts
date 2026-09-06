import type { DocumentKind, EquipmentOrigin, EquipmentStatus } from "@prisma/client";

/* ============================================================================
   Como o domínio de equipamento se chama na tela

   Separado de `@/lib/equipamento` por um motivo prático: aquele módulo é
   `server-only` — ele fala com o Prisma — e estes rótulos precisam existir
   também no navegador. A demonstração pública do prontuário é componente de
   cliente, e importar os rótulos de lá arrastava o Prisma inteiro para o
   bundle, quebrando a compilação.

   Aqui não há nada além de tradução: enum do banco para palavra que a pessoa
   lê. Puro, sem dependência, usável dos dois lados.
   ============================================================================ */

export const ROTULO_EQUIPAMENTO: Record<EquipmentStatus, string> = {
  operacional: "Operacional",
  em_manutencao: "Em manutenção",
  aguardando_peca: "Aguardando peça",
  inoperante: "Parado",
  desativado: "Desativado",
};

export const ROTULO_ORIGEM: Record<EquipmentOrigin, string> = {
  compra_jb: "Comprado na JB",
  cadastro_cliente: "Cadastrado pelo cliente",
  cadastro_tecnico: "Cadastrado pelo técnico",
  atendimento: "Registrado em atendimento",
};

export const ROTULO_DOCUMENTO: Record<DocumentKind, string> = {
  nota_fiscal: "Nota fiscal",
  pedido: "Pedido",
  orcamento: "Orçamento",
  ordem_servico: "Ordem de serviço",
  laudo: "Laudo técnico",
  certificado: "Certificado",
  manual: "Manual",
  garantia: "Garantia",
  contrato: "Contrato",
  outro: "Documento",
};
