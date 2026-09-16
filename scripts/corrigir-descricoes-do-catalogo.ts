import { PrismaClient } from "@prisma/client";

/* ============================================================================
   Tira da descrição o bullet que só repete a ficha

   O bloco "Por que este modelo", na ficha de produto, é a descrição cadastrada.
   Ele deveria dizer o que a ficha técnica NÃO diz — e dizia, em quase tudo:
   "Radiômetro na base para conferir a potência real", "Sem óleo: ar seco
   direto na peça de mão", "Compatível com os principais softwares de clínica".

   Menos um. Medido em quatro fichas, sempre o mesmo e só ele:

     · bloco "Por que este modelo":  "12 meses de garantia de fábrica"
     · destaques, 3 cm abaixo:       "Garantia   12 meses"

   Os dois saem do MESMO campo do cadastro: o seeder escrevia a garantia como
   bullet e, doze linhas depois, como `warrantyMonths` — a coluna estruturada
   que a ficha lê. O seeder já não faz mais isso, mas seed só alcança banco
   novo. Este script alcança os que já existem.

   A regra de remoção é estreita de propósito, porque aqui se apaga texto que
   alguém pode ter escrito à mão:

     1. o produto precisa ter `warrantyMonths` preenchido — sem ele não há
        ficha repetindo coisa nenhuma;
     2. o bullet precisa COMEÇAR com aquele mesmo número de meses seguido de
        "de garantia";
     3. e precisa ser curto (até 60 caracteres), porque um bullet longo que
        começa com a garantia provavelmente continua com outra coisa.

   Assim "12 meses de garantia de fábrica" sai, e "Garantia estendida de 24
   meses, opcional" fica — número diferente do da coluna. Sem `--aplicar` o
   script só mostra o que faria.

   Uso: `pnpm catalogo:descricoes` · `pnpm catalogo:descricoes --aplicar`
   ============================================================================ */

const prisma = new PrismaClient();
const aplicar = process.argv.includes("--aplicar");

/** Até onde um bullet ainda é "só a garantia" e não uma frase com mais coisa. */
const TAMANHO_MAXIMO = 60;

function semTags(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** O bullet é o eco da coluna `warrantyMonths` deste produto? */
export function ecoDaGarantia(bulletHtml: string, meses: number): boolean {
  if (meses <= 0) return false;
  const texto = semTags(bulletHtml);
  if (texto.length === 0 || texto.length > TAMANHO_MAXIMO) return false;

  const casa = texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .match(/^(\d+)\s*(meses|mes)\s+de\s+garantia\b/);

  return Boolean(casa) && Number(casa![1]) === meses;
}

async function main() {
  const produtos = await prisma.product.findMany({
    where: { description: { contains: "<li>" } },
    select: { id: true, slug: true, description: true, warrantyMonths: true },
  });

  let mexidos = 0;

  for (const produto of produtos) {
    const meses = produto.warrantyMonths ?? 0;
    if (meses <= 0) continue;

    const removidos: string[] = [];
    const nova = produto.description.replace(
      /<li\b[^>]*>([\s\S]*?)<\/li>/gi,
      (inteiro, miolo: string) => {
        if (!ecoDaGarantia(miolo, meses)) return inteiro;
        removidos.push(semTags(miolo));
        return "";
      },
    );

    if (removidos.length === 0) continue;

    mexidos += 1;
    console.log(
      `${aplicar ? "✓" : "·"} ${produto.slug}: ${removidos
        .map((t) => `"${t}"`)
        .join(", ")} — a ficha já diz "Garantia ${meses} meses"`,
    );

    if (aplicar) {
      await prisma.product.update({ where: { id: produto.id }, data: { description: nova } });
    }
  }

  console.log(
    `\n[catalogo/descricoes] ${mexidos} produto(s) com bullet repetido${
      aplicar ? " — corrigidos." : ". Rode com --aplicar para corrigir."
    }`,
  );
}

main()
  .catch((erro) => {
    console.error("[catalogo/descricoes] falhou:", erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
