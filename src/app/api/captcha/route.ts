import crypto from "node:crypto";

import { cookies } from "next/headers";

/*
 * O `export const dynamic = "force-dynamic"` saiu daqui: com
 * `cacheComponents`, a busca de dados já é dinâmica por padrão e o que se
 * marca é o que deve ser CACHEADO, não o contrário. Esta rota não tem nenhum
 * `use cache`, então continua dinâmica — agora por omissão, que é o padrão da
 * versão instalada.
 */

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I, O, 0 e 1
const COOKIE = "jb_captcha";

export function assinar(texto: string) {
  // segredo vazio produz um HMAC que qualquer um reproduz: a assinatura
  // deixaria de significar coisa alguma. Melhor falhar alto na subida.
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("AUTH_SECRET ausente: a assinatura não pode ser gerada.");
  return crypto.createHmac("sha256", segredo).update(texto.toUpperCase()).digest("hex");
}

/**
 * Substitui o captcha.php (GD + sessão) por um SVG assinado em cookie.
 * Mesmo lugar e mesmo papel no formulário; sem estado de sessão no servidor.
 */
export async function GET() {
  const texto = Array.from(
    { length: 5 },
    () => ALFABETO[crypto.randomInt(ALFABETO.length)],
  ).join("");

  const jar = await cookies();
  jar.set(COOKIE, assinar(texto), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  });

  const largura = 150;
  const altura = 44;
  const letras = texto
    .split("")
    .map((letra, i) => {
      const x = 16 + i * 26 + crypto.randomInt(-2, 3);
      const y = 30 + crypto.randomInt(-4, 5);
      const rot = crypto.randomInt(-18, 19);
      return `<text x="${x}" y="${y}" transform="rotate(${rot} ${x} ${y})" font-family="Verdana,sans-serif" font-size="24" font-weight="bold" fill="#4a4a4a">${letra}</text>`;
    })
    .join("");

  const ruido = Array.from({ length: 6 }, () => {
    const x1 = crypto.randomInt(largura);
    const y1 = crypto.randomInt(altura);
    const x2 = crypto.randomInt(largura);
    const y2 = crypto.randomInt(altura);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#bbb" stroke-width="1"/>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Código de verificação"><rect width="100%" height="100%" fill="#f2f2f2"/>${ruido}${letras}</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
