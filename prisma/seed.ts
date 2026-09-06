/**
 * Carga base da plataforma.
 *
 * Só conteúdo real. As configurações (contato, endereço, redes) vêm do site
 * anterior, em prisma/conteudo-legado.json, extraído do MySQL do backup. Já o
 * texto institucional de Sobre e Estrutura vem de
 * scripts/conteudo-institucional.ts — a mesma fonte da migração, para que um
 * ambiente novo nasça com o texto certo em vez de com o legado do PHP.
 * Nada de preço, prazo, garantia ou depoimento inventado.
 *
 * Dados de demonstração ficam em prisma/seed-demo.ts, separados de propósito.
 *
 *   pnpm db:seed
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

import { hashDeCorpo } from "../src/lib/conteudo/migracao";
import { SETTING_DEFAULTS, SETTING_FIELDS, type SettingKey } from "../src/lib/settings";
import { CONTEUDO_CATEGORIAS } from "../scripts/conteudo-categorias";
import { CONTEUDO_INSTITUCIONAL } from "../scripts/conteudo-institucional";

const prisma = new PrismaClient();

type Legado = {
  institucional: { id: number; pagina: string; texto: string; video: string; imgs: string[] }[];
  seo: { id: number; titulo: string; descricao: string; pagina: string }[];
  servicos: { id: number; nome: string; descricao: string; ordem: number; publicado: boolean }[];
  configuracoes: { campo: string; valor: string }[];
};

const arquivoLegado = path.join(__dirname, "conteudo-legado.json");
const legado: Legado | null = fs.existsSync(arquivoLegado)
  ? JSON.parse(fs.readFileSync(arquivoLegado, "utf8"))
  : null;

/**
 * As frentes de equipamento que a JB atende. Vieram da tabela `mp5600_servicos`
 * do site antigo e a migração as copia para Category. Num banco novo (preview,
 * um ambiente recém-criado) não há o que copiar, então o seed as cria aqui.
 */
/**
 * Descrição pública de cada frente, pela mesma fonte que a migração usa.
 *
 * Sem isto, as categorias nasciam com `description` vazia — e aí a migração
 * não as corrigia: sem `systemHash` em `Category`, a trava dela é o hash do
 * texto legado, e vazio não é o legado. Ela reportava "alguém editou" para
 * uma linha que ninguém tinha tocado, e a faixa "O que a JB vende e atende"
 * ficava sem texto para sempre num ambiente novo.
 *
 * `pecas-e-acessorios` não está na lista da migração — ela não veio do site
 * em PHP. Nasce sem descrição, e quem escreve a dela é o painel: inventar
 * aqui um texto comercial seria exatamente o que o escopo proíbe.
 */
const DESCRICAO_DA_CATEGORIA = new Map(
  CONTEUDO_CATEGORIAS.map((c) => [c.slug, c.description] as const),
);

const CATEGORIAS = [
  { slug: "bioseguranca", name: "Biossegurança", icon: "ShieldCheck", order: 1 },
  { slug: "profilaxia", name: "Profilaxia", icon: "Sparkles", order: 2 },
  { slug: "cirurgia", name: "Cirurgia", icon: "Stethoscope", order: 3 },
  { slug: "estetica", name: "Estética", icon: "Lightbulb", order: 4 },
  { slug: "outros-perifericos", name: "Outros periféricos", icon: "Settings", order: 5 },
  {
    slug: "unidade-basica-de-tratamento",
    name: "Unidade básica de tratamento",
    icon: "Armchair",
    order: 6,
  },
  { slug: "pecas-e-acessorios", name: "Peças e acessórios", icon: "Boxes", order: 7 },
];

async function main() {
  /* ------------------------------------------------------- configurações */
  console.log("→ configurações");
  const conf = new Map((legado?.configuracoes ?? []).map((c) => [c.campo, c.valor]));
  const institucional = new Map((legado?.institucional ?? []).map((i) => [i.id, i]));

  const doLegado: Partial<Record<SettingKey, string>> = {
    // o rodapé antigo trazia os dois telefones em um campo só
    telefone: conf.get("telefone_rodape")?.split("|")[0]?.trim() ?? "",
    email: institucional.get(3)?.texto.trim() ?? "",
    facebook: conf.get("fanpage_link") ?? "",
    instagram: conf.get("instagram_link") ?? "",
    linkedin: conf.get("linkedin_link") ?? "",
    youtube: conf.get("youtube_link") ?? "",
    codigo_analytics: conf.get("codigo_analytics") ?? "",
  };

  for (const [ordem, campo] of SETTING_FIELDS.entries()) {
    const valor = doLegado[campo.key]?.trim() || SETTING_DEFAULTS[campo.key];
    const atual = await prisma.setting.findUnique({ where: { key: campo.key } });
    const meta = {
      label: campo.label,
      group: campo.group,
      type: campo.type,
      hint: campo.hint ?? null,
      order: ordem,
    };
    await prisma.setting.upsert({
      where: { key: campo.key },
      // preenche o que está em branco, nunca sobrescreve o que já foi editado
      update: atual && atual.value.trim() === "" ? { ...meta, value: valor } : meta,
      create: { key: campo.key, ...meta, value: valor },
    });
  }

  /* ------------------------------------------------------------ páginas */
  console.log("→ páginas institucionais");
  const paginas = [
    {
      slug: "privacidade",
      title: "Política de privacidade",
      lead: "Como a JB trata os dados de quem usa o site.",
      body: "",
      seoTitle: "Política de privacidade",
      seoDescription: "Como a JB Soluções Odontológicas coleta, usa e protege dados pessoais.",
    },
    {
      slug: "termos",
      title: "Termos de uso",
      lead: "As regras de uso do site e da loja da JB.",
      body: "",
      seoTitle: "Termos de uso",
      seoDescription: "Termos e condições de uso do site da JB Soluções Odontológicas.",
    },
    {
      slug: "entrega",
      title: "Entrega e retirada",
      lead: "Como o equipamento chega até a sua clínica.",
      body: "",
      seoTitle: "Entrega e retirada",
      seoDescription: "Prazos, formas de entrega e retirada dos equipamentos vendidos pela JB.",
    },
    {
      slug: "trocas-e-devolucoes",
      title: "Trocas e devoluções",
      lead: "Prazos e condições para troca ou devolução.",
      body: "",
      seoTitle: "Trocas e devoluções",
      seoDescription: "Política de trocas e devoluções da JB Soluções Odontológicas.",
    },
  ];

  for (const pagina of paginas) {
    await prisma.page.upsert({
      where: { slug: pagina.slug },
      update: {
        // conteúdo já editado no painel não é sobrescrito
        title: pagina.title,
        seoTitle: pagina.seoTitle,
        seoDescription: pagina.seoDescription,
      },
      create: { ...pagina, editable: true },
    });
  }

  /*
   * Sobre e Estrutura não nascem mais com o texto do site em PHP.
   *
   * Até aqui elas eram criadas com `institucional.get(4|5).texto` — o corpo
   * legado, com erro de grafia, missão/visão/valores e superlativo sem prova.
   * Um ambiente novo nascia errado e só ficava certo se alguém lembrasse de
   * rodar `pnpm conteudo:migrar` depois. Instalação correta não pode depender
   * de memória de operador.
   *
   * A fonte agora é a mesma da migração (`scripts/conteudo-institucional.ts`),
   * uma só, para as duas não divergirem. O legado continua em
   * `prisma/conteudo-legado.json` e em `PageRevision` — como histórico, que é
   * o lugar dele, e não como padrão de instalação.
   *
   * `systemHash` é gravado na criação para fechar o ciclo com
   * `decidirMigracao`: a página nasce marcada como escrita por migração e com
   * o hash do corpo que ela tem. A execução seguinte de `conteudo:migrar` lê
   * "em-dia" e não escreve nada — sem segunda revisão, sem `updatedAt` novo.
   *
   * O `update` não reafirma nada de propósito. Estas duas páginas têm dono: a
   * migração institucional e o painel. Se o seed reescrevesse título ou SEO
   * aqui, `db:seed` desfaria em silêncio o que uma pessoa editou — exatamente
   * o que `src/lib/conteudo/migracao.ts` existe para impedir.
   */
  for (const conteudo of CONTEUDO_INSTITUCIONAL) {
    await prisma.page.upsert({
      where: { slug: conteudo.slug },
      update: {},
      create: {
        slug: conteudo.slug,
        title: conteudo.title,
        eyebrow: conteudo.eyebrow,
        lead: conteudo.lead,
        body: conteudo.body,
        seoTitle: conteudo.seoTitle,
        seoDescription: conteudo.seoDescription,
        systemHash: hashDeCorpo(conteudo.body),
        editable: true,
      },
    });
  }

  /* --------------------------------------------------------- categorias */
  console.log("→ categorias");
  for (const categoria of CATEGORIAS) {
    await prisma.category.upsert({
      where: { slug: categoria.slug },
      // o nome e a descrição podem ter sido ajustados no painel; só o ícone
      // e a ordem são reafirmados
      update: { icon: categoria.icon, order: categoria.order },
      create: {
        ...categoria,
        description: DESCRICAO_DA_CATEGORIA.get(categoria.slug) ?? "",
        published: true,
        featured: true,
      },
    });
  }
  console.log(`   ${await prisma.category.count()} categorias no catálogo`);

  /* ----------------------------------------------------------- serviços */
  console.log("→ serviços vendáveis");
  const servicos = [
    {
      slug: "instalacao-jb",
      name: "Instalação JB",
      kind: "instalacao" as const,
      description:
        "Instalação do equipamento por técnico da JB, com teste de funcionamento e orientação de uso.",
      order: 1,
    },
    {
      slug: "visita-tecnica",
      name: "Visita técnica",
      kind: "visita_tecnica" as const,
      description: "Deslocamento e avaliação técnica no local.",
      order: 2,
    },
    {
      slug: "manutencao-preventiva",
      name: "Manutenção preventiva",
      kind: "manutencao_preventiva" as const,
      description: "Revisão programada para evitar a parada do equipamento.",
      order: 3,
    },
    {
      slug: "retirada-equipamento-anterior",
      name: "Retirada do equipamento anterior",
      kind: "retirada_equipamento" as const,
      description:
        "Retirada do equipamento antigo no momento da instalação. Solicitação operacional — não implica compra do usado pela JB.",
      order: 4,
    },
    {
      slug: "orientacao-de-uso",
      name: "Orientação de uso",
      kind: "treinamento" as const,
      description: "Orientação à equipe da clínica sobre operação e cuidados do equipamento.",
      order: 5,
    },
  ];

  for (const servico of servicos) {
    await prisma.service.upsert({
      where: { slug: servico.slug },
      update: { name: servico.name, description: servico.description, order: servico.order },
      // preço fica nulo: "sob orçamento" até a JB definir no painel
      create: { ...servico, priceCents: null, published: true },
    });
  }

  /* ---------------------------------------------------------- logística */
  console.log("→ perfis de frete");
  const perfis = [
    {
      name: "Equipamento de grande porte",
      kind: "sob_orcamento" as const,
      description: "Frete calculado após análise, por conta do porte e da necessidade de içamento.",
      isDefault: true,
    },
    {
      name: "Retirada na JB",
      kind: "retirada" as const,
      description: "Retirada no endereço da JB, mediante agendamento.",
      isDefault: false,
    },
    {
      name: "Peças e acessórios",
      kind: "transportadora" as const,
      description: "Envio por transportadora, com valor por faixa de CEP.",
      isDefault: false,
    },
  ];

  for (const perfil of perfis) {
    const existe = await prisma.shippingProfile.findFirst({ where: { name: perfil.name } });
    if (!existe) await prisma.shippingProfile.create({ data: perfil });
  }

  /* ------------------------------------------------------ seções da home */
  console.log("→ seções da home");
  const secoes = [
    { kind: "hero", order: 1 },
    { kind: "confianca", order: 2 },
    { kind: "categorias", order: 3 },
    { kind: "destaques", order: 4 },
    { kind: "seminovos", order: 5 },
    { kind: "assistencia", order: 6 },
    { kind: "minha_jb", order: 7 },
    { kind: "faq", order: 8 },
    { kind: "cta", order: 9 },
  ];
  for (const secao of secoes) {
    const existe = await prisma.homeSection.findFirst({ where: { kind: secao.kind } });
    if (!existe) {
      await prisma.homeSection.create({ data: { ...secao, published: true } });
    }
  }

  /* ---------------------------------------------------------------- FAQ */
  console.log("→ perguntas frequentes");
  const perguntas = [
    {
      question: "A JB faz manutenção em equipamento que não foi comprado com vocês?",
      answer:
        "Sim. A assistência atende equipamentos de qualquer origem. Basta abrir um chamado informando marca, modelo e o que está acontecendo.",
      group: "assistencia",
      order: 1,
    },
    {
      question: "Preciso aprovar o orçamento antes de qualquer troca de peça?",
      answer:
        "Sim. Nenhuma peça é substituída sem a sua aprovação. O orçamento chega na Área da Clínica com diagnóstico, peças e mão de obra discriminados.",
      group: "assistencia",
      order: 2,
    },
    {
      question: "O que significa Seminovo JB?",
      answer:
        "É um equipamento usado que passou pela bancada da JB. Cada unidade tem o próprio checklist de revisão, com o que foi verificado e o que foi substituído, além de fotos reais da peça que você vai receber.",
      group: "geral",
      order: 3,
    },
    {
      question: "Como acompanho meu pedido?",
      answer:
        "Pela Área da Clínica. Cada pedido tem uma linha do tempo que vai de “pedido realizado” até a instalação, com a data de cada etapa.",
      group: "compra",
      order: 4,
    },
    {
      question: "Posso comprar sem criar conta?",
      answer:
        "Pode. O cadastro não é obrigatório para comprar. Depois da compra oferecemos criar a conta com o mesmo e-mail, para você acompanhar o pedido e o equipamento.",
      group: "compra",
      order: 5,
    },
    {
      question: "Vocês emitem ordem de serviço?",
      answer:
        "Sim. Toda manutenção gera uma ordem de serviço com o que foi executado, as peças usadas e as medidas necessárias, disponível para download na Área da Clínica.",
      group: "assistencia",
      order: 6,
    },
  ];

  for (const pergunta of perguntas) {
    const existe = await prisma.faq.findFirst({ where: { question: pergunta.question } });
    if (!existe) await prisma.faq.create({ data: { ...pergunta, published: true } });
  }

  /* ------------------------------------------------------------ usuário */
  console.log("→ usuário administrador");
  const email = process.env.ADMIN_EMAIL ?? "comercial@jbsolucoesodontologicas.com.br";
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.log(`   já existe: ${email}`);
  } else {
    const senha = process.env.ADMIN_PASSWORD ?? crypto.randomBytes(9).toString("base64url");
    await prisma.user.create({
      data: {
        name: "JB Soluções",
        email,
        passwordHash: await bcrypt.hash(senha, 12),
        role: "admin",
      },
    });
    console.log("\n   ┌──────────────────────────────────────────────");
    console.log("   │ PAINEL  ·  /admin");
    console.log(`   │ e-mail: ${email}`);
    console.log(`   │ senha:  ${senha}`);
    console.log("   └─ troque a senha no primeiro acesso\n");
  }

  console.log("Pronto.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
