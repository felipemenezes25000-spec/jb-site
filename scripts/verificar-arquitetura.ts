import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Dívida existente vira teto, não licença para continuar crescendo.
 *
 * Estes arquivos já estavam grandes quando a regra entrou. Eles podem
 * diminuir, mas não podem aumentar um byte sequer sem antes serem divididos.
 * `admin-catalogo.ts` e `admin-vendas.ts` saíram da lista em 22/09/2026: foram
 * apagados com a loja, e o que era de assistência virou módulo próprio.
 */
const LEGADOS = new Map<string, number>([
  ["admin-servico.ts", 96_946],
  ["admin-conteudo.ts", 60_048],
]);

/**
 * A loja saiu do site em 22/09/2026: a JB passou a ser só assistência técnica.
 * Estes módulos foram apagados, e voltar a importar qualquer um deles é sinal
 * de que o comércio está entrando de novo pela porta dos fundos (um carrinho
 * "só para testar", um cálculo de frete copiado). Se a decisão mudar, ela muda
 * aqui, junto com o resto do plano, e não num import solto.
 */
const MODULOS_DA_LOJA = [
  "@/lib/carrinho",
  "@/lib/pedido",
  "@/lib/pagamento",
  "@/lib/frete",
  "@/lib/melhor-envio",
  "@/lib/catalogo",
  "@/lib/comercio/",
  "@/lib/marketplace/",
  "@/components/loja/",
  "@/app/acoes/carrinho",
  "@/app/acoes/checkout",
];

/** Novo Server Action acima disso precisa nascer dividido por caso de uso. */
const MAX_NOVO_ACTION_BYTES = 50_000;
const raiz = process.cwd();
const diretorioAcoes = join(raiz, "src", "app", "acoes");
const diretorioSrc = join(raiz, "src");
const problemas: string[] = [];

function arquivosTs(diretorio: string): string[] {
  return readdirSync(diretorio, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(diretorio, entrada.name);
    if (entrada.isDirectory()) return arquivosTs(caminho);
    return entrada.isFile() && /\.[cm]?[tj]sx?$/.test(entrada.name) ? [caminho] : [];
  });
}

for (const caminho of arquivosTs(diretorioAcoes)) {
  const relativo = relative(diretorioAcoes, caminho).split(sep).join("/");
  /* O peso é do conteúdo, não do checkout.

     `statSync().size` conta o arquivo como ele está no disco, e no Windows o
     Git entrega CRLF — um byte a mais por linha. `admin-servico.ts` tem 2.886
     linhas, então o mesmo commit que passa na CI (Linux, LF) reprovava aqui
     acusando exatamente 2.886 bytes de "crescimento". Os tetos de `LEGADOS`
     foram medidos em LF; a comparação precisa ser na mesma unidade, senão o
     portão reprova trabalho correto por causa da plataforma de quem rodou. */
  const bytes = Buffer.byteLength(readFileSync(caminho, "utf8").replace(/\r\n/g, "\n"), "utf8");
  const tetoLegado = !relativo.includes("/") ? LEGADOS.get(relativo) : undefined;

  if (tetoLegado !== undefined) {
    if (bytes > tetoLegado) {
      problemas.push(
        `${relativo} cresceu de ${tetoLegado} para ${bytes} bytes. Extraia o novo caso de uso para um módulo menor.`,
      );
    }
    continue;
  }

  if (bytes > MAX_NOVO_ACTION_BYTES) {
    problemas.push(
      `${relativo} tem ${bytes} bytes. O teto para novos arquivos de Server Actions é ${MAX_NOVO_ACTION_BYTES}.`,
    );
  }
}

for (const caminho of arquivosTs(diretorioSrc)) {
  const relativo = relative(raiz, caminho).split(sep).join("/");
  const conteudo = readFileSync(caminho, "utf8");

  for (const modulo of MODULOS_DA_LOJA) {
    if (conteudo.includes(`"${modulo}`)) {
      problemas.push(
        `${relativo} importa ${modulo}, que saiu com a loja. O site agora é só assistência técnica.`,
      );
    }
  }
}

if (problemas.length) {
  console.error("Limites arquiteturais violados:\n" + problemas.map((p) => `- ${p}`).join("\n"));
  process.exit(1);
}

console.log(
  "[arquitetura] OK: dívida legada congelada e nenhum módulo da loja de volta.",
);
