/* ============================================================================
   Planta de raio-X das fotos do site

   Gera, a partir de cada foto real, só os traços do equipamento: bordas por
   Sobel, em branco, com o fundo transparente. O site põe esses traços sobre
   uma faixa grafite que atravessa a foto (o "scanner"), e a cor e o brilho
   vêm do CSS, não da imagem. Pré-gerado de propósito: o celular de quem chega
   do anúncio não roda filtro nenhum, só desloca uma camada.

   Uso: node scripts/gerar-raiox.mjs
   Saída: public/site/raiox/<nome>.webp (com transparência)

   Rode de novo sempre que uma foto de `public/site/equip/portfolio` ou
   `public/site/bancada.webp` mudar.
   ============================================================================ */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RAIZ = path.resolve(import.meta.dirname, "..");
const SAIDA = path.join(RAIZ, "public/site/raiox");

const PORTFOLIO = path.join(RAIZ, "public/site/equip/portfolio");
const FONTES = [
  ...fs
    .readdirSync(PORTFOLIO)
    .filter((nome) => nome.endsWith(".webp"))
    .map((nome) => ({ entrada: path.join(PORTFOLIO, nome), nome, largura: 640, foto: false })),
  { entrada: path.join(RAIZ, "public/site/bancada.webp"), nome: "bancada.webp", largura: 1280, foto: true },
];

/** Bordas por Sobel em tons de cinza; devolve a magnitude de cada pixel. */
function sobel(cinza, largura, altura) {
  const saida = new Float32Array(largura * altura);
  for (let y = 1; y < altura - 1; y++) {
    for (let x = 1; x < largura - 1; x++) {
      const i = y * largura + x;
      const a = cinza[i - largura - 1];
      const b = cinza[i - largura];
      const c = cinza[i - largura + 1];
      const d = cinza[i - 1];
      const f = cinza[i + 1];
      const g = cinza[i + largura - 1];
      const h = cinza[i + largura];
      const k = cinza[i + largura + 1];
      const gx = c + 2 * f + k - (a + 2 * d + g);
      const gy = g + 2 * h + k - (a + 2 * b + c);
      saida[i] = Math.hypot(gx, gy);
    }
  }
  return saida;
}

function percentil(valores, p) {
  const amostra = [];
  for (let i = 0; i < valores.length; i += 7) if (valores[i] > 0) amostra.push(valores[i]);
  amostra.sort((x, y) => x - y);
  return amostra[Math.min(amostra.length - 1, Math.floor(amostra.length * p))] || 1;
}

fs.mkdirSync(SAIDA, { recursive: true });

for (const fonte of FONTES) {
  const { data, info } = await sharp(fonte.entrada)
    .resize({ width: fonte.largura, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .grayscale()
    .blur(fonte.foto ? 1.1 : 0.6)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width: largura, height: altura } = info;
  const borda = sobel(data, largura, altura);
  /* Normaliza pelo percentil alto, não pelo máximo: um reflexo forte não
     apaga o resto do desenho. Na foto de cena, o corte é mais alto para a
     planta não virar ruído. */
  const teto = percentil(borda, fonte.foto ? 0.985 : 0.97);
  const piso = fonte.foto ? 0.22 : 0.12;

  const rgba = Buffer.alloc(largura * altura * 4);
  for (let i = 0; i < borda.length; i++) {
    let v = Math.min(1, borda[i] / teto);
    v = v < piso ? 0 : (v - piso) / (1 - piso);
    const alfa = Math.round(Math.pow(v, 0.72) * 255);
    rgba[i * 4] = 255;
    rgba[i * 4 + 1] = 255;
    rgba[i * 4 + 2] = 255;
    rgba[i * 4 + 3] = alfa;
  }

  const destino = path.join(SAIDA, fonte.nome);
  await sharp(rgba, { raw: { width: largura, height: altura, channels: 4 } })
    .webp({ quality: 72, alphaQuality: 70, effort: 6 })
    .toFile(destino);
  const kb = (fs.statSync(destino).size / 1024).toFixed(1);
  console.log(`${fonte.nome.padEnd(28)} ${largura}×${altura}  ${kb} KB`);
}
