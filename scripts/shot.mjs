/**
 * Screenshots de verificação.
 *   node scripts/shot.mjs <url-path> <nome> [largura] [--full|--y=1200]
 */
import { chromium } from "playwright";

const [pathArg = "/", name = "shot", widthArg = "1440", mode = "--full"] = process.argv.slice(2);
const width = Number(widthArg);
const base = process.env.BASE_URL || "http://localhost:64685";

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height: Math.round(width * 0.62) },
  deviceScaleFactor: 1,
});
await page.goto(base + pathArg, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("load").catch(() => {});
await page.emulateMedia({ reducedMotion: "reduce" });
// dispara as revelações de scroll
await page.evaluate(async () => {
  const step = window.innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 90));
  }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 350));
});
// esconde o indicador de dev do Next
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

if (mode === "--full") {
  await page.screenshot({ path: `.shots/${name}.png`, fullPage: true });
} else {
  const y = Number(mode.replace("--y=", "")) || 0;
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `.shots/${name}.png` });
}
const { width: w, height: h } = await page.evaluate(() => ({ width: document.body.scrollWidth, height: document.body.scrollHeight }));
console.log(`.shots/${name}.png  viewport=${width}  pagina=${w}x${h}`);
await browser.close();
