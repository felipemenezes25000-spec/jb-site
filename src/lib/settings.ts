import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Tudo que a JB precisa poder mudar sem tocar em código.
 * Os valores de contato vieram do site anterior e são reais — nada inventado.
 */
export const SETTING_DEFAULTS = {
  // identidade
  empresa_nome: "JB Soluções Odontológicas",
  empresa_desde: "2011",
  empresa_resumo:
    "Assistência técnica e equipamentos para consultórios odontológicos em São Paulo.",

  // contato
  telefone: "(11) 3715-6362",
  telefone_alternativo: "(11) 95847-7337",
  whatsapp: "(11) 96341-7994",
  email: "comercial@jbsolucoesodontologicas.com.br",
  horario: "Segunda a sexta, das 8h às 18h30",

  // endereço
  endereco_logradouro: "Rua Domingos de Braga, 200, CJ 153, Bloco 3",
  endereco_bairro: "Vila dos Remédios",
  endereco_cidade: "São Paulo",
  endereco_uf: "SP",
  endereco_cep: "",
  maps_embed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3658.4334443119396!2d-46.75288228555479!3d-23.5169078658361!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ceff2c78de29fb%3A0x12b44e5d8a85fedd!2sR.+Domingos+de+Braga%2C+200+-+Vila+dos+Remedios%2C+S%C3%A3o+Paulo+-+SP!5e0!3m2!1spt-BR!2sbr!4v1467124472333",

  // retirada
  retirada_disponivel: "sim",
  retirada_instrucoes: "Retirada no endereço da JB, em horário comercial, mediante agendamento.",

  // loja
  parcelas_max: "12",
  parcela_minima: "50,00",
  pedido_email_copia: "",

  // redes
  facebook: "https://www.facebook.com/jbsolucoesodontologicas/",
  instagram: "",
  linkedin: "",
  youtube: "",

  // avaliacoes
  avaliacoes_envio: "nao",

  // devolução — vazio significa "política ainda não definida", e nesse caso
  // nada de devolução é publicado. Prazo inventado em dado estruturado é
  // promessa que a JB teria de cumprir.
  devolucao_prazo_dias: "",
  devolucao_metodo: "",
  devolucao_frete: "",

  // seo
  area_atendimento: "",
  seo_titulo: "JB Soluções Odontológicas — equipamentos e assistência técnica",
  seo_descricao:
    "Equipamentos odontológicos novos e seminovos revisados, com instalação, manutenção preventiva e assistência técnica especializada em São Paulo.",

  // integrações
  codigo_analytics: "",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingsMap = Record<SettingKey, string>;

export const SETTING_FIELDS: {
  key: SettingKey;
  label: string;
  group:
    | "identidade"
    | "contato"
    | "endereco"
    | "loja"
    | "avaliacoes"
    | "devolucao"
    | "social"
    | "seo"
    | "integracoes";
  type: "text" | "textarea" | "url" | "email" | "tel" | "boolean" | "select";
  hint?: string;
  /** Só para `select`. A primeira opção é sempre a ausência de escolha. */
  options?: { value: string; label: string }[];
}[] = [
  { key: "empresa_nome", label: "Nome exibido", group: "identidade", type: "text" },
  { key: "empresa_desde", label: "Em atividade desde", group: "identidade", type: "text" },
  {
    key: "empresa_resumo",
    label: "Resumo institucional",
    group: "identidade",
    type: "textarea",
    hint: "Uma frase. Aparece no rodapé e em compartilhamentos.",
  },

  { key: "telefone", label: "Telefone principal", group: "contato", type: "tel" },
  { key: "telefone_alternativo", label: "Telefone alternativo", group: "contato", type: "tel" },
  {
    key: "whatsapp",
    label: "WhatsApp",
    group: "contato",
    type: "tel",
    hint: "Deixe vazio para esconder o botão de WhatsApp do site.",
  },
  { key: "email", label: "E-mail comercial", group: "contato", type: "email" },
  { key: "horario", label: "Horário de atendimento", group: "contato", type: "text" },

  { key: "endereco_logradouro", label: "Logradouro", group: "endereco", type: "text" },
  { key: "endereco_bairro", label: "Bairro", group: "endereco", type: "text" },
  { key: "endereco_cidade", label: "Cidade", group: "endereco", type: "text" },
  { key: "endereco_uf", label: "UF", group: "endereco", type: "text" },
  { key: "endereco_cep", label: "CEP", group: "endereco", type: "text" },
  {
    key: "maps_embed",
    label: "Mapa (endereço do embed)",
    group: "endereco",
    type: "textarea",
    hint: "No Google Maps: Compartilhar › Incorporar › copie apenas o endereço do src.",
  },

  {
    key: "retirada_disponivel",
    label: "Aceita retirada no local",
    group: "loja",
    type: "boolean",
  },
  { key: "retirada_instrucoes", label: "Instruções de retirada", group: "loja", type: "textarea" },
  {
    key: "parcelas_max",
    label: "Máximo de parcelas",
    group: "loja",
    type: "text",
    hint: "Usado apenas para exibir a simulação na vitrine.",
  },
  { key: "parcela_minima", label: "Valor mínimo da parcela", group: "loja", type: "text" },
  {
    key: "pedido_email_copia",
    label: "Copiar pedidos para",
    group: "loja",
    type: "email",
    hint: "E-mail interno que recebe cópia de cada pedido. Opcional.",
  },

  {
    key: "avaliacoes_envio",
    label: "Enviar convites de avaliacao",
    group: "avaliacoes",
    type: "boolean",
    hint:
      "Desligado, os convites continuam sendo montados em rascunho e NINGUEM recebe e-mail. "
      + "Ligue quando a JB quiser comecar a pedir avaliacao.",
  },

  {
    key: "devolucao_prazo_dias",
    label: "Prazo de devolução (dias)",
    group: "devolucao",
    type: "text",
    hint:
      "Dias corridos a partir do recebimento. Vazio: nenhuma política de devolução é " +
      "publicada no site nem enviada ao Google.",
  },
  {
    key: "devolucao_metodo",
    label: "Como o cliente devolve",
    group: "devolucao",
    type: "select",
    options: [
      { value: "", label: "Não definido" },
      { value: "transporte", label: "Envia de volta por transportadora ou correio" },
      { value: "no_local", label: "Devolve no endereço da JB" },
    ],
  },
  {
    key: "devolucao_frete",
    label: "Quem paga o retorno",
    group: "devolucao",
    type: "select",
    options: [
      { value: "", label: "Não definido" },
      { value: "jb", label: "A JB paga" },
      { value: "cliente", label: "O cliente paga" },
    ],
  },

  { key: "facebook", label: "Facebook", group: "social", type: "url" },
  { key: "instagram", label: "Instagram", group: "social", type: "url" },
  { key: "linkedin", label: "LinkedIn", group: "social", type: "url" },
  { key: "youtube", label: "YouTube", group: "social", type: "url" },

  {
    key: "area_atendimento",
    label: "Área de atendimento",
    group: "seo",
    type: "text",
    hint:
      "Onde a JB atende de verdade. Ex.: \"São Paulo e Grande São Paulo\". Vai para o " +
      "schema de negócio local — não liste cidade onde não há cobertura.",
  },
  { key: "seo_titulo", label: "Título padrão", group: "seo", type: "text" },
  { key: "seo_descricao", label: "Descrição padrão", group: "seo", type: "textarea" },

  {
    key: "codigo_analytics",
    label: "Google Analytics (ID de medição)",
    group: "integracoes",
    type: "text",
    hint: "Ex.: G-XXXXXXXXXX. Vazio desliga o analytics.",
  },
];

export const getSettings = cache(async (): Promise<SettingsMap> => {
  const linhas = await prisma.setting.findMany();
  const mapa = { ...SETTING_DEFAULTS } as SettingsMap;
  for (const linha of linhas) {
    if (linha.key in mapa && linha.value.trim() !== "") {
      mapa[linha.key as SettingKey] = linha.value;
    }
  }
  return mapa;
});

export function enderecoCompleto(s: SettingsMap) {
  const cidade = [s.endereco_cidade, s.endereco_uf].filter(Boolean).join("/");
  return [s.endereco_logradouro, s.endereco_bairro, cidade].filter(Boolean).join(" — ");
}

export function redesSociais(s: SettingsMap) {
  return (
    [
      { chave: "facebook", rotulo: "Facebook", href: s.facebook },
      { chave: "instagram", rotulo: "Instagram", href: s.instagram },
      { chave: "linkedin", rotulo: "LinkedIn", href: s.linkedin },
      { chave: "youtube", rotulo: "YouTube", href: s.youtube },
    ] as const
  ).filter((r) => r.href.trim() !== "");
}

export function ligado(valor: string) {
  return ["sim", "true", "1", "on"].includes(valor.trim().toLowerCase());
}
