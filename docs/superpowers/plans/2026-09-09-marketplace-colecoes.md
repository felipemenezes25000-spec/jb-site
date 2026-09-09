# Marketplace JB Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as listagens públicas da JB por um marketplace clínico compacto, técnico e orientado à conversão sem alterar a home.

**Architecture:** A implementação cria um contrato de dados e componentes exclusivos em `components/loja/marketplace`, preservando `CardVitrine`, `CardProduto` e as vitrines da home. `Vitrine` continua sendo o servidor coordenador de facetas, paginação e Suspense, mas passa a renderizar um shell de coleção sem sidebar permanente e uma grade própria de quatro colunas.

**Tech Stack:** Next.js 16 App Router, React 19 Server/Client Components, TypeScript, Prisma 6, Tailwind CSS 4, CSS Modules, Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-09-09-marketplace-clinico-design.md`

## Global Constraints

- A home e suas vitrines não podem sofrer mudança visual ou funcional.
- O escopo desta etapa é `/loja`, `/categoria/[slug]`, `/busca`, `/marcas/[slug]` e páginas públicas de condição.
- Não alterar preço, estoque, frete, garantia, serviços, carrinho, checkout ou orçamento.
- Não criar avaliações, escassez, descontos ou benefícios ausentes do banco.
- Manter filtros serializados na URL e preservar paginação, SEO e Suspense.
- Em 1440 px, a grade deve exibir quatro colunas; em 320 px, uma coluna.
- Controles interativos devem ter foco visível, nome acessível e alvo mínimo de 44 × 44 px.
- Usar Manrope e os tokens existentes; vermelho `#E0141B` somente como sinal de ação, desconto real ou seleção.
- Não adicionar biblioteca de carrossel, animação ou estado global.

## File Structure

### Novos arquivos

- `src/lib/marketplace/destaques-card.ts` — seleciona atributos técnicos curtos e verdadeiros para listagens.
- `src/components/loja/marketplace/tipos.ts` — contrato do card exclusivo do marketplace.
- `src/components/loja/marketplace/card-produto-marketplace.tsx` — card compacto de compra/comparação.
- `src/components/loja/marketplace/grade-marketplace.tsx` — grade responsiva e esqueleto geométrico correspondente.
- `src/components/loja/marketplace/cabecalho-colecao.tsx` — breadcrumb, título, contagem contextual e atalhos.
- `src/components/loja/marketplace/controles-colecao.tsx` — filtros promovidos, busca, ordenação, filtros ativos e diálogo completo.
- `src/components/loja/marketplace/marketplace.module.css` — grid, densidade e breakpoints isolados da home.
- `tests/unitarios/marketplace-destaques.test.ts` — regras puras dos atributos técnicos.
- `tests/e2e/12-marketplace-colecoes.spec.ts` — geometria, responsividade, rotas e isolamento da home.

### Arquivos modificados

- `src/lib/catalogo.ts` — seleção e consulta paralelas para cards do marketplace.
- `src/lib/busca/universal.ts` — resultados de produto passam a usar o contrato novo.
- `src/components/loja/filtros-catalogo.tsx` — mantém o conteúdo de filtros e expõe callbacks para navegação/medição.
- `src/components/loja/vitrine.tsx` — remove sidebar/falso card de orçamento e adota os novos componentes.
- `src/app/(vitrine)/loja/page.tsx` — cabeçalho comercial passa ao componente compartilhado.
- `src/app/(vitrine)/seminovos/page.tsx` — usa a mesma anatomia, mantendo fatos reais da revisão.
- `src/app/(vitrine)/busca/page.tsx` — grupo de produtos usa o card novo; grupos técnicos permanecem.
- `src/app/(vitrine)/categoria/[slug]/page.tsx` — passa contexto de coleção ao novo shell.
- `src/app/(loja)/marcas/[slug]/page.tsx` — compacta logo/descrição e preserva marcas relacionadas.
- `tests/e2e/02-catalogo.spec.ts` — atualiza o contrato do painel de filtros sob demanda.

---

### Task 1: Contrato de dados e destaques técnicos

**Files:**
- Create: `src/lib/marketplace/destaques-card.ts`
- Create: `src/components/loja/marketplace/tipos.ts`
- Create: `tests/unitarios/marketplace-destaques.test.ts`
- Modify: `src/lib/catalogo.ts:9-49, 235-262`
- Modify: `src/lib/busca/universal.ts:3-8, 24-30, 75-84`

**Interfaces:**
- Produces: `DestaqueTecnico`, `destaquesDoCard(entrada, limite)`, `ProdutoMarketplaceCard`, `SELECAO_CARD_MARKETPLACE`, `paraCardMarketplace(produto)` e `buscarProdutosMarketplace(opcoes)`.
- Consumes: campos reais de `Product`, `ProductSpec`, `Brand`, `Category` e a função atual `paraCard`.

- [ ] **Step 1: Escrever o teste unitário que fixa seleção, prioridade e ausência de invenção**

```ts
import { describe, expect, it } from "vitest";

import { destaquesDoCard } from "@/lib/marketplace/destaques-card";

describe("destaquesDoCard", () => {
  it("prioriza atributos técnicos de decisão e limita a dois", () => {
    expect(
      destaquesDoCard({
        specs: [
          { label: "Cor", value: "Branco", order: 0 },
          { label: "Torque", value: "35 N·cm", order: 1 },
          { label: "Rotação", value: "2.000 rpm", order: 2 },
        ],
        voltage: "220",
        warrantyMonths: 12,
      }),
    ).toEqual([
      { rotulo: "Torque", valor: "35 N·cm" },
      { rotulo: "Rotação", valor: "2.000 rpm" },
    ]);
  });

  it("usa voltagem e garantia apenas como alternativas cadastradas", () => {
    expect(
      destaquesDoCard({ specs: [], voltage: "bivolt", warrantyMonths: 6 }),
    ).toEqual([
      { rotulo: "Voltagem", valor: "Bivolt" },
      { rotulo: "Garantia", valor: "6 meses" },
    ]);
  });

  it("remove vazios e não cria atributo ausente", () => {
    expect(
      destaquesDoCard({
        specs: [{ label: "Torque", value: "  ", order: 0 }],
        voltage: null,
        warrantyMonths: null,
      }),
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha pela ausência do módulo**

Run: `pnpm exec vitest run tests/unitarios/marketplace-destaques.test.ts`

Expected: FAIL com resolução ausente para `@/lib/marketplace/destaques-card`.

- [ ] **Step 3: Implementar a seleção pura de destaques**

```ts
export type DestaqueTecnico = { rotulo: string; valor: string };

type EspecificacaoCurta = {
  label: string;
  value: string;
  order: number;
};

type Entrada = {
  specs: EspecificacaoCurta[];
  voltage: string | null;
  warrantyMonths: number | null;
};

const PRIORIDADES = [
  /torque/,
  /capacidade|volume|litros/,
  /rotacao|rpm|velocidade/,
  /potencia/,
  /pressao/,
  /tensao|voltagem/,
  /compatibilidade/,
];

function chave(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function prioridade(rotulo: string) {
  const normalizado = chave(rotulo);
  const indice = PRIORIDADES.findIndex((padrao) => padrao.test(normalizado));
  return indice < 0 ? PRIORIDADES.length : indice;
}

export function destaquesDoCard(entrada: Entrada, limite = 2): DestaqueTecnico[] {
  const encontrados = entrada.specs
    .filter((item) => item.label.trim() && item.value.trim())
    .sort((a, b) => prioridade(a.label) - prioridade(b.label) || a.order - b.order)
    .map((item) => ({ rotulo: item.label.trim(), valor: item.value.trim() }));

  if (entrada.voltage?.trim()) {
    const valor = entrada.voltage.toLowerCase() === "bivolt" ? "Bivolt" : `${entrada.voltage} V`;
    if (!encontrados.some((item) => /tensao|voltagem/.test(chave(item.rotulo)))) {
      encontrados.push({ rotulo: "Voltagem", valor });
    }
  }

  if ((entrada.warrantyMonths ?? 0) > 0) {
    const meses = entrada.warrantyMonths!;
    encontrados.push({ rotulo: "Garantia", valor: `${meses} ${meses === 1 ? "mês" : "meses"}` });
  }

  const vistos = new Set<string>();
  return encontrados
    .filter((item) => {
      const id = `${chave(item.rotulo)}:${chave(item.valor)}`;
      if (vistos.has(id)) return false;
      vistos.add(id);
      return true;
    })
    .slice(0, Math.max(0, limite));
}
```

- [ ] **Step 4: Criar o contrato do card sem importar componentes da home**

```ts
import type { DestaqueTecnico } from "@/lib/marketplace/destaques-card";

export type ProdutoMarketplaceCard = {
  slug: string;
  name: string;
  model: string;
  condition: "novo" | "seminovo" | "usado" | "recondicionado";
  priceCents: number;
  compareAtCents: number | null;
  allowDirectPurchase: boolean;
  trackInventory: boolean;
  stock: number;
  unique: boolean;
  brandName: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  imageAlt: string;
  destaques: DestaqueTecnico[];
};

export type ParcelamentoMarketplace = { max: number; minimoCents: number };
```

- [ ] **Step 5: Adicionar uma consulta paralela em `catalogo.ts`, preservando `SELECAO_CARD`**

```ts
export const SELECAO_CARD_MARKETPLACE = {
  ...SELECAO_CARD,
  voltage: true,
  warrantyMonths: true,
  category: { select: { name: true } },
  specs: {
    orderBy: { order: "asc" as const },
    take: 6,
    select: { label: true, value: true, order: true },
  },
} satisfies Prisma.ProductSelect;

type LinhaMarketplace = Prisma.ProductGetPayload<{
  select: typeof SELECAO_CARD_MARKETPLACE;
}>;

export function paraCardMarketplace(produto: LinhaMarketplace): ProdutoMarketplaceCard {
  return {
    ...paraCard(produto),
    categoryName: produto.category?.name ?? null,
    destaques: destaquesDoCard({
      specs: produto.specs,
      voltage: produto.voltage,
      warrantyMonths: produto.warrantyMonths,
    }),
  };
}

export async function buscarProdutosMarketplace(opcoes: {
  filtros?: FiltrosCatalogo;
  ordem?: Ordenacao;
  pagina?: number;
  porPagina?: number;
}) {
  const porPagina = opcoes.porPagina ?? 24;
  const pagina = Math.max(1, opcoes.pagina ?? 1);
  const where = montarFiltro(opcoes.filtros ?? {});
  const [linhas, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: ordenar(opcoes.ordem),
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: SELECAO_CARD_MARKETPLACE,
    }),
    prisma.product.count({ where }),
  ]);
  return {
    produtos: linhas.map(paraCardMarketplace),
    total,
    pagina,
    porPagina,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}
```

Atualizar `buscarTudo` para selecionar `SELECAO_CARD_MARKETPLACE`, mapear com `paraCardMarketplace` e declarar `AchadoDeProduto = ProdutoMarketplaceCard`. Não modificar `produtosEmDestaque`, `produtosPorCondicao`, `CardVitrine` ou `CardProduto`.

- [ ] **Step 6: Rodar unidade, tipos e lint dos arquivos tocados**

Run: `pnpm exec vitest run tests/unitarios/marketplace-destaques.test.ts`

Expected: PASS, 3 testes.

Run: `pnpm typecheck`

Expected: exit 0.

Run: `pnpm exec eslint src/lib/marketplace/destaques-card.ts src/components/loja/marketplace/tipos.ts src/lib/catalogo.ts src/lib/busca/universal.ts tests/unitarios/marketplace-destaques.test.ts`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/marketplace/destaques-card.ts src/components/loja/marketplace/tipos.ts src/lib/catalogo.ts src/lib/busca/universal.ts tests/unitarios/marketplace-destaques.test.ts
git commit -m "feat(catalogo): prepara dados tecnicos do marketplace"
```

---

### Task 2: Card e grade exclusivos do marketplace

**Files:**
- Create: `src/components/loja/marketplace/card-produto-marketplace.tsx`
- Create: `src/components/loja/marketplace/grade-marketplace.tsx`
- Create: `src/components/loja/marketplace/marketplace.module.css`
- Create: `tests/e2e/12-marketplace-colecoes.spec.ts`

**Interfaces:**
- Consumes: `ProdutoMarketplaceCard`, `ParcelamentoMarketplace`, `calcularParcelas`, `formatarPreco` e `BotaoComparar`.
- Produces: `CardProdutoMarketplace`, `GradeMarketplace` e `EsqueletoGradeMarketplace`.

- [ ] **Step 1: Escrever o teste de geometria antes dos componentes**

```ts
import { expect, test } from "@playwright/test";

test.describe("Marketplace — coleções", () => {
  test("usa quatro colunas no desktop e duas no celular de 390 px", async ({ page }) => {
    await page.goto("/loja");
    const grade = page.locator("[data-grade-marketplace]").first();
    await expect(grade).toBeVisible();

    expect(
      await grade.evaluate((elemento) =>
        getComputedStyle(elemento).gridTemplateColumns.split(" ").filter(Boolean).length,
      ),
    ).toBe(4);

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await grade.evaluate((elemento) =>
        getComputedStyle(elemento).gridTemplateColumns.split(" ").filter(Boolean).length,
      ),
    ).toBe(2);
  });

  test("não injeta o marketplace na home", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-marketplace-shell]")).toHaveCount(0);
    await expect(page.locator("[data-grade-marketplace]")).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que os seletores ainda não existem**

Run: `pnpm exec playwright test tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: FAIL em `[data-grade-marketplace]` na rota `/loja`.

- [ ] **Step 3: Implementar o CSS Module com breakpoints exatos**

```css
.shell {
  --marketplace-gap: clamp(0.75rem, 1.25vw, 1.25rem);
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--marketplace-gap);
}

.card {
  min-width: 0;
  border: 1px solid var(--color-graf-200);
  border-radius: 10px;
  background: white;
}

@media (min-width: 375px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (min-width: 1440px) {
  .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (prefers-reduced-motion: reduce) {
  .shell *, .shell *::before, .shell *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Implementar `CardProdutoMarketplace` com uma única ação visual**

O componente deve calcular orçamento, parcelas, desconto e disponibilidade com as mesmas regras atuais. O link de produto usa a sobreposição do card; o botão de comparação fica acima dela com `relative z-10`.

```tsx
const CONDICAO: Record<ProdutoMarketplaceCard["condition"], string> = {
  novo: "Novo",
  seminovo: "Seminovo JB",
  usado: "Usado",
  recondicionado: "Recondicionado JB",
};

export function CardProdutoMarketplace({
  produto,
  parcelamento,
  prioridade,
}: {
  produto: ProdutoMarketplaceCard;
  parcelamento: ParcelamentoMarketplace;
  prioridade?: boolean;
}) {
  const indisponivel = produto.trackInventory && produto.stock <= 0;
  const sobOrcamento = !produto.allowDirectPurchase || produto.priceCents <= 0;
  const parcelas = sobOrcamento
    ? null
    : calcularParcelas(produto.priceCents, parcelamento.max, parcelamento.minimoCents);
  const anterior =
    !sobOrcamento && produto.compareAtCents && produto.compareAtCents > produto.priceCents
      ? produto.compareAtCents
      : null;
  const desconto = anterior
    ? Math.round(((anterior - produto.priceCents) / anterior) * 100)
    : 0;

  return (
    <article data-marketplace-card className={`${styles.card} group relative flex flex-col overflow-hidden`}>
      <div className="relative aspect-[4/3] border-b border-graf-100 bg-white">
        {produto.imageUrl ? (
          <Image
            src={produto.imageUrl}
            alt={produto.imageAlt || produto.name}
            fill
            preload={prioridade}
            sizes="(max-width:374px) 94vw, (max-width:1023px) 46vw, (max-width:1439px) 31vw, 24vw"
            className="object-contain p-3 transition-transform duration-200 group-hover:scale-[1.025] motion-reduce:transform-none"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm font-semibold text-graf-500">
            Foto em cadastro
          </div>
        )}
        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <span className="rounded-md border border-graf-200 bg-white px-2 py-1 text-xs font-bold text-graf-700">
            {CONDICAO[produto.condition]}
          </span>
          <BotaoComparar slug={produto.slug} nome={produto.name} />
        </div>
        {desconto >= 5 ? (
          <span className="absolute bottom-3 left-3 rounded-md bg-jb-500 px-2 py-1 text-xs font-bold text-white">
            −{desconto}%
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="truncate text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-graf-500">
          {produto.brandName || produto.categoryName || "Equipamento odontológico"}
        </p>
        <h2 className="mt-1.5 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-graf-950 sm:text-[0.9375rem]">
          <Link href={`/loja/${produto.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {produto.name}
          </Link>
        </h2>
        {produto.destaques.length ? (
          <dl className="mt-3 grid gap-1.5 border-t border-graf-100 pt-3">
            {produto.destaques.map((item) => (
              <div key={`${item.rotulo}-${item.valor}`} className="flex min-w-0 justify-between gap-2 text-xs">
                <dt className="truncate text-graf-500">{item.rotulo}</dt>
                <dd className="truncate font-semibold text-graf-800">{item.valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="mt-auto pt-4">
          {anterior ? <p className="text-xs text-graf-500 line-through">{formatarPreco(anterior)}</p> : null}
          <p className="tabular text-xl font-extrabold leading-7 text-graf-950 sm:text-2xl">
            {sobOrcamento ? "Sob orçamento" : formatarPreco(produto.priceCents)}
          </p>
          <p className="min-h-5 truncate text-xs text-graf-500">
            {parcelas ? `${parcelas.parcelas}× de ${formatarPreco(parcelas.valorCents)} sem juros` : "Preço e prazo com a equipe JB"}
          </p>
          <div className="mt-3 flex min-h-5 items-center gap-1.5 text-xs font-semibold text-graf-700">
            <span className={`size-1.5 rounded-full ${indisponivel ? "bg-graf-400" : "bg-ok-500"}`} aria-hidden />
            {indisponivel ? (produto.unique ? "Unidade vendida" : "Indisponível") : produto.unique ? "Unidade única" : "Disponível"}
          </div>
          <span aria-hidden className={`mt-3 flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-bold ${indisponivel ? "bg-graf-200 text-graf-700" : "bg-jb-500 text-white group-hover:bg-jb-600"}`}>
            {sobOrcamento ? "Pedir orçamento" : "Ver equipamento"}
          </span>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Implementar grade e esqueleto com a mesma geometria**

```tsx
type PropsGradeMarketplace = {
  produtos: ProdutoMarketplaceCard[];
  parcelamento: ParcelamentoMarketplace;
};

export function GradeMarketplace({ produtos, parcelamento }: PropsGradeMarketplace) {
  return (
    <ul data-grade-marketplace className={styles.grid}>
      {produtos.map((produto, indice) => (
        <li key={produto.slug} className="flex min-w-0">
          <CardProdutoMarketplace
            produto={produto}
            parcelamento={parcelamento}
            prioridade={indice < 4}
          />
        </li>
      ))}
    </ul>
  );
}

export function EsqueletoGradeMarketplace() {
  return (
    <ul aria-hidden className={styles.grid}>
      {Array.from({ length: 8 }, (_, indice) => (
        <li key={indice} className={`${styles.card} min-h-[25rem] animate-pulse bg-graf-50`} />
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Ligar temporariamente a grade em `Resultados` para tornar o teste verde**

Trocar as ramificações `GradeVitrine`/`GradeProdutos` por `GradeMarketplace`, mantendo paginação e estados vazios. Não alterar os dois cards legados.

- [ ] **Step 7: Rodar os testes do card, tipos e lint**

Run: `pnpm exec playwright test tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: os dois testes passam.

Run: `pnpm typecheck`

Expected: exit 0.

Run: `pnpm exec eslint src/components/loja/marketplace src/components/loja/vitrine.tsx tests/e2e/12-marketplace-colecoes.spec.ts`

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/loja/marketplace src/components/loja/vitrine.tsx tests/e2e/12-marketplace-colecoes.spec.ts
git commit -m "feat(catalogo): cria grade compacta do marketplace"
```

---

### Task 3: Filtros promovidos e painel sob demanda

**Files:**
- Create: `src/components/loja/marketplace/controles-colecao.tsx`
- Modify: `src/components/loja/filtros-catalogo.tsx:268-756`
- Modify: `src/components/loja/vitrine.tsx:574-838`
- Modify: `tests/e2e/02-catalogo.spec.ts:45-142`
- Modify: `tests/e2e/12-marketplace-colecoes.spec.ts`

**Interfaces:**
- Consumes: `GruposFiltro`, `ParametrosCatalogo`, `ConteudoFiltros`, travas da coleção e helpers de endereço.
- Produces: `ControlesColecao` com `aria-label="Controles do catálogo"` e diálogo `aria-label="Filtros do catálogo"` em qualquer breakpoint.

- [ ] **Step 1: Alterar o E2E para exigir painel sob demanda e resumo aplicado**

```ts
test("abre filtros, grava a escolha na URL e mostra o resumo aplicado", async ({ page }) => {
  await page.goto("/loja");
  const abrir = page.getByRole("button", { name: /Todos os filtros/ });
  await abrir.click();

  const dialogo = page.getByRole("dialog", { name: "Filtros do catálogo" });
  await expect(dialogo).toBeVisible();
  const opcao = dialogo.getByRole("link", { name: /^Filtrar por Categoria: / }).first();
  const rotulo = (await opcao.getAttribute("aria-label"))!.replace("Filtrar por Categoria: ", "");
  await opcao.click();

  await page.waitForURL(/categoria=/);
  await expect(page.getByRole("link", { name: `Remover filtro Categoria: ${rotulo}` }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Limpar tudo" }).first()).toBeVisible();
});

test("o diálogo devolve o foco ao botão ao fechar com Escape", async ({ page }) => {
  await page.goto("/loja");
  const abrir = page.getByRole("button", { name: /Todos os filtros/ });
  await abrir.click();
  await page.keyboard.press("Escape");
  await expect(abrir).toBeFocused();
});
```

- [ ] **Step 2: Rodar os dois testes e confirmar a falha no desktop**

Run: `pnpm exec playwright test tests/e2e/02-catalogo.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: FAIL porque o desktop ainda usa `aside` e o botão está oculto em `lg`.

- [ ] **Step 3: Preservar `ConteudoFiltros` e expor o contrato necessário**

Em `filtros-catalogo.tsx`, exportar `Travas`, `ORDENS`, `alternado`, `filtrosAplicados`, `enderecoCom`, `textoDe` e `ConteudoFiltros`. Adicionar `onNavigate?: () => void` a `ConteudoFiltros`; chamar o callback quando o alvo do clique for um link sem impedir a navegação do `Link`. Os grupos, rótulos, contagens e a validação de preço permanecem diretamente dentro do mesmo JSX que já existe.

```tsx
export type Travas = {
  travarCategoria?: boolean;
  travarCondicao?: boolean;
  travarMarca?: boolean;
};

type PropsConteudoFiltros = {
  grupos: GruposFiltro;
  parametros: ParametrosCatalogo;
  onNavigate?: () => void;
} & Travas;

function avisarNavegacao(
  evento: React.MouseEvent<HTMLDivElement>,
  onNavigate?: () => void,
) {
  if ((evento.target as HTMLElement).closest("a[href]")) onNavigate?.();
}
```

Usar `onClick={(evento) => avisarNavegacao(evento, onNavigate)}` no `<div className="space-y-6">` já existente de `ConteudoFiltros`.

- [ ] **Step 4: Implementar `ControlesColecao`**

O componente deve:

- promover estoque, até duas condições, até duas marcas e voltagens disponíveis;
- usar links verdadeiros gerados por `enderecoCom`;
- manter busca e ordenação;
- exibir todos os filtros aplicados;
- abrir o mesmo diálogo em desktop e mobile;
- usar `useDialogo` para foco, Escape e bloqueio de fundo;
- fechar ao navegar e manter o botão de abertura montado.

```tsx
type PropsControlesColecao = {
  grupos: GruposFiltro;
  parametros: ParametrosCatalogo;
} & Travas;

export function ControlesColecao({ grupos, parametros, ...travas }: PropsControlesColecao) {
  const caminho = usePathname();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => {
    setAberto(false);
    requestAnimationFrame(() => botaoRef.current?.focus());
  }, []);
  const dialogo = useDialogo(aberto, fechar);
  const aplicados = filtrosAplicados(parametros, grupos);
  const busca = textoDe(parametros, "q");
  const ativos = aplicados.length + (busca ? 1 : 0);
  const promovidos = [
    { chave: "estoque", valor: "1", rotulo: "Em estoque" },
    ...(!travas.travarCondicao
      ? grupos.condicoes.slice(0, 2).map((item) => ({ chave: "condicao", ...item }))
      : []),
    ...(!travas.travarMarca
      ? grupos.marcas.slice(0, 2).map((item) => ({ chave: "marca", ...item }))
      : []),
    ...grupos.voltagens.slice(0, 2).map((item) => ({ chave: "voltagem", ...item })),
  ];

  return (
    <section aria-label="Controles do catálogo" className="border-y border-graf-200 bg-white">
      <div className="flex min-h-14 items-center gap-2 overflow-x-auto py-2">
        {promovidos.map((item) => (
          <Link
            key={`${item.chave}-${item.valor}`}
            href={enderecoCom(caminho, parametros, {
              [item.chave]: alternado(parametros, item.chave, item.valor),
              ...(item.chave === "estoque" ? { vendidos: null } : {}),
            })}
            className="min-h-11 shrink-0 rounded-md border border-graf-200 px-3 py-2.5 text-sm font-semibold"
          >
            {item.rotulo}
          </Link>
        ))}
        <button ref={botaoRef} type="button" onClick={() => setAberto(true)} aria-haspopup="dialog" aria-expanded={aberto} className={classesBotao("secundario", "md") }>
          <SlidersHorizontal className="size-4" aria-hidden />
          Todos os filtros{ativos ? ` (${ativos})` : ""}
        </button>
        <form
          role="search"
          onSubmit={(evento) => {
            evento.preventDefault();
            const termo = String(new FormData(evento.currentTarget).get("q") ?? "").trim();
            router.push(enderecoCom(caminho, parametros, { q: termo || null }), { scroll: false });
          }}
          className="ml-auto min-w-56 flex-1 lg:max-w-sm"
        >
          <input name="q" type="search" defaultValue={busca} aria-label="Buscar nesta coleção" className="h-11 w-full rounded-md border border-graf-450 px-3" />
        </form>
        <select
          value={textoDe(parametros, "ordem") || "relevancia"}
          onChange={(evento) => router.push(enderecoCom(caminho, parametros, {
            ordem: evento.currentTarget.value === "relevancia" ? null : evento.currentTarget.value,
          }), { scroll: false })}
          aria-label="Ordenar resultados"
          className="h-11 rounded-md border border-graf-450 bg-white px-3"
        >
          {ORDENS.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
        </select>
      </div>

      {aplicados.length || busca ? (
        <FiltrosAtivos hrefLimpar={caminho} className="pb-3">
          {busca ? <Chip campo="Busca" rotulo={busca} tom="marca" href={enderecoCom(caminho, parametros, { q: null })} /> : null}
          {aplicados.map((ficha) => (
            <Chip
              key={`${ficha.chave}-${ficha.valor ?? ficha.rotulo}`}
              campo={ficha.campo}
              rotulo={ficha.rotulo}
              href={enderecoCom(caminho, parametros, {
                [ficha.chave]: ficha.valor ? alternado(parametros, ficha.chave, ficha.valor) : null,
              })}
            />
          ))}
        </FiltrosAtivos>
      ) : null}

      {aberto ? (
        <div className="fixed inset-0 z-70">
          <button type="button" aria-label="Fechar filtros" onClick={fechar} className="absolute inset-0 size-full bg-graf-950/50" />
          <div ref={dialogo} role="dialog" aria-modal="true" aria-label="Filtros do catálogo" tabIndex={-1} className="absolute inset-y-0 right-0 flex w-[min(28rem,94vw)] flex-col bg-white shadow-pop">
            <header className="flex min-h-16 items-center justify-between border-b border-graf-200 px-5">
              <h2 className="text-lg font-bold text-graf-950">Filtrar equipamentos</h2>
              <button type="button" onClick={fechar} aria-label="Fechar filtros" className="flex size-11 items-center justify-center rounded-md"><X aria-hidden /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-5">
              <ConteudoFiltros grupos={grupos} parametros={parametros} onNavigate={fechar} {...travas} />
            </div>
            <footer className="border-t border-graf-200 p-4">
              <Botao onClick={fechar} larguraTotal>Ver resultados</Botao>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5: Remover o `aside` e ligar os controles acima de `Resultados`**

```tsx
<div data-marketplace-shell className={`${styles.shell} container-jb max-w-[112rem] pb-10 lg:pb-14`}>
  <CabecalhoColecao
    titulo={titulo}
    descricao={descricao}
    trilha={trilha}
    imagem={imagem}
    atalhos={atalhos}
    rotuloAtalhos={rotuloAtalhos}
  />
  <ControlesColecao grupos={grupos} parametros={parametros} {...travas} />
  <Suspense key={chave} fallback={<EsqueletoGradeMarketplace />}>
    <Resultados
      consulta={consulta}
      parcelamento={parcelamento}
      busca={busca}
      temFiltro={temFiltro}
      caminho={caminho}
      endereco={enderecoPrimeiraPagina}
      pagina={pagina}
    />
  </Suspense>
</div>
```

Eliminar a coluna `17rem`, `PainelFiltros` e `apoioNoFiltro` do layout. O apoio comercial será movido para uma faixa curta após os resultados na Task 4.

- [ ] **Step 6: Rodar E2E, unidade, tipos e lint**

Run: `pnpm exec playwright test tests/e2e/02-catalogo.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: PASS.

Run: `pnpm test:unit && pnpm typecheck && pnpm lint`

Expected: todos com exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/loja/filtros-catalogo.tsx src/components/loja/marketplace/controles-colecao.tsx src/components/loja/vitrine.tsx tests/e2e/02-catalogo.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts
git commit -m "feat(catalogo): concentra filtros em painel moderno"
```

---

### Task 4: Cabeçalho compacto, resultados e chamada comercial

**Files:**
- Create: `src/components/loja/marketplace/cabecalho-colecao.tsx`
- Modify: `src/components/loja/vitrine.tsx:294-574, 729-838`
- Modify: `src/app/(vitrine)/loja/page.tsx:96-226`
- Modify: `src/app/(vitrine)/seminovos/page.tsx:224-380`
- Modify: `src/app/(vitrine)/categoria/[slug]/page.tsx:54-124`
- Modify: `src/app/(loja)/marcas/[slug]/page.tsx:88-176`
- Modify: `tests/e2e/12-marketplace-colecoes.spec.ts`

**Interfaces:**
- Consumes: `Migalha`, `Atalho`, título, descrição, imagem opcional e contagem resolvida pelo bloco de resultados.
- Produces: `CabecalhoColecao` e `FaixaOrcamentoColecao`.

- [ ] **Step 1: Escrever testes de densidade e coleção curta**

```ts
test("coloca o primeiro produto na primeira tela e não simula orçamento como card", async ({ page }) => {
  await page.goto("/loja");
  const primeiro = page.locator("[data-marketplace-card]").first();
  await expect(primeiro).toBeVisible();
  expect((await primeiro.boundingBox())!.y).toBeLessThan(900);
  await expect(page.locator("[data-marketplace-card] [data-convite-orcamento]")).toHaveCount(0);
});

test("usa o mesmo shell em uma categoria acessível pela loja", async ({ page }) => {
  await page.goto("/loja");
  const categoria = page.getByRole("navigation", { name: /Categorias/ }).getByRole("link").first();
  await categoria.click();
  await page.waitForURL(/\/categoria\//);
  await expect(page.locator("[data-marketplace-shell]")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
```

- [ ] **Step 2: Rodar e confirmar a falha de densidade ou do cabeçalho compartilhado**

Run: `pnpm exec playwright test tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: pelo menos um teste novo falha antes da compactação.

- [ ] **Step 3: Implementar `CabecalhoColecao`**

```tsx
type PropsCabecalhoColecao = {
  titulo: string;
  descricao?: string;
  trilha: Migalha[];
  imagem?: { url: string; alt: string };
  atalhos?: Atalho[];
  rotuloAtalhos: string;
};

export function CabecalhoColecao({ titulo, descricao, trilha, imagem, atalhos, rotuloAtalhos }: PropsCabecalhoColecao) {
  return (
    <header className="pt-4 lg:pt-5">
      <Trilha itens={trilha} />
      <div className="mt-2 flex min-w-0 items-end justify-between gap-6 border-b border-graf-200 pb-4">
        <div className="min-w-0 max-w-4xl">
          <h1 className="text-[clamp(1.75rem,1.3rem+2vw,2.75rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-graf-950">{titulo}</h1>
          {descricao ? <p className="mt-2 max-w-3xl text-sm leading-6 text-graf-600 sm:text-[0.9375rem]">{descricao}</p> : null}
        </div>
        {imagem ? <Image src={imagem.url} alt={imagem.alt} width={160} height={64} className="hidden h-12 w-auto max-w-40 object-contain sm:block" /> : null}
      </div>
      {atalhos?.length ? (
        <nav aria-label={rotuloAtalhos} className="scrollbar-none flex gap-2 overflow-x-auto py-3">
          {atalhos.map((atalho) => (
            <Link key={atalho.href} href={atalho.href} className="flex min-h-11 shrink-0 items-center gap-2 rounded-md border border-graf-200 px-3 text-sm font-semibold text-graf-800">
              {atalho.rotulo}{atalho.quantidade === undefined ? null : <span className="tabular text-xs text-graf-500">{atalho.quantidade}</span>}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
```

- [ ] **Step 4: Substituir cabeçalhos duplicados de `/loja` e `/seminovos`**

Manter as consultas `dadosDaColecao` e `fatosDaRevisao`, mas transformar seus resultados em `descricao` e `atalhos` para `CabecalhoColecao`. Remover as implementações locais de breadcrumb, manchete e abas. `/categoria`, `/marcas` e condições recebem o mesmo componente por `Vitrine`.

- [ ] **Step 5: Remover o convite que ocupa uma célula e criar faixa compacta**

```tsx
function FaixaOrcamentoColecao() {
  return (
    <aside data-convite-orcamento className="mt-8 flex flex-col justify-between gap-4 border-y border-graf-200 bg-graf-50 px-5 py-5 sm:flex-row sm:items-center">
      <div>
        <p className="font-bold text-graf-950">Não encontrou a configuração certa?</p>
        <p className="mt-1 text-sm text-graf-600">Informe equipamento, voltagem e necessidade da clínica. A equipe responde com disponibilidade e prazo.</p>
      </div>
      <LinkBotao href="/orcamento" tamanho="sm" className="shrink-0">Pedir orçamento</LinkBotao>
    </aside>
  );
}
```

Renderizar a faixa uma vez após a grade. Excluir `ConviteNaGrade`, `listaCurta` e `extra` das grades.

- [ ] **Step 6: Rodar testes e verificar altura no navegador**

Run: `pnpm exec playwright test tests/e2e/02-catalogo.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: PASS.

Run: `pnpm typecheck && pnpm lint`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/loja/marketplace/cabecalho-colecao.tsx src/components/loja/vitrine.tsx "src/app/(vitrine)/loja/page.tsx" "src/app/(vitrine)/seminovos/page.tsx" "src/app/(vitrine)/categoria/[slug]/page.tsx" "src/app/(loja)/marcas/[slug]/page.tsx" tests/e2e/12-marketplace-colecoes.spec.ts
git commit -m "feat(catalogo): unifica cabecalhos das colecoes"
```

---

### Task 5: Busca e rotas de condição

**Files:**
- Modify: `src/app/(vitrine)/busca/page.tsx:1-378`
- Modify: `src/app/(loja)/novos/page.tsx:41-71`
- Modify: `src/app/(loja)/usados/page.tsx:41-68`
- Modify: `src/app/(loja)/recondicionados/page.tsx:41-73`
- Modify: `src/app/(loja)/pecas-e-acessorios/page.tsx:41-73`
- Modify: `tests/e2e/12-marketplace-colecoes.spec.ts`

**Interfaces:**
- Consumes: `GradeMarketplace`, `CabecalhoColecao`, `ResultadoUniversal` e `ParcelamentoMarketplace`.
- Produces: a mesma anatomia de produto em busca, condição, marca e categoria; grupos de conteúdo/serviço não mudam de semântica.

- [ ] **Step 1: Escrever E2E para busca e condições**

```ts
import { fixtures } from "./fixtures";

test("a busca usa o card do marketplace e permite refinar no catálogo", async ({ page }) => {
  const { produto } = fixtures();
  await page.goto(`/busca?q=${encodeURIComponent(produto.nome)}`);
  await expect(page.locator("[data-marketplace-card]").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Refinar no catálogo/ })).toBeVisible();
});

test("as condições públicas compartilham o shell", async ({ page }) => {
  for (const rota of ["/novos", "/seminovos", "/usados", "/recondicionados", "/pecas-e-acessorios"]) {
    await page.goto(rota);
    await expect(page.locator("[data-marketplace-shell]"), rota).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }), rota).toBeVisible();
  }
});
```

- [ ] **Step 2: Rodar e confirmar que a busca ainda usa `GradeVitrine`**

Run: `pnpm exec playwright test tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: FAIL na busca antes da troca do card.

- [ ] **Step 3: Trocar somente o grupo de produtos da busca**

```tsx
if (grupo === "produtos") {
  if (resultado.produtos.length === 0) return null;
  return (
    <section aria-labelledby="g-produtos">
      <CabecalhoDoGrupo grupo={grupo} intencao={resultado.intencao} quantidade={resultado.produtos.length} />
      <div className="mt-5 max-w-[112rem]">
        <GradeMarketplace produtos={resultado.produtos} parcelamento={parcelamento} />
      </div>
      <p className="mt-4">
        <Link href={`/loja?q=${encodeURIComponent(consulta)}`} className="foco-jb inline-flex min-h-11 items-center gap-2 font-semibold text-jb-700 underline underline-offset-4">
          Refinar no catálogo, com filtros <ArrowRight className="size-4" aria-hidden />
        </Link>
      </p>
    </section>
  );
}
```

Manter a busca universal, a ordem por intenção e os grupos de Central Técnica, serviços e equipamentos da clínica.

- [ ] **Step 4: Remover variações visuais remanescentes nas rotas de condição**

As páginas continuam passando título, descrição, trilha, filtro fixo e atalhos a `Vitrine`. Remover somente props obsoletas (`variante`, `apoioNoFiltro`) após `Vitrine` deixar de aceitá-las. Não alterar metadata ou regras de condição.

- [ ] **Step 5: Rodar os testes de busca, catálogo e home**

Run: `pnpm exec playwright test tests/e2e/01-home.spec.ts tests/e2e/02-catalogo.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: PASS.

Run: `pnpm test:unit && pnpm typecheck && pnpm lint`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(vitrine)/busca/page.tsx" "src/app/(loja)/novos/page.tsx" "src/app/(loja)/usados/page.tsx" "src/app/(loja)/recondicionados/page.tsx" "src/app/(loja)/pecas-e-acessorios/page.tsx" tests/e2e/12-marketplace-colecoes.spec.ts
git commit -m "feat(catalogo): leva marketplace a busca e condicoes"
```

---

### Task 6: Acessibilidade, regressão da home e validação completa

**Files:**
- Modify: `tests/e2e/08-acessibilidade.spec.ts`
- Modify: `tests/e2e/12-marketplace-colecoes.spec.ts`
- Modify only if required by failures: files introduced in Tasks 1–5

**Interfaces:**
- Consumes: todas as rotas e componentes do plano.
- Produces: evidência automatizada e visual de que o marketplace funciona em cinco larguras e a home permanece isolada.

- [ ] **Step 1: Adicionar testes de nome acessível, alvo de toque e overflow**

```ts
test("coleção e filtros funcionam por teclado sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/loja");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  const abrir = page.getByRole("button", { name: /Todos os filtros/ });
  await abrir.focus();
  await page.keyboard.press("Enter");
  const dialogo = page.getByRole("dialog", { name: "Filtros do catálogo" });
  await expect(dialogo).toBeVisible();

  const alvosPequenos = await dialogo.locator("button, a, input, select").evaluateAll((elementos) =>
    elementos.filter((elemento) => {
      const caixa = elemento.getBoundingClientRect();
      return caixa.width > 0 && caixa.height > 0 && (caixa.width < 44 || caixa.height < 44);
    }).map((elemento) => (elemento.textContent || elemento.getAttribute("aria-label") || elemento.tagName).trim()),
  );
  expect(alvosPequenos).toEqual([]);
});
```

- [ ] **Step 2: Rodar o novo teste e corrigir apenas falhas concretas**

Run: `pnpm exec playwright test tests/e2e/08-acessibilidade.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: PASS após ajustar controles que o teste identificar.

- [ ] **Step 3: Executar o portão completo de qualidade**

Run: `pnpm test:unit`

Expected: todos os testes unitários passam.

Run: `pnpm typecheck`

Expected: exit 0.

Run: `pnpm lint`

Expected: exit 0.

Run: `pnpm build`

Expected: build concluído sem erro de rota, tipo ou prerender.

Run: `pnpm exec playwright test tests/e2e/01-home.spec.ts tests/e2e/02-catalogo.spec.ts tests/e2e/03-carrinho.spec.ts tests/e2e/08-acessibilidade.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts --project=chromium`

Expected: PASS.

- [ ] **Step 4: Validar visualmente em cinco larguras**

Abrir `/loja`, uma categoria real, uma marca real, `/seminovos`, uma busca com resultado e uma busca vazia em 320, 390, 768, 1024 e 1440 px. Em cada largura, confirmar:

- nenhuma rolagem horizontal;
- primeiro produto visível na primeira tela;
- 1/2/2/3/4 colunas conforme largura;
- preço e CTA sem quebra;
- painel fecha com Escape e devolve foco;
- filtros aplicados permanecem após reload;
- coleção curta não cria card falso;
- home sem `data-marketplace-shell` e com o mesmo cabeçalho/hero/vitrines.

Salvar capturas em `.shots/marketplace-colecoes/` apenas como artefato local de revisão; não versionar as imagens.

- [ ] **Step 5: Revisar o diff contra a trava da home**

Run: `git diff --name-only 22ce1af..HEAD`

Expected: não listar `src/app/(vitrine)/page.tsx`, `src/components/loja/home/*`, `src/components/loja/card-vitrine.tsx`, `src/components/loja/card-produto.tsx`, `src/app/header-premium.css` ou `src/app/globals.css`.

- [ ] **Step 6: Commit final de validação**

```bash
git add tests/e2e/08-acessibilidade.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts
git commit -m "test(catalogo): valida marketplace responsivo e acessivel"
```
