/**
 * Lê o banco do site antigo (container jb-db) e grava o conteúdo em JSON.
 * Usa HEX() para não perder nenhum byte na travessia.
 *
 *   node scripts/extrai-legado.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

function query(sql) {
  const out = execFileSync(
    "docker",
    ["exec", "jb-db", "mysql", "-uroot", "-proot", "-N", "--batch", "--raw", "-e", sql],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return out
    .split("\n")
    .filter((l) => l.trim() !== "" && !l.startsWith("Warning"))
    .map((l) => l.split("\t"));
}

/* ------------------------------------------------------------------
   O conteúdo foi gravado em UTF-8 e reinterpretado como cp1252 — uma
   ou duas vezes, dependendo de quando o texto foi editado no MARS.
   O que o MySQL chama de "latin1" é, na prática, cp1252: por isso as
   aspas curvas viraram "â€œ" em vez de bytes de controle.
   ------------------------------------------------------------------ */

// cp1252 difere do latin1 apenas na faixa 0x80–0x9F
const CP1252_ALTO = [
  0x20ac, 0x0081, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x008d, 0x017d, 0x008f, 0x0090, 0x2018, 0x2019, 0x201c,
  0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x009d,
  0x017e, 0x0178,
];
const PARA_BYTE = new Map(CP1252_ALTO.map((cp, i) => [cp, 0x80 + i]));

/** String → bytes cp1252. Devolve null se algum caractere não couber. */
function paraCp1252(texto) {
  const bytes = Buffer.alloc(texto.length);
  for (let i = 0; i < texto.length; i++) {
    const cp = texto.codePointAt(i);
    if (cp > 0xffff) return null;
    if (cp <= 0xff && !(cp >= 0x80 && cp <= 0x9f)) bytes[i] = cp;
    else if (PARA_BYTE.has(cp)) bytes[i] = PARA_BYTE.get(cp);
    else return null;
  }
  return bytes;
}

const LIDERES = new Set([0x00c2, 0x00c3, 0x00e2, 0x00c5, 0x00c4]);

/** Assinatura de mojibake: líder UTF-8 lido como cp1252 + continuação. */
function pareceMojibake(texto) {
  for (let i = 0; i < texto.length - 1; i++) {
    if (!LIDERES.has(texto.charCodeAt(i))) continue;
    const seguinte = texto.codePointAt(i + 1);
    const byte =
      seguinte <= 0xff && !(seguinte >= 0x80 && seguinte <= 0x9f)
        ? seguinte
        : PARA_BYTE.get(seguinte);
    if (byte !== undefined && byte >= 0x80 && byte <= 0xbf) return true;
  }
  return false;
}

function desdobrar(texto) {
  let atual = texto;
  for (let volta = 0; volta < 4 && pareceMojibake(atual); volta++) {
    const bytes = paraCp1252(atual);
    if (!bytes) break;
    const tentativa = bytes.toString("utf8");
    if (tentativa.includes("�")) break; // desfez demais
    atual = tentativa;
  }
  return atual;
}

const hex = (v) =>
  v && v !== "NULL" ? desdobrar(Buffer.from(v, "hex").toString("utf8")) : "";

/* ------------------------------------------------------------------ */

const db = "jbsolucoesodon";
const dados = {};

dados.institucional = query(
  `SELECT id, HEX(pagina), HEX(texto), HEX(video), HEX(img1), HEX(img2), HEX(img3) FROM ${db}.institucional ORDER BY id`,
).map(([id, pagina, texto, video, img1, img2, img3]) => ({
  id: Number(id),
  pagina: hex(pagina),
  texto: hex(texto),
  video: hex(video),
  imgs: [hex(img1), hex(img2), hex(img3)].filter(Boolean),
}));

dados.seo = query(
  `SELECT id, HEX(titulo), HEX(descricao), HEX(pagina_php) FROM ${db}.seo ORDER BY id`,
).map(([id, titulo, descricao, pagina]) => ({
  id: Number(id),
  titulo: hex(titulo),
  descricao: hex(descricao),
  pagina: hex(pagina),
}));

dados.servicos = query(
  `SELECT id, HEX(nome), HEX(descricao), HEX(foto), ordem, publicado FROM ${db}.mp5600_servicos WHERE lixo = 0 ORDER BY ordem ASC, id ASC`,
).map(([id, nome, descricao, foto, ordem, publicado]) => ({
  id: Number(id),
  nome: hex(nome).trim(),
  descricao: hex(descricao),
  foto: hex(foto),
  ordem: Number(ordem),
  publicado: publicado === "1",
}));

dados.home = query(
  `SELECT id, HEX(titulo), HEX(subtitulo), HEX(descricao), HEX(link), HEX(target), HEX(img), ordem FROM ${db}.home ORDER BY ordem ASC, id ASC`,
).map(([id, titulo, subtitulo, descricao, link, target, img, ordem]) => ({
  id: Number(id),
  titulo: hex(titulo),
  subtitulo: hex(subtitulo),
  descricao: hex(descricao),
  link: hex(link),
  target: hex(target) || "_self",
  img: hex(img),
  ordem: Number(ordem),
}));

dados.slides = query(
  `SELECT id, HEX(nome), HEX(slide), HEX(link), HEX(target), HEX(titulo), HEX(subtitulo), ordem, publicado, lixo, data_saida FROM ${db}.area_nobre ORDER BY ordem ASC, id ASC`,
).map(([id, nome, slide, link, target, titulo, subtitulo, ordem, publicado, lixo, saida]) => ({
  id: Number(id),
  nome: hex(nome),
  slide: hex(slide),
  link: hex(link),
  target: hex(target) || "_self",
  titulo: hex(titulo),
  subtitulo: hex(subtitulo),
  ordem: Number(ordem),
  publicado: publicado === "1",
  lixo: lixo === "1",
  dataSaida: saida === "NULL" ? null : saida,
}));

dados.configuracoes = query(
  `SELECT HEX(campo), HEX(valor) FROM ${db}.configuracoes ORDER BY id`,
).map(([campo, valor]) => ({ campo: hex(campo), valor: hex(valor) }));

fs.writeFileSync("prisma/conteudo-legado.json", JSON.stringify(dados, null, 2), "utf8");

for (const [chave, lista] of Object.entries(dados)) {
  console.log(String(chave).padEnd(16), lista.length, "registros");
}
console.log("\n→ prisma/conteudo-legado.json");
