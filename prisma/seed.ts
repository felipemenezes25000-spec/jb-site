/**
 * Carga inicial a partir do conteúdo real do site antigo.
 *
 * A fonte é prisma/conteudo-legado.json, gerado por scripts/extrai-legado.mjs
 * lendo o MySQL do backup. Nada é reescrito à mão: o HTML entra byte a byte
 * como estava no MARS, para o site novo renderizar exatamente igual.
 *
 *   pnpm db:seed
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";

import { PrismaClient } from "@prisma/client";
import { SETTING_DEFAULTS, SETTING_FIELDS, type SettingKey } from "../src/lib/settings";

const prisma = new PrismaClient();

type Legado = {
  institucional: { id: number; pagina: string; texto: string; video: string; imgs: string[] }[];
  seo: { id: number; titulo: string; descricao: string; pagina: string }[];
  servicos: {
    id: number;
    nome: string;
    descricao: string;
    foto: string;
    ordem: number;
    publicado: boolean;
  }[];
  home: {
    id: number;
    titulo: string;
    subtitulo: string;
    descricao: string;
    link: string;
    target: string;
    img: string;
    ordem: number;
  }[];
  slides: {
    id: number;
    nome: string;
    slide: string;
    link: string;
    target: string;
    titulo: string;
    subtitulo: string;
    ordem: number;
    publicado: boolean;
    lixo: boolean;
    dataSaida: string | null;
  }[];
  configuracoes: { campo: string; valor: string }[];
};

const legado: Legado = JSON.parse(
  fs.readFileSync(path.join(__dirname, "conteudo-legado.json"), "utf8"),
);

/** Menu do site antigo — é daqui que vinha o <h1> das páginas internas. */
const TITULO_MENU: Record<string, string> = {
  "index.php": "Home",
  "empresa.php": "Empresa",
  "estrutura.php": "Estrutura",
  "solucoes.php": "Soluções",
  "contato.php": "Contato",
};

const ROTA: Record<string, string> = {
  "index.php": "index",
  "empresa.php": "empresa",
  "estrutura.php": "estrutura",
  "solucoes.php": "solucoes",
  "contato.php": "contato",
};

/** Registra as imagens de /images/online como itens da biblioteca de mídia. */
const midiaCache = new Map<string, string>();

async function midia(arquivo: string, alt = "") {
  if (!arquivo) return null;
  if (midiaCache.has(arquivo)) return midiaCache.get(arquivo)!;

  const url = `/images/online/${arquivo}`;
  const disco = path.join(__dirname, "..", "public", "images", "online", arquivo);
  const existe = fs.existsSync(disco);
  if (!existe) console.warn(`   ! imagem ausente: public${url}`);

  const id = `leg-${arquivo.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`.slice(0, 60);
  const extensao = path.extname(arquivo).slice(1).toLowerCase();
  await prisma.media.upsert({
    where: { id },
    update: { url, alt },
    create: {
      id,
      filename: arquivo,
      url,
      alt,
      folder: "online",
      mime: extensao === "png" ? "image/png" : extensao === "gif" ? "image/gif" : "image/jpeg",
      size: existe ? fs.statSync(disco).size : 0,
    },
  });
  midiaCache.set(arquivo, id);
  return id;
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function main() {
  console.log("→ configurações");

  const conf = new Map(legado.configuracoes.map((c) => [c.campo, c.valor]));
  const institucional = new Map(legado.institucional.map((i) => [i.id, i]));

  const seoPorPagina = new Map<string, { titulo: string; descricao: string }>();
  for (const linha of legado.seo) {
    // o id 1 é o registro reservado da "descrição master" da home
    if (linha.id === 1) continue;
    seoPorPagina.set(linha.pagina, { titulo: linha.titulo, descricao: linha.descricao });
  }

  const valores: Partial<Record<SettingKey, string>> = {
    site_titulo: "JB Soluções Odontológicas",
    descricao_master: legado.seo.find((s) => s.id === 1)?.descricao ?? "",
    telefone_rodape: conf.get("telefone_rodape") ?? "",
    endereco_rodape: conf.get("endereco_rodape") ?? "",
    email_contato: institucional.get(3)?.texto.trim() ?? "",
    contato_html: institucional.get(1)?.texto ?? "",
    maps_html: institucional.get(2)?.texto ?? "",
    codigo_analytics: conf.get("codigo_analytics") ?? "",
    fanpage_link: conf.get("fanpage_link") ?? "",
    twitter_link: conf.get("twitter_link") ?? "",
    instagram_link: conf.get("instagram_link") ?? "",
    pinterest_link: conf.get("pinterest_link") ?? "",
    google_plus_link: conf.get("google_plus_link") ?? "",
    linkedin_link: conf.get("linkedin_link") ?? "",
    youtube_link: conf.get("youtube_link") ?? "",
    skype_link: conf.get("skype_link") ?? "",
  };

  for (const [ordem, campo] of SETTING_FIELDS.entries()) {
    const valor = valores[campo.key] ?? SETTING_DEFAULTS[campo.key];
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
      // preenche o que ainda está em branco, mas nunca sobrescreve o que já
      // foi editado no painel
      update: atual && atual.value.trim() === "" ? { ...meta, value: valor } : meta,
      create: { key: campo.key, ...meta, value: valor },
    });
  }

  console.log("→ páginas");
  const blocoPorRota: Record<string, number | undefined> = { empresa: 4, estrutura: 5 };

  for (const [pagina, rota] of Object.entries(ROTA)) {
    const seo = seoPorPagina.get(pagina);
    const bloco = blocoPorRota[rota] ? institucional.get(blocoPorRota[rota]!) : undefined;
    const imagens = bloco?.imgs ?? [];
    const capaId = imagens[0] ? await midia(imagens[0], seo?.titulo ?? "") : null;

    const dados = {
      title: TITULO_MENU[pagina],
      lead: seo?.descricao ?? "",
      body: bloco?.texto ?? "",
      videoId: bloco?.video?.trim() || null,
      coverId: capaId,
      seoTitle: seo?.titulo ?? TITULO_MENU[pagina],
      seoDescription: seo?.descricao ?? "",
    };

    await prisma.page.upsert({
      where: { slug: rota },
      update: dados,
      create: { slug: rota, editable: Boolean(bloco), ...dados },
    });

    // as demais imagens viram a galeria da página, na mesma ordem
    await prisma.pageImage.deleteMany({ where: { pageSlug: rota } });
    for (const [i, arquivo] of imagens.slice(1).entries()) {
      const mediaId = await midia(arquivo, seo?.titulo ?? "");
      if (mediaId) await prisma.pageImage.create({ data: { pageSlug: rota, mediaId, order: i } });
    }
  }

  console.log("→ soluções");
  await prisma.serviceCategory.deleteMany();
  for (const servico of legado.servicos) {
    await prisma.serviceCategory.create({
      data: {
        slug: slugify(servico.nome),
        name: servico.nome,
        description: servico.descricao,
        imageId: await midia(servico.foto, servico.nome),
        order: servico.ordem,
        published: servico.publicado,
      },
    });
  }

  console.log("→ chamadas da home");
  await prisma.highlight.deleteMany();
  for (const item of legado.home) {
    await prisma.highlight.create({
      data: {
        id: `home-${item.id}`,
        title: item.titulo,
        subtitle: item.subtitulo || null,
        body: item.descricao || null,
        href: item.link || null,
        target: item.target,
        imageId: await midia(item.img, item.titulo),
        order: item.ordem,
        published: true,
      },
    });
  }

  console.log("→ slides");
  await prisma.slide.deleteMany();
  for (const slide of legado.slides) {
    if (!slide.slide) continue;
    await prisma.slide.create({
      data: {
        id: `slide-${slide.id}`,
        title: slide.titulo,
        subtitle: slide.subtitulo || null,
        href: slide.link || null,
        imageId: await midia(slide.slide, slide.nome),
        order: slide.ordem,
        published: slide.publicado && !slide.lixo,
        endsAt: slide.dataSaida ? new Date(`${slide.dataSaida}T23:59:59`) : null,
      },
    });
  }

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
