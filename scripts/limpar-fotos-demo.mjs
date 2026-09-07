/**
 * Limpeza das fotos de demonstração.
 *
 * As cinco fotos de `public/demo` carregam um halo diagonal de recorte — faixas
 * de cinza a 1–3% que sobraram de uma remoção de fundo malfeita. No arquivo elas
 * quase não existem (luminância 248–253 num fundo 255), mas a moldura da galeria
 * as revela: o palco tem um degradê claro por trás, e qualquer coisa que não seja
 * branco puro vira um "X" visível atrás do equipamento.
 *
 * A correção encosta apenas no que é fundo: pixel com luminância >= LIMIAR vira
 * branco puro. O equipamento não é tocado — a parte mais clara do corpo dele,
 * medida, fica abaixo de 248, e as sombras suaves ficam bem abaixo disso.
 *
 * Reencoda com qualidade 92 (era ~60): o arquivo cresce, mas some o banding que
 * a compressão criava justamente nas áreas de branco quase uniforme.
 *
 *   node limpar-fotos.mjs [--conferir]
 */
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const PASTA = path.join(process.cwd(), "public", "demo");
const LIMIAR = 248;
const soConferir = process.argv.includes("--conferir");

for (const arquivo of fs.readdirSync(PASTA)) {
  if (!/\.webp$/i.test(arquivo)) continue;
  const origem = path.join(PASTA, arquivo);

  /* Lê para memória antes de processar: passar o CAMINHO para o sharp deixa um
     descritor aberto, e no Windows a gravação por cima falha com UNKNOWN. */
  const bruto = fs.readFileSync(origem);
  const { data, info } = await sharp(bruto).raw().toBuffer({ resolveWithObject: true });
  const { width: L, height: A, channels: C } = info;
  const luzEm = (x, y) => {
    const i = (y * L + x) * C;
    return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  };

  /* Onde está o equipamento.
     Pixel abaixo de 200 de luminância é peça, não halo — o halo mais escuro
     destas fotos fica por volta de 205. Exigir cinco deles na mesma linha (ou
     coluna) descarta ruído solto de compressão. */
  let x0 = L;
  let x1 = 0;
  let y0 = A;
  let y1 = 0;
  for (let y = 0; y < A; y += 1) {
    let n = 0;
    for (let x = 0; x < L; x += 1) if (luzEm(x, y) < 200) n += 1;
    if (n > 4) {
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  for (let x = 0; x < L; x += 1) {
    let n = 0;
    for (let y = 0; y < A; y += 1) if (luzEm(x, y) < 200) n += 1;
    if (n > 4) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
  }

  const folga = 8;
  x0 = Math.max(0, x0 - folga);
  y0 = Math.max(0, y0 - folga);
  x1 = Math.min(L - 1, x1 + folga);
  y1 = Math.min(A - 1, y1 + folga);

  /* A silhueta do equipamento, e tudo que estiver fora dela.

     Inundar a partir da borda não funciona: o corpo destes equipamentos é
     branco e se liga ao fundo por pixels claros, então o preenchimento vaza
     para dentro da peça e a achata. O caminho que funciona é o inverso —
     descobrir onde a peça ESTÁ e apagar o resto:

       1. marca o traço forte (luminância < 205): contorno, painel, mangueira;
       2. engorda esse traço em RAIO px, o que fecha os vãos do contorno;
       3. inunda o complemento a partir da borda: o que a inundação NÃO alcança
          é o miolo cercado pelo contorno, ou seja, o equipamento;
       4. tudo que ficou de fora vira branco puro.

     Assim o halo diagonal do recorte some inteiro, e a sombra de contato — que
     mora dentro do raio, colada à peça — continua lá. */
  const RAIO = 26;

  const forte = new Uint8Array(L * A);
  for (let y = 0; y < A; y += 1) {
    for (let x = 0; x < L; x += 1) {
      if (luzEm(x, y) < 205) forte[y * L + x] = 1;
    }
  }

  /* Distância ao traço mais próximo, por chamfer de duas passadas. É o
     suficiente para um raio pequeno e roda em milissegundos. */
  const GRANDE = 1e9;
  const dist = new Float64Array(L * A);
  for (let i = 0; i < dist.length; i += 1) dist[i] = forte[i] ? 0 : GRANDE;

  const consulta = (x, y) => (x < 0 || y < 0 || x >= L || y >= A ? GRANDE : dist[y * L + x]);

  for (let y = 0; y < A; y += 1) {
    for (let x = 0; x < L; x += 1) {
      const p = y * L + x;
      if (dist[p] === 0) continue;
      dist[p] = Math.min(
        dist[p],
        consulta(x - 1, y) + 1,
        consulta(x, y - 1) + 1,
        consulta(x - 1, y - 1) + 1.4142,
        consulta(x + 1, y - 1) + 1.4142,
      );
    }
  }
  for (let y = A - 1; y >= 0; y -= 1) {
    for (let x = L - 1; x >= 0; x -= 1) {
      const p = y * L + x;
      if (dist[p] === 0) continue;
      dist[p] = Math.min(
        dist[p],
        consulta(x + 1, y) + 1,
        consulta(x, y + 1) + 1,
        consulta(x + 1, y + 1) + 1.4142,
        consulta(x - 1, y + 1) + 1.4142,
      );
    }
  }

  /* Inunda o que está FORA do traço engordado. O que sobrar sem alcance é a
     peça (ou o vazio cercado por ela, que também não deve virar branco). */
  const fora = new Uint8Array(L * A);
  const fila = [];
  const enfileirar = (x, y) => {
    if (x < 0 || y < 0 || x >= L || y >= A) return;
    const p = y * L + x;
    if (fora[p] || dist[p] <= RAIO) return;
    fora[p] = 1;
    fila.push(p);
  };

  for (let x = 0; x < L; x += 1) {
    enfileirar(x, 0);
    enfileirar(x, A - 1);
  }
  for (let y = 0; y < A; y += 1) {
    enfileirar(0, y);
    enfileirar(L - 1, y);
  }

  let cabeca = 0;
  while (cabeca < fila.length) {
    const p = fila[cabeca];
    cabeca += 1;
    const x = p % L;
    const y = (p - x) / L;
    enfileirar(x + 1, y);
    enfileirar(x - 1, y);
    enfileirar(x, y + 1);
    enfileirar(x, y - 1);
  }

  let tocados = 0;
  const branquear = (i) => {
    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) return;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    tocados += 1;
  };

  for (let y = 0; y < A; y += 1) {
    for (let x = 0; x < L; x += 1) {
      const i = (y * L + x) * C;
      const foraDaCaixa = x < x0 || x > x1 || y < y0 || y > y1;
      const foraDaPeca = fora[y * L + x] === 1;
      /* Fora da caixa do equipamento não existe conteúdo: tudo ali é fundo, e
         fundo desta foto é branco. Dentro dela, some o que o preenchimento
         alcançou pela borda e o que já era quase branco — a sombra real da peça
         fica bem abaixo do limiar e não é alcançada por fora. */
      if (foraDaCaixa || foraDaPeca || luzEm(x, y) >= LIMIAR) branquear(i);
    }
  }

  const total = info.width * info.height;
  console.log(
    `${arquivo}  ${L}x${A}  equipamento em ${x0},${y0}→${x1},${y1}  pixels corrigidos: ${tocados} (${((tocados / total) * 100).toFixed(1)}%)`,
  );

  if (soConferir) continue;

  const saida = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .webp({ quality: 92, effort: 6 })
    .toBuffer();

  fs.writeFileSync(origem, saida);
}
