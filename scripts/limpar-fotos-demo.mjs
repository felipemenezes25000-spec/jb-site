/**
 * Preparo das fotos de demonstração — limpeza e resolução.
 *
 * O QUE ESTAS FOTOS TÊM DE ERRADO
 *
 * As quatro fotos recortadas de `public/demo` carregam o rastro de uma remoção
 * de fundo malfeita: um "X" diagonal claro (235–253 num fundo que deveria ser
 * 255) atravessando o quadro inteiro, e um fantasma escuro (181–210) colado na
 * silhueta do equipamento. O X é o que mais salta aos olhos; o fantasma é o que
 * mais custa a tirar.
 *
 * O QUE NÃO FUNCIONA — e por que está escrito aqui
 *
 * Três caminhos que parecem óbvios e não são, todos medidos nestas fotos:
 *
 *  1. **Preenchimento a partir da borda.** Vaza. O corpo dos equipamentos é
 *     branco e encosta no fundo por caminhos claros: o preenchimento alcança
 *     86–93% da foto em qualquer limiar entre 220 e 240.
 *
 *  2. **Máscara de silhueta.** O contorno do equipamento não é contínuo o
 *     bastante para fechar. Semeando abaixo de 170 — que é onde o fantasma
 *     acaba — a silhueta fica com 2–3% da foto e o equipamento se desfaz.
 *     Semeando acima, o fantasma entra na máscara e sobrevive.
 *
 *  3. **Corte duro no limiar.** Foi o que esta ferramenta fazia antes, e é o
 *     defeito que apareceu na ficha: pixel em 239 vira 255 e pixel em 238 fica
 *     onde está. Esse degrau de dezessete níveis desenha uma borda rasgada em
 *     volta do equipamento — e borda dura o olho lê como imagem quebrada, que é
 *     pior que o halo original.
 *
 * O motivo de fundo é o mesmo nos três: o contorno do equipamento vive na MESMA
 * faixa de luminância do fantasma. Nenhum limiar separa os dois, e separá-los
 * no espaço exigiria um algoritmo de matting de verdade.
 *
 * O QUE FUNCIONA
 *
 * Esmaecimento suave, sem máscara nenhuma. Acima de `alto` o pixel vira branco;
 * de `alto - JANELA` até `alto` ele caminha para o branco por uma curva
 * `smoothstep`; abaixo disso não é tocado. Sem degrau, sem borda, e o X some.
 * O fantasma não some por inteiro — ele encosta no contorno do equipamento —
 * mas cai para uma sombra suave, que o olho lê como sombra e não como defeito.
 *
 * `alto` sai da própria foto: os quatro cantos só têm fundo e halo, então o
 * pixel mais escuro que existe lá é o piso do halo daquele arquivo. Valor fixo
 * serviria bem numa foto e mal na seguinte.
 *
 * O PREÇO, dito na cara: a borda clara do próprio equipamento também clareia um
 * pouco. É uma troca — e entre um contorno um pouco mais suave e um X diagonal
 * atravessando a foto do produto, o contorno suave ganha.
 *
 * ISTO NÃO SUBSTITUI FOTO BOA. É remendo em arquivo estragado na origem. O que
 * resolve de verdade é a JB mandar a foto em 1600–2400px, e `CREDITOS.md` diz
 * exatamente isso.
 *
 * Reencoda com qualidade 92 (era ~60): o arquivo cresce, mas some o banding que
 * a compressão criava justamente nas áreas de branco quase uniforme. Depois
 * sobe para LADO px com reamostragem lanczos e nitidez leve. Ampliar não
 * inventa detalhe — mas o palco da ficha chega a ~1050px em monitor grande, e
 * entregar 840px ali faz o navegador esticar com o filtro barato dele.
 *
 * A LISTA É EXPLÍCITA de propósito: o tratamento só serve para foto recortada
 * em fundo branco. Arquivo que não estiver aqui não é tocado.
 *
 *   node limpar-fotos-demo.mjs [--conferir]
 */
import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const PASTA = path.join(process.cwd(), "public", "demo");
const LADO = 2200;

/** Largura da rampa, em níveis de luminância. Medido: 45 deixa fantasma
    visível, 80 limpa sem apagar o contorno do equipamento. */
const JANELA = 80;

/** Limites do `alto` calculado por foto. O piso impede que uma foto com canto
    sujo puxe a rampa para cima da sombra de contato. */
const PISO = 232;
const TETO = 250;

/**
 * Depois da rampa, quase-branco vira branco exato.
 *
 * Sem isto o defeito volta na tela, e por um caminho que o arquivo não denuncia:
 * a rampa deixa o fundo em 250–254 — invisível a olho nu no arquivo — e o
 * otimizador do Next reencoda para WebP com qualidade 75 antes de servir. O
 * codificador quantiza aquela névoa suave em blocos, e os blocos redesenham o
 * X. Medido: com a névoa, o canto da variante servida ao navegador chega a 246;
 * o arquivo em disco marcava 255 no mesmo ponto.
 *
 * O degrau de 250 para 255 é de cinco níveis, abaixo do que o olho separa, e
 * não desenha borda. O que ele faz é dar ao codificador uma área de cor
 * constante, que é o que ele comprime sem inventar bloco.
 */
const NEVOA = 250;

/**
 * Folga em volta do equipamento, depois do corte, como fração do lado da caixa.
 *
 * A rampa clareia o halo mas não o apaga: o que sobra é uma névoa de 190–249
 * espalhada pelo quadro, e num palco de 692px sobre cartão branco ela reaparece
 * como o mesmo X. Medido na imagem servida ao navegador: 23% do anel externo
 * fora do branco.
 *
 * O X mora nas bordas do quadro; o equipamento não. Cortar na caixa dele mais
 * uma folga tira a maior parte do rastro e ainda melhora o enquadramento — numa
 * lista de produto, equipamento maior no quadro é melhor. O que fica é a sombra
 * colada na silhueta, que o olho lê como sombra.
 */
const MARGEM = 0.06;

/** Piso para considerar um pixel "equipamento" ao medir a caixa. Abaixo de 200
    é corpo; o fantasma do recorte começa em 181, mas em ilhas pequenas, e o
    mínimo de pixels por linha descarta esse ruído. */
const CORPO = 200;

/** Recortes em fundo branco. Fotografia de estúdio NÃO entra aqui. */
const RECORTES = [
  "aspirador.webp",
  "autoclave.webp",
  "bomba-vacuo.webp",
  "compressor.webp",
];

/**
 * Fotografia de estúdio, com fundo real.
 *
 * Não pode passar pela rampa acima: aqui não há fundo branco a recuperar — o
 * corpo do aparelho é branco e o fundo é cinza claríssimo, na mesma faixa de
 * luminância, e a rampa comeria os dois. O que essas fotos recebem é outra
 * coisa: um véu radial que dissolve a BORDA em branco. Sem ele, a foto entra na
 * moldura como um retângulo cinza colado num palco branco, e o recorte da
 * moldura aparece. Com ele, a peça continua com a sombra natural dela e a
 * imagem se funde ao cartão.
 */
const ESTUDIO = ["ultrassom.webp"];

const soConferir = process.argv.includes("--conferir");

const suave = (t) => t * t * (3 - 2 * t);
const luminancia = (d, i) => d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;

/* --------------------------------------------------------------- rampa */

for (const arquivo of RECORTES) {
  const origem = path.join(PASTA, arquivo);
  if (!fs.existsSync(origem)) {
    console.log(`${arquivo}  (não encontrado — pulado)`);
    continue;
  }

  /* Ler para um Buffer antes de entregar ao sharp: passando o caminho, ele
     mantém o descritor aberto e o Windows recusa a regravação com UNKNOWN. */
  const { data, info } = await sharp(fs.readFileSync(origem))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: L, height: A, channels: canais } = info;

  /* O canto tem fundo e halo, nunca equipamento — 12% do lado, nas quatro
     quinas. O pixel mais escuro dali é o piso do halo desta foto. */
  const margem = Math.round(L * 0.12);
  let minCanto = 255;
  for (const [x0, y0] of [
    [0, 0],
    [L - margem, 0],
    [0, A - margem],
    [L - margem, A - margem],
  ]) {
    for (let y = y0; y < y0 + margem; y += 1) {
      for (let x = x0; x < x0 + margem; x += 1) {
        const l = luminancia(data, (y * L + x) * canais);
        if (l < minCanto) minCanto = l;
      }
    }
  }

  const alto = Math.min(TETO, Math.max(PISO, Math.floor(minCanto) - 1));
  const baixo = alto - JANELA;

  let brancos = 0;
  let esmaecidos = 0;
  for (let i = 0; i < data.length; i += canais) {
    const l = luminancia(data, i);
    if (l >= alto) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) brancos += 1;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      continue;
    }
    if (l <= baixo) continue;
    const t = suave((l - baixo) / JANELA);
    const r = Math.round(data[i] + (255 - data[i]) * t);
    const v = Math.round(data[i + 1] + (255 - data[i + 1]) * t);
    const a = Math.round(data[i + 2] + (255 - data[i + 2]) * t);
    if (r * 0.299 + v * 0.587 + a * 0.114 >= NEVOA) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      brancos += 1;
      continue;
    }
    data[i] = r;
    data[i + 1] = v;
    data[i + 2] = a;
    esmaecidos += 1;
  }

  /* Caixa do equipamento: coluna e linha precisam de vários pixels de corpo
     para contar, senão uma ilha de fantasma alarga a caixa e o corte não corta
     nada. */
  const minimo = Math.max(4, Math.round(L * 0.006));
  const eCorpo = (x, y) => luminancia(data, (y * L + x) * canais) < CORPO;
  let x0 = L;
  let x1 = 0;
  let y0 = A;
  let y1 = 0;
  for (let x = 0; x < L; x += 1) {
    let n = 0;
    for (let y = 0; y < A; y += 1) if (eCorpo(x, y)) n += 1;
    if (n >= minimo) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
  }
  for (let y = 0; y < A; y += 1) {
    let n = 0;
    for (let x = 0; x < L; x += 1) if (eCorpo(x, y)) n += 1;
    if (n >= minimo) {
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }

  if (x1 <= x0 || y1 <= y0) {
    console.log(`${arquivo.padEnd(20)} RECUSADO — não achei o equipamento na foto`);
    continue;
  }

  const folga = Math.round(Math.max(x1 - x0, y1 - y0) * MARGEM);
  const cx0 = Math.max(0, x0 - folga);
  const cy0 = Math.max(0, y0 - folga);
  const cx1 = Math.min(L - 1, x1 + folga);
  const cy1 = Math.min(A - 1, y1 + folga);


  const total = L * A;
  const pct = (n) => ((n / total) * 100).toFixed(1) + "%";
  console.log(
    `${arquivo.padEnd(20)} ${L}x${A} → ${LADO}  rampa ${baixo}–${alto}` +
      `  · branco ${pct(brancos)}  · esmaecido ${pct(esmaecidos)}` +
      `  · corte ${cx1 - cx0 + 1}x${cy1 - cy0 + 1}`,
  );
  if (soConferir) continue;

  /* `.png()` no meio não é enfeite: `extract` sobre entrada crua devolve dados
     crus, e reabrir isso como imagem falha com "unsupported image format". */
  const cortado = await sharp(data, { raw: { width: L, height: A, channels: canais } })
    .extract({ left: cx0, top: cy0, width: cx1 - cx0 + 1, height: cy1 - cy0 + 1 })
    .png()
    .toBuffer();

  /* Um `.resize()` só. Encadear dois faz o sharp aplicar apenas o último — o
     corte saía 2200x2046 em vez de quadrado, e a moldura da ficha, que é
     `aspect-square`, passava a deixar tarja branca em cima e embaixo.
     `contain` com fundo branco escala e completa o quadrado de uma vez. */
  const saida = await sharp(cortado)
    .resize(LADO, LADO, { fit: "contain", background: "#ffffff", kernel: "lanczos3" })
    .sharpen({ sigma: 0.7 })
    .webp({ quality: 92, effort: 6 })
    .toBuffer();

  fs.writeFileSync(origem, saida);
}

/* ------------------------------------------------------------------ véu */

for (const arquivo of ESTUDIO) {
  const origem = path.join(PASTA, arquivo);
  if (!fs.existsSync(origem)) {
    console.log(`${arquivo}  (não encontrado — pulado)`);
    continue;
  }

  const bruto = fs.readFileSync(origem);
  const { width: L, height: A } = await sharp(bruto).metadata();

  /* O véu começa a 55% do raio: a peça ocupa o miolo, e nada dela é tocado.
     Daí para fora o branco entra até cobrir por completo na quina. */
  const veu = Buffer.from(
    `<svg width='${L}' height='${A}' xmlns='http://www.w3.org/2000/svg'>` +
      `<defs><radialGradient id='v' cx='50%' cy='52%' r='72%'>` +
      `<stop offset='55%' stop-color='#ffffff' stop-opacity='0'/>` +
      `<stop offset='78%' stop-color='#ffffff' stop-opacity='0.55'/>` +
      `<stop offset='100%' stop-color='#ffffff' stop-opacity='1'/>` +
      `</radialGradient></defs>` +
      `<rect width='${L}' height='${A}' fill='url(#v)'/></svg>`,
  );

  console.log(`${arquivo}  ${L}x${A}  véu radial aplicado`);
  if (soConferir) continue;

  const saida = await sharp(bruto)
    .composite([{ input: veu, blend: "over" }])
    .webp({ quality: 88, effort: 6 })
    .toBuffer();

  fs.writeFileSync(origem, saida);
}
