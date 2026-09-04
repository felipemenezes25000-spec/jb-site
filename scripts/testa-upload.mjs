/**
 * Verifica que o upload do painel grava no Vercel Blob em produção.
 *   BASE_URL=... ADMIN_PASSWORD=... node scripts/testa-upload.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.ADMIN_EMAIL || "comercial@jbsolucoesodontologicas.com.br";
const SENHA = process.env.ADMIN_PASSWORD || "";

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
await page.fill("#campo-email", EMAIL);
await page.fill("#campo-senha", SENHA);
await page.click('button:has-text("Entrar")');
await page.waitForURL(/\/admin$/, { timeout: 30000 });
console.log("OK     login");

// PNG 2x2 mínimo, gerado aqui mesmo
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC",
  "base64",
);

const resultado = await page.evaluate(async (bytes) => {
  const arquivo = new File([new Uint8Array(bytes)], "teste-blob.png", { type: "image/png" });
  const form = new FormData();
  form.append("arquivo", arquivo);
  const resposta = await fetch("/api/admin/upload", { method: "POST", body: form });
  return { status: resposta.status, corpo: await resposta.json() };
}, [...png]);

if (resultado.status !== 200) {
  console.log("FALHOU upload —", JSON.stringify(resultado.corpo));
  await browser.close();
  process.exit(1);
}

const url = resultado.corpo.media.url;
const noBlob = url.startsWith("https://") && url.includes("blob.vercel-storage.com");
console.log(`OK     upload aceito`);
console.log(`${noBlob ? "OK    " : "FALHOU"} destino é o Vercel Blob  — ${url}`);

// a imagem precisa estar acessível publicamente
const alcance = await page.evaluate(async (u) => (await fetch(u)).status, url);
console.log(`${alcance === 200 ? "OK    " : "FALHOU"} imagem acessível (${alcance})`);

// limpa
await page.goto(`${BASE}/admin/midia`, { waitUntil: "domcontentloaded" });
await browser.close();
console.log(`\nid da mídia criada: ${resultado.corpo.media.id} (apague em /admin/midia)`);
process.exit(noBlob && alcance === 200 ? 0 : 1);
