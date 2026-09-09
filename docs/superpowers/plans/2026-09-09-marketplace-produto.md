# Marketplace JB Product Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar a página pública do produto em uma PDP clínica de alta conversão, reunindo decisão e compra na primeira dobra e reduzindo a rolagem sem perder conteúdo técnico.

**Architecture:** A rota continua como Server Component responsável por consultas, SEO e composição. Novos componentes focados organizam resumo técnico, faixa de confiança e blocos de decisão; os componentes cliente existentes preservam galeria, carrinho, CEP e barra mobile. A página usa os cards exclusivos do plano de coleções nos relacionados, mantendo home, favoritos e vistos recentemente intactos.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, Tailwind CSS 4, CSS Modules, Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-09-09-marketplace-clinico-design.md`

## Global Constraints

- Este plano depende da conclusão de `docs/superpowers/plans/2026-09-09-marketplace-colecoes.md`.
- A home, Área da Clínica, favoritos, admin, carrinho, checkout e orçamento ficam fora do escopo.
- Não mudar regras de preço, estoque, frete, garantia, serviço, parcelamento ou criação de pedido.
- Serviços pagos nunca podem vir selecionados.
- Não mostrar número de série sensível quando não existe uma única unidade identificável.
- Não inventar avaliação, inspeção, ANVISA, garantia, prazo, estoque ou urgência.
- A primeira dobra em 1440 × 900 deve mostrar galeria, identidade, resumo técnico, preço/estado, CEP e ação principal.
- Conteúdo técnico precisa permanecer no HTML e acessível por teclado/leitor de tela.
- A barra fixa mobile não pode cobrir conteúdo e deve respeitar `env(safe-area-inset-bottom)`.
- Não adicionar dependências de galeria ou animação.

## File Structure

### Novos arquivos

- `src/lib/marketplace/resumo-produto.ts` — escolhe até quatro destaques verificáveis da PDP.
- `src/components/loja/produto/topo-marketplace.tsx` — grade de primeira dobra em três zonas.
- `src/components/loja/produto/resumo-tecnico.tsx` — identidade compacta e destaques técnicos.
- `src/components/loja/produto/faixa-confianca.tsx` — sinais reais próximos da compra.
- `src/components/loja/produto/bloco-decisao.tsx` — estrutura compacta das seções inferiores.
- `src/components/loja/produto/produto-marketplace.module.css` — layout e responsividade isolados.
- `tests/unitarios/marketplace-resumo-produto.test.ts` — ausência de afirmações sem dados.
- `tests/e2e/13-marketplace-produto.spec.ts` — primeira dobra, compra, mobile, conteúdo e estados.

### Arquivos modificados

- `src/app/(vitrine)/loja/[slug]/page.tsx` — composição principal e ordem das seções.
- `src/components/loja/galeria-produto.tsx` — proporção, miniaturas, marcadores de teste e zoom.
- `src/components/loja/produto/identidade.tsx` — responsabilidades transferidas ao resumo técnico.
- `src/components/loja/caixa-compra.tsx` — densidade e ordem visual, preservando a action atual.
- `src/components/loja/produto/condicoes-de-compra.tsx` — vira faixa curta de confiança/condições.
- `src/components/loja/produto/navegacao-do-produto.tsx` — navegação fina e barra mobile.
- `tests/e2e/03-carrinho.spec.ts` — garante que os dois caminhos de compra continuam corretos.
- `tests/e2e/11-frete.spec.ts` — garante CEP e preço de frete junto do painel.

---

### Task 1: Resumo técnico verificável

**Files:**
- Create: `src/lib/marketplace/resumo-produto.ts`
- Create: `tests/unitarios/marketplace-resumo-produto.test.ts`

**Interfaces:**
- Consumes: `destaquesDoCard` do plano de coleções e campos opcionais de produto.
- Produces: `destaquesDaPdp(entrada): DestaqueProduto[]` com no máximo quatro itens.

- [ ] **Step 1: Escrever os testes de precedência e ausência**

```ts
import { describe, expect, it } from "vitest";

import { destaquesDaPdp } from "@/lib/marketplace/resumo-produto";

describe("destaquesDaPdp", () => {
  it("combina ficha, voltagem, garantia e ANVISA sem repetir", () => {
    expect(destaquesDaPdp({
      specs: [
        { label: "Torque", value: "35 N·cm", order: 0 },
        { label: "Rotação", value: "2.000 rpm", order: 1 },
      ],
      voltage: "bivolt",
      warrantyMonths: 6,
      anvisaCode: "12345678901",
    })).toEqual([
      { rotulo: "Torque", valor: "35 N·cm" },
      { rotulo: "Rotação", valor: "2.000 rpm" },
      { rotulo: "Voltagem", valor: "Bivolt" },
      { rotulo: "Garantia", valor: "6 meses" },
    ]);
  });

  it("usa ANVISA quando existe espaço e não inventa registro", () => {
    expect(destaquesDaPdp({ specs: [], voltage: null, warrantyMonths: null, anvisaCode: "ANVISA 999" }))
      .toEqual([{ rotulo: "Registro", valor: "ANVISA 999" }]);
    expect(destaquesDaPdp({ specs: [], voltage: null, warrantyMonths: null, anvisaCode: null }))
      .toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a ausência do módulo**

Run: `pnpm exec vitest run tests/unitarios/marketplace-resumo-produto.test.ts`

Expected: FAIL na importação.

- [ ] **Step 3: Implementar a função pura**

```ts
import { destaquesDoCard, type DestaqueTecnico } from "@/lib/marketplace/destaques-card";

type Entrada = {
  specs: { label: string; value: string; order: number }[];
  voltage: string | null;
  warrantyMonths: number | null;
  anvisaCode: string | null;
};

export type DestaqueProduto = DestaqueTecnico;

export function destaquesDaPdp(entrada: Entrada): DestaqueProduto[] {
  const principais = destaquesDoCard({
    specs: entrada.specs,
    voltage: entrada.voltage,
    warrantyMonths: entrada.warrantyMonths,
  }, 4);
  if (principais.length < 4 && entrada.anvisaCode?.trim()) {
    principais.push({ rotulo: "Registro", valor: entrada.anvisaCode.trim() });
  }
  return principais.slice(0, 4);
}
```

- [ ] **Step 4: Rodar testes, tipos e lint**

Run: `pnpm exec vitest run tests/unitarios/marketplace-resumo-produto.test.ts && pnpm typecheck`

Expected: PASS e exit 0.

Run: `pnpm exec eslint src/lib/marketplace/resumo-produto.ts tests/unitarios/marketplace-resumo-produto.test.ts`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace/resumo-produto.ts tests/unitarios/marketplace-resumo-produto.test.ts
git commit -m "feat(produto): prepara resumo tecnico verificavel"
```

---

### Task 2: Primeira dobra em três zonas

**Files:**
- Create: `src/components/loja/produto/topo-marketplace.tsx`
- Create: `src/components/loja/produto/resumo-tecnico.tsx`
- Create: `src/components/loja/produto/produto-marketplace.module.css`
- Create: `tests/e2e/13-marketplace-produto.spec.ts`
- Modify: `src/app/(vitrine)/loja/[slug]/page.tsx:460-650`
- Modify: `src/components/loja/galeria-produto.tsx:151-431`

**Interfaces:**
- Consumes: `GaleriaProduto`, `CaixaCompra`, `AcoesDoProduto`, estado do produto e `DestaqueProduto[]`.
- Produces: `TopoMarketplace`, `ResumoTecnicoProduto` e marcadores `data-pdp-marketplace`, `data-pdp-gallery`, `data-pdp-summary`, `data-pdp-buybox`.

- [ ] **Step 1: Escrever o teste da primeira dobra antes do layout**

```ts
import { expect, test } from "@playwright/test";
import { fixtures } from "./fixtures";

test.describe("Marketplace — página do produto", () => {
  test("reúne galeria, identidade e compra na primeira dobra desktop", async ({ page }) => {
    const { produto } = fixtures();
    await page.goto(`/loja/${produto.slug}`);

    const galeria = page.locator("[data-pdp-gallery]");
    const resumo = page.locator("[data-pdp-summary]");
    const compra = page.locator("[data-pdp-buybox]");
    await expect(galeria).toBeVisible();
    await expect(resumo).toBeVisible();
    await expect(compra).toBeVisible();

    const [g, r, c] = await Promise.all([galeria.boundingBox(), resumo.boundingBox(), compra.boundingBox()]);
    expect(g!.x).toBeLessThan(r!.x);
    expect(r!.x).toBeLessThan(c!.x);
    expect(Math.max(g!.y, r!.y, c!.y)).toBeLessThan(900);
    await expect(page.getByRole("button", { name: "Comprar agora" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar ao carrinho" })).toBeVisible();
  });
});
```

- [ ] **Step 2: Rodar e confirmar a ausência dos marcadores/zonas**

Run: `pnpm exec playwright test tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: FAIL em `[data-pdp-gallery]` ou na ordem horizontal.

- [ ] **Step 3: Implementar o CSS da primeira dobra**

```css
.topo {
  display: grid;
  gap: 1.25rem;
}

.galeria, .resumo, .compra { min-width: 0; }

@media (min-width: 1024px) {
  .topo {
    grid-template-columns: minmax(0, 5fr) minmax(14rem, 3fr) minmax(20rem, 4fr);
    align-items: start;
    gap: clamp(1.25rem, 2vw, 2.5rem);
  }
  .compra { position: sticky; top: 6.5rem; }
}

@media (max-width: 1023px) and (min-width: 768px) {
  .topo { grid-template-columns: minmax(0, 1fr) minmax(20rem, 1fr); }
  .resumo, .compra { grid-column: 2; }
  .galeria { grid-column: 1; grid-row: 1 / span 2; }
}
```

- [ ] **Step 4: Implementar `ResumoTecnicoProduto`**

```tsx
type PropsResumoTecnico = {
  produto: {
    nome: string;
    modelo: string;
    resumo: string;
    condicao: string;
    marca: { nome: string; slug: string } | null;
  };
  destaques: DestaqueProduto[];
};

export function ResumoTecnicoProduto({ produto, destaques }: PropsResumoTecnico) {
  return (
    <section data-pdp-summary aria-labelledby="titulo-produto">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-jb-200 bg-jb-50 px-2 py-1 text-xs font-bold text-jb-700">{produto.condicao}</span>
        {produto.marca ? <Link href={`/marcas/${produto.marca.slug}`} className="text-xs font-bold uppercase tracking-[0.08em] text-graf-500">{produto.marca.nome}</Link> : null}
      </div>
      <h1 id="titulo-produto" className="mt-3 text-[clamp(1.75rem,1.3rem+1.7vw,2.75rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-graf-950">{produto.nome}</h1>
      {produto.modelo ? <p className="mt-2 text-sm text-graf-500">Modelo {produto.modelo}</p> : null}
      {produto.resumo ? <p className="mt-4 text-[0.9375rem] leading-6 text-graf-700">{produto.resumo}</p> : null}
      {destaques.length ? (
        <dl className="mt-5 grid grid-cols-2 border-y border-graf-200">
          {destaques.map((item) => (
            <div key={`${item.rotulo}-${item.valor}`} className="min-w-0 border-b border-graf-100 px-1 py-3 odd:pr-3 even:border-l even:pl-3">
              <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-graf-500">{item.rotulo}</dt>
              <dd className="mt-1 break-words text-sm font-bold text-graf-950">{item.valor}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5: Implementar `TopoMarketplace` e reorganizar o DOM**

```tsx
type PropsTopoMarketplace = {
  galeria: React.ReactNode;
  resumo: React.ReactNode;
  compra: React.ReactNode;
  acoes?: React.ReactNode;
};

export function TopoMarketplace({ galeria, resumo, compra, acoes }: PropsTopoMarketplace) {
  return (
    <section data-pdp-marketplace className="container-jb max-w-[112rem] pb-8 pt-4 lg:pb-10">
      <div className={styles.topo}>
        <div data-pdp-gallery className={styles.galeria}>{galeria}</div>
        <div className={styles.resumo}>{resumo}{acoes}</div>
        <div data-pdp-buybox className={styles.compra}>{compra}</div>
      </div>
    </section>
  );
}
```

Na rota, renderizar `Trilha` antes da grade dentro do mesmo contêiner, criar `destaquesDaPdp` a partir de `produto.specs`, `produto.voltage`, garantia efetiva e `anvisaCode`, e passar os componentes existentes para as três zonas. Remover `CondicoesDeCompra` e `AjudaDaEquipe` debaixo da galeria; elas serão consolidadas na Task 4.

- [ ] **Step 6: Ajustar a galeria sem reescrever sua interação**

Adicionar `data-pdp-gallery-main` ao estágio principal, reduzir paddings verticais, manter miniaturas visíveis e preservar Escape, setas, swipe, foco contido e `object-contain`. Não mudar o tipo `FotoProduto` nem a lógica de zoom.

- [ ] **Step 7: Rodar E2E, tipos e lint**

Run: `pnpm exec playwright test tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: PASS.

Run: `pnpm typecheck && pnpm lint`

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/loja/produto/topo-marketplace.tsx src/components/loja/produto/resumo-tecnico.tsx src/components/loja/produto/produto-marketplace.module.css src/components/loja/galeria-produto.tsx "src/app/(vitrine)/loja/[slug]/page.tsx" tests/e2e/13-marketplace-produto.spec.ts
git commit -m "feat(produto): concentra decisao na primeira dobra"
```

---

### Task 3: Painel de compra compacto sem mudar regras comerciais

**Files:**
- Modify: `src/components/loja/caixa-compra.tsx:160-454`
- Modify: `src/components/loja/produto/entrega-por-cep.tsx:39-144`
- Modify: `tests/e2e/03-carrinho.spec.ts`
- Modify: `tests/e2e/11-frete.spec.ts`
- Modify: `tests/e2e/13-marketplace-produto.spec.ts`

**Interfaces:**
- Consumes: a Server Action atual `adicionarAoCarrinho`, adicionais, estoque, garantia e perfil de entrega existente.
- Produces: o mesmo formulário com hierarquia visual preço → CEP → pacote → quantidade → ações.

- [ ] **Step 1: Adicionar testes que fixam a ordem e os caminhos de ação**

```ts
test("mantém preço, CEP e ações no painel de compra", async ({ page }) => {
  const { frete } = fixtures();
  await page.goto(`/loja/${frete.slug}`);
  const painel = page.locator("[data-pdp-buybox]");
  await expect(painel.getByText(emReais(frete.precoCents)).first()).toBeVisible();
  await expect(painel.getByRole("textbox", { name: /CEP/ })).toBeVisible();
  await expect(painel.getByRole("button", { name: "Comprar agora" })).toBeVisible();
  await expect(painel.getByRole("button", { name: "Adicionar ao carrinho" })).toBeVisible();
});
```

No teste do carrinho, manter a asserção existente para “Adicionar ao carrinho” e adicionar um caso em que “Comprar agora” termina em `/checkout` sem mostrar apenas o toast do carrinho.

- [ ] **Step 2: Rodar os testes antes da mudança visual**

Run: `pnpm exec playwright test tests/e2e/03-carrinho.spec.ts tests/e2e/11-frete.spec.ts tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: o caso de ordem/escopo do painel falha se o CEP ainda não estiver dentro do marcador novo; os fluxos antigos continuam verdes.

- [ ] **Step 3: Reordenar a marcação sem alterar estado ou action**

Preservar integralmente:

- `useActionState` e `destinoRef`;
- cálculo de `obrigatorios`, `selecionados`, `totalAddons` e `total`;
- regra `podeComprar`;
- pacote opcional inicialmente desligado;
- nomes dos campos hidden;
- redirecionamento para `/checkout`;
- toast e reset após adicionar ao carrinho.

A nova marcação deve usar uma única moldura de 8–10 px, divisores de 1 px e esta ordem: estado/preço; calculador de entrega; pacote opcional; formulário com campos hidden, quantidade, total e ações; garantia. Aplicar as constantes abaixo aos nós JSX já existentes, movendo-os sem duplicar cálculos:

```tsx
const CLASSE_PAINEL_COMPRA =
  "overflow-hidden rounded-[10px] border border-graf-300 bg-white shadow-card";
const CLASSE_SECAO_COMPRA = "border-t border-graf-200 px-5 py-4";
const CLASSE_ACOES_COMPRA = "mt-4 grid gap-2";
const CLASSE_GARANTIA_COMPRA =
  "border-t border-graf-200 px-5 py-3 text-xs leading-5 text-graf-600";
```

- [ ] **Step 4: Compactar o calculador de CEP**

Manter a action/API atual e os estados de carregando, faixa, retirada, grátis e sob orçamento. O campo e o botão ficam na mesma linha a partir de 375 px; a resposta aparece imediatamente abaixo com `aria-live="polite"`.

- [ ] **Step 5: Rodar compra, frete e unidade**

Run: `pnpm exec playwright test tests/e2e/03-carrinho.spec.ts tests/e2e/11-frete.spec.ts tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: PASS.

Run: `pnpm exec vitest run tests/unitarios/carrinho.test.ts tests/unitarios/carrinho-dinheiro.test.ts tests/unitarios/frete.test.ts`

Expected: PASS.

Run: `pnpm typecheck && pnpm lint`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/loja/caixa-compra.tsx src/components/loja/produto/entrega-por-cep.tsx tests/e2e/03-carrinho.spec.ts tests/e2e/11-frete.spec.ts tests/e2e/13-marketplace-produto.spec.ts
git commit -m "feat(produto): compacta painel de compra e entrega"
```

---

### Task 4: Confiança e conteúdo técnico consolidados

**Files:**
- Create: `src/components/loja/produto/faixa-confianca.tsx`
- Create: `src/components/loja/produto/bloco-decisao.tsx`
- Modify: `src/app/(vitrine)/loja/[slug]/page.tsx:650-950`
- Modify: `src/components/loja/produto/condicoes-de-compra.tsx:1-124`
- Modify: `tests/e2e/13-marketplace-produto.spec.ts`

**Interfaces:**
- Consumes: garantia efetiva, certificado, perfil de frete, voltagem, conteúdo existente e componentes técnicos atuais.
- Produces: `FaixaConfianca`, `BlocoDecisao` e seções `sobre`, `ficha-tecnica`, `unidade`, `preparo`, `entrega-e-garantia`, `duvidas`, `relacionados`.

- [ ] **Step 1: Escrever teste de ordem e ausência de repetição**

```ts
test("organiza conteúdo técnico antes de relacionados e evita chamadas repetidas", async ({ page }) => {
  const { produto } = fixtures();
  await page.goto(`/loja/${produto.slug}`);
  const ficha = page.locator("#ficha-tecnica");
  const relacionados = page.locator("#relacionados");
  await expect(relacionados).toBeVisible();
  if (await ficha.count()) {
    expect((await ficha.boundingBox())!.y).toBeLessThan((await relacionados.boundingBox())!.y);
  }
  expect(await page.getByText("Assistência técnica própria", { exact: true }).count()).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Rodar e confirmar a repetição/estrutura antiga**

Run: `pnpm exec playwright test tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: o teste de repetição ou a nova estrutura falha.

- [ ] **Step 3: Implementar `FaixaConfianca` somente com fatos presentes**

```tsx
type PropsFaixaConfianca = {
  certificado: boolean;
  garantiaMeses: number | null;
  temFrete: boolean;
  temInstalacao: boolean;
};

type ItemConfianca = {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
};

export function FaixaConfianca({ certificado, garantiaMeses, temFrete, temInstalacao }: PropsFaixaConfianca) {
  const itens = [
    certificado ? { icone: BadgeCheck, titulo: "Inspecionado pela JB" } : null,
    garantiaMeses ? { icone: ShieldCheck, titulo: `${garantiaMeses} ${garantiaMeses === 1 ? "mês" : "meses"} de garantia` } : null,
    { icone: Wrench, titulo: "Assistência técnica própria" },
    temFrete ? { icone: Truck, titulo: "Entrega calculada por CEP" } : null,
    temInstalacao ? { icone: PlugZap, titulo: "Instalação disponível" } : null,
  ].filter((item): item is ItemConfianca => Boolean(item));

  return (
    <ul aria-label="Confiança desta compra" className="container-jb max-w-[112rem] grid border-y border-graf-200 sm:grid-cols-2 lg:grid-cols-4">
      {itens.slice(0, 4).map((item) => {
        const Icone = item.icone;
        return <li key={item.titulo} className="flex min-h-16 items-center gap-3 border-graf-200 px-4 py-3 sm:border-l first:border-l-0"><Icone className="size-4 text-jb-600" aria-hidden /><span className="text-sm font-semibold text-graf-800">{item.titulo}</span></li>;
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Implementar o bloco reutilizável de decisão**

```tsx
type PropsBlocoDecisao = {
  id: string;
  titulo: string;
  resumo?: string;
  children: React.ReactNode;
  lateral?: React.ReactNode;
};

export function BlocoDecisao({ id, titulo, resumo, children, lateral }: PropsBlocoDecisao) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="scroll-mt-32 border-t border-graf-200 py-8 lg:py-10">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
        <header className="lg:col-span-3">
          <h2 id={`${id}-titulo`} className="text-xl font-extrabold tracking-[-0.02em] text-graf-950 lg:text-2xl">{titulo}</h2>
          {resumo ? <p className="mt-2 text-sm leading-6 text-graf-600">{resumo}</p> : null}
        </header>
        <div className={lateral ? "min-w-0 lg:col-span-6" : "min-w-0 lg:col-span-9"}>{children}</div>
        {lateral ? <aside className="min-w-0 lg:col-span-3">{lateral}</aside> : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Reagrupar a rota em um único fluxo compacto**

Após `FaixaConfianca`, usar um único `<div className="container-jb max-w-[112rem]">` e esta ordem:

1. `UnidadeFisica`, apenas se existir unidade identificável;
2. descrição sanitizada em `BlocoDecisao id="sobre"`;
3. `FichaTecnica`, `MedidasEPeso`, `Regulatorio` e `Documentacao` em `id="ficha-tecnica"`;
4. `AntesDeComprar`, `OQueVemNaCaixa`, `Instalacao` e `DepoisDaCompraNoProduto` em grade 2 × 2 dentro de `id="preparo"`;
5. `ServicosDoProduto` e uma única ajuda da equipe dentro de `id="entrega-e-garantia"`;
6. FAQs e formulário em `id="duvidas"`;
7. relacionados em `id="relacionados"`.

Remover `MotivosJB` e `AssistenciaRelacionada` desta rota porque repetem assistência/garantia já presentes na compra e na faixa de confiança. Manter toda informação técnica, regulatória, logística e de instalação.

- [ ] **Step 6: Usar `GradeMarketplace` nos relacionados**

Trocar apenas a grade de relacionados da PDP por `GradeMarketplace`. Manter `CardProduto` em favoritos e vistos recentemente, que estão fora do escopo. Limitar visualmente relacionados a quatro no desktop; a consulta pode manter até oito se a paginação horizontal não for introduzida.

- [ ] **Step 7: Rodar testes e verificar a ordem sem conteúdo inventado**

Run: `pnpm exec playwright test tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: PASS.

Run: `pnpm typecheck && pnpm lint`

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/loja/produto/faixa-confianca.tsx src/components/loja/produto/bloco-decisao.tsx src/components/loja/produto/condicoes-de-compra.tsx "src/app/(vitrine)/loja/[slug]/page.tsx" tests/e2e/13-marketplace-produto.spec.ts
git commit -m "feat(produto): consolida conteudo e sinais de confianca"
```

---

### Task 5: Navegação de seção e conversão persistente

**Files:**
- Modify: `src/components/loja/produto/navegacao-do-produto.tsx:1-173`
- Modify: `src/app/(vitrine)/loja/[slug]/page.tsx:410-450, 950-988`
- Modify: `tests/e2e/13-marketplace-produto.spec.ts`

**Interfaces:**
- Consumes: `AncoraDoProduto[]`, preço, parcelas, orçamento, indisponibilidade e alvo `caixa-de-compra`.
- Produces: navegação fina desktop/tablet e barra de compra mobile segura.

- [ ] **Step 1: Escrever E2E da barra mobile**

```ts
test("mostra conversão persistente no celular sem cobrir o final da página", async ({ page }) => {
  const { produto } = fixtures();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/loja/${produto.slug}`);
  await page.locator("#ficha-tecnica, #relacionados").first().scrollIntoViewIfNeeded();

  const barra = page.getByRole("link", { name: "Comprar" });
  await expect(barra).toBeVisible();
  const caixa = await barra.boundingBox();
  expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(844);

  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  const padding = await page.evaluate(() => getComputedStyle(document.body).paddingBottom);
  expect(Number.parseFloat(padding)).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Rodar e confirmar a falha de espaçamento ou seletor**

Run: `pnpm exec playwright test tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: FAIL antes do ajuste da barra ao novo layout.

- [ ] **Step 3: Simplificar a navegação de seções**

Remover a moldura arredondada aninhada. Manter `IntersectionObserver`, rolagem horizontal, `aria-current` e âncoras reais.

```tsx
<nav aria-label="Seções deste equipamento" className="sticky top-[72px] z-30 border-y border-graf-200 bg-white/95 backdrop-blur">
  <ul ref={trilhoRef} className="container-jb scrollbar-none flex min-h-12 max-w-[112rem] gap-5 overflow-x-auto">
    {ancoras.map((ancora) => (
      <li key={ancora.id} className="shrink-0">
        <a href={`#${ancora.id}`} data-ancora={ancora.id} aria-current={ativa === ancora.id ? "true" : undefined} className="foco-jb flex min-h-12 items-center border-b-2 border-transparent text-sm font-semibold text-graf-600 aria-[current=true]:border-jb-500 aria-[current=true]:text-jb-700">
          {ancora.rotulo}
        </a>
      </li>
    ))}
  </ul>
</nav>
```

- [ ] **Step 4: Ajustar `BarraCompraMobile`**

Manter a mesma conta de parcelamento da caixa. Ao medir a barra, atualizar a variável usada pelo comparador e o `padding-bottom` temporário do `body`; remover ambos no cleanup. O link continua levando à caixa, sem duplicar quantidade ou seleção de serviços.

```tsx
useEffect(() => {
  const raiz = document.documentElement;
  const corpo = document.body;
  if (!visivel) {
    raiz.style.removeProperty("--jb-barra-inferior");
    corpo.style.removeProperty("padding-bottom");
    return;
  }

  const altura = barraRef.current?.offsetHeight ?? 0;
  raiz.style.setProperty("--jb-barra-inferior", `${altura}px`);
  corpo.style.paddingBottom = `${altura}px`;
  return () => {
    raiz.style.removeProperty("--jb-barra-inferior");
    corpo.style.removeProperty("padding-bottom");
  };
}, [visivel]);
```

- [ ] **Step 5: Rodar mobile, acessibilidade e compra**

Run: `pnpm exec playwright test tests/e2e/03-carrinho.spec.ts tests/e2e/08-acessibilidade.spec.ts tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: PASS.

Run: `pnpm typecheck && pnpm lint`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/loja/produto/navegacao-do-produto.tsx "src/app/(vitrine)/loja/[slug]/page.tsx" tests/e2e/13-marketplace-produto.spec.ts
git commit -m "feat(produto): mantem compra acessivel durante a leitura"
```

---

### Task 6: Estados comerciais e regressões críticas

**Files:**
- Modify: `tests/e2e/13-marketplace-produto.spec.ts`
- Modify only if required by failures: `src/app/(vitrine)/loja/[slug]/page.tsx`, `src/components/loja/caixa-compra.tsx`, `src/components/loja/produto/estados.tsx`

**Interfaces:**
- Consumes: estados reais de produto montados pela rota.
- Produces: cobertura de compra direta, orçamento, indisponível, arquivado e unidade específica sem mudar a regra de dados.

- [ ] **Step 1: Acrescentar verificações baseadas nos produtos disponíveis no banco E2E**

```ts
test("o produto comprável não mistura estado de orçamento ou indisponível", async ({ page }) => {
  const { produto } = fixtures();
  await page.goto(`/loja/${produto.slug}`);
  const painel = page.locator("[data-pdp-buybox]");
  await expect(painel.getByRole("button", { name: "Comprar agora" })).toBeEnabled();
  await expect(painel.getByText("Disponível sob orçamento")).toHaveCount(0);
  await expect(painel.getByText("Indisponível", { exact: true })).toHaveCount(0);
});

test("nenhum número de série aparece fora de uma unidade identificável", async ({ page }) => {
  const { produto } = fixtures();
  await page.goto(`/loja/${produto.slug}`);
  await expect(page.getByText(/Número de série/i)).toHaveCount(0);
});
```

- [ ] **Step 2: Rodar e corrigir somente divergências reais**

Run: `pnpm exec playwright test tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: PASS.

- [ ] **Step 3: Inspecionar manualmente os estados existentes**

No banco local de demonstração, abrir um produto de cada estado disponível:

- novo comprável;
- seminovo/recondicionado com unidade;
- sob orçamento;
- sem estoque;
- vendido;
- arquivado;
- sem foto;
- com e sem ficha técnica;
- com frete calculável e sob orçamento.

Para estados ausentes, validar as funções puras e a renderização condicional pelo código; não publicar produto fictício em produção.

- [ ] **Step 4: Rodar os fluxos de carrinho, frete e SEO**

Run: `pnpm exec playwright test tests/e2e/02-catalogo.spec.ts tests/e2e/03-carrinho.spec.ts tests/e2e/04-checkout.spec.ts tests/e2e/11-frete.spec.ts tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: PASS.

Run: `pnpm test:unit && pnpm typecheck && pnpm lint`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/13-marketplace-produto.spec.ts "src/app/(vitrine)/loja/[slug]/page.tsx" src/components/loja/caixa-compra.tsx src/components/loja/produto/estados.tsx
git commit -m "test(produto): cobre estados comerciais da nova PDP"
```

Antes do `git add`, incluir somente arquivos realmente modificados; se os testes passarem sem correção de produção, adicionar apenas o teste.

---

### Task 7: Verificação visual, desempenho e portão final

**Files:**
- Modify only if required by verified defects: files introduced or modified in Tasks 1–6

**Interfaces:**
- Consumes: implementação completa das coleções e da PDP.
- Produces: evidência de build, testes, responsividade, acessibilidade e ausência de regressão na home.

- [ ] **Step 1: Executar a suíte completa de qualidade**

Run: `pnpm test:unit`

Expected: todos passam.

Run: `pnpm typecheck`

Expected: exit 0.

Run: `pnpm lint`

Expected: exit 0.

Run: `pnpm build`

Expected: build concluído sem falha de prerender, tipo ou importação.

Run: `pnpm exec playwright test tests/e2e/01-home.spec.ts tests/e2e/02-catalogo.spec.ts tests/e2e/03-carrinho.spec.ts tests/e2e/04-checkout.spec.ts tests/e2e/08-acessibilidade.spec.ts tests/e2e/11-frete.spec.ts tests/e2e/12-marketplace-colecoes.spec.ts tests/e2e/13-marketplace-produto.spec.ts --project=chromium`

Expected: PASS.

- [ ] **Step 2: Validar a PDP em cinco larguras**

Abrir pelo menos um produto novo comprável e o motor de implante citado pelo usuário em 320, 390, 768, 1024 e 1440 px. Confirmar:

- nenhuma rolagem horizontal;
- ordem móvel galeria → resumo → compra;
- três zonas em 1440 px;
- preço, CEP e CTA na primeira dobra desktop;
- CTA mobile aparece somente após a caixa original sair da tela;
- zoom fecha com Escape e devolve foco;
- conteúdo técnico antecede relacionados;
- FAQ, documentos, ANVISA, instalação e checklist aparecem apenas quando cadastrados;
- a altura total fica materialmente menor que a auditoria inicial de 8.463 px para o motor, sem esconder conteúdo necessário.

Salvar capturas locais em `.shots/marketplace-produto/` e registrar a altura final no resumo da execução.

- [ ] **Step 3: Conferir a home e os arquivos proibidos**

Run: `git diff --name-only 22ce1af..HEAD`

Expected: não listar `src/app/(vitrine)/page.tsx`, `src/components/loja/home/*`, `src/components/loja/card-vitrine.tsx`, `src/components/loja/card-produto.tsx`, `src/app/header-premium.css` ou `src/app/globals.css`.

Abrir a home local e a home publicada na mesma largura de 1440 × 900. Comparar header, hero e primeira vitrine; nenhum elemento do marketplace pode aparecer nela.

- [ ] **Step 4: Conferir requests, console e métricas de layout**

Nas rotas `/loja`, categoria, busca e produto:

- console sem erro;
- nenhuma resposta 5xx;
- imagens abaixo da dobra com lazy loading;
- até quatro imagens prioritárias na listagem;
- ausência de layout shift perceptível ao carregar imagens;
- diálogo de filtros e zoom sem foco preso após fechar.

- [ ] **Step 5: Revisar o diff e criar o commit final somente se houver correção**

Run: `git diff --check`

Expected: nenhuma linha com whitespace inválido.

Run: `git status --short`

Expected: somente arquivos pertencentes aos dois planos.

Se a verificação exigir correção, criar um commit dedicado:

```bash
git add "src/app/(vitrine)/loja/[slug]/page.tsx" src/components/loja/caixa-compra.tsx src/components/loja/galeria-produto.tsx src/components/loja/produto src/lib/marketplace tests/e2e/13-marketplace-produto.spec.ts
git commit -m "fix(produto): corrige achados da verificacao final"
```

Se nenhuma correção for necessária, não criar commit vazio.
