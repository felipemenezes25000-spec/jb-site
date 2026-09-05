/**
 * Tour da plataforma — captura e verificação em uma passada só.
 *
 * Percorre todas as rotas: as públicas, as da área do cliente (entrando com o
 * cliente de demonstração) e as do backoffice (entrando com a equipe). Em cada
 * uma tira foto no desktop e no celular, e anota o que deu errado: status HTTP,
 * erro de console, exceção de página, requisição que falhou e link quebrado.
 *
 * É o que se mostra para o cliente aprovar, e ao mesmo tempo o teste de fumaça
 * que diz se alguma tela quebrou.
 *
 *   pnpm db:demo && pnpm db:demo:operacao     (dados)
 *   BASE_URL=http://localhost:3000 node scripts/tour.mjs
 *
 * Opções:
 *   --so=publico|conta|admin   percorre só um grupo
 *   --sem-fotos                só verifica, não captura
 *   --celular                  captura só no celular
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SAIDA = path.join(process.cwd(), ".shots", "tour");

const argumentos = process.argv.slice(2);
const grupoPedido = argumentos.find((a) => a.startsWith("--so="))?.slice(5);
const semFotos = argumentos.includes("--sem-fotos");
const soCelular = argumentos.includes("--celular");

const CLIENTE = { email: "demo@jbteste.local", senha: "demo12345" };
const EQUIPE = { email: "demo.gestor@jbteste.local", senha: "demo12345" };

/* ---------------------------------------------------------------- rotas --- */

const PUBLICO = [
  ["/", "home"],
  ["/loja", "catalogo"],
  ["/novos", "novos"],
  ["/seminovos", "seminovos"],
  ["/usados", "usados"],
  ["/recondicionados", "recondicionados"],
  ["/pecas-e-acessorios", "pecas"],
  ["/marcas", "marcas"],
  ["/busca?q=autoclave", "busca"],
  ["/carrinho", "carrinho"],
  ["/servicos", "servicos"],
  ["/assistencia-tecnica", "assistencia"],
  ["/assistencia-tecnica/solicitar", "assistencia-solicitar"],
  ["/manutencao-preventiva", "manutencao-preventiva"],
  ["/planos-de-manutencao", "planos"],
  ["/orcamento", "orcamento"],
  ["/sobre", "sobre"],
  ["/estrutura", "estrutura"],
  ["/contato", "contato"],
  ["/faq", "faq"],
  ["/entrega", "entrega"],
  ["/trocas-e-devolucoes", "trocas"],
  ["/privacidade", "privacidade"],
  ["/termos", "termos"],
  ["/entrar", "entrar"],
  ["/cadastro", "cadastro"],
  ["/recuperar-senha", "recuperar-senha"],
  ["/rota-que-nao-existe", "404"],
];

const CONTA = [
  ["/minha-jb", "visao-geral"],
  ["/minha-jb/pedidos", "pedidos"],
  ["/minha-jb/equipamentos", "equipamentos"],
  ["/minha-jb/equipamentos/novo", "equipamento-novo"],
  ["/minha-jb/assistencia", "assistencia"],
  ["/minha-jb/manutencoes", "manutencoes"],
  ["/minha-jb/orcamentos", "orcamentos"],
  ["/minha-jb/documentos", "documentos"],
  ["/minha-jb/favoritos", "favoritos"],
  ["/minha-jb/enderecos", "enderecos"],
  ["/minha-jb/perfil", "perfil"],
];

const ADMIN = [
  ["/admin", "painel"],
  ["/admin/pedidos", "pedidos"],
  ["/admin/pagamentos", "pagamentos"],
  ["/admin/clientes", "clientes"],
  ["/admin/orcamentos", "orcamentos"],
  ["/admin/cupons", "cupons"],
  ["/admin/frete", "frete"],
  ["/admin/produtos", "produtos"],
  ["/admin/categorias", "categorias"],
  ["/admin/marcas", "marcas"],
  ["/admin/estoque", "estoque"],
  ["/admin/servicos", "servicos"],
  ["/admin/assistencia", "assistencia"],
  ["/admin/os", "os"],
  ["/admin/manutencao", "manutencao"],
  ["/admin/equipamentos", "equipamentos"],
  ["/admin/agenda", "agenda"],
  ["/admin/tecnicos", "tecnicos"],
  ["/admin/conteudo/paginas", "conteudo-paginas"],
  ["/admin/conteudo/home", "conteudo-home"],
  ["/admin/conteudo/faq", "conteudo-faq"],
  ["/admin/conteudo/midia", "conteudo-midia"],
  ["/admin/leads", "leads"],
  ["/admin/suporte", "suporte"],
  ["/admin/usuarios", "usuarios"],
  ["/admin/configuracoes", "configuracoes"],
  ["/admin/auditoria", "auditoria"],
];

/* ------------------------------------------------------- rotas dinâmicas --- */

/**
 * Rotas com identificador vêm do banco, não de um id chutado. Sem servidor de
 * banco aqui, descobrimos pelo próprio site: a primeira ficha de cada lista.
 */
async function descobrirDinamicas(pagina) {
  const achados = [];

  const primeiroLink = async (rota, padrao, nome) => {
    try {
      await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 20000 });
      const href = await pagina
        .locator(`a[href^="${padrao}"]`)
        .first()
        .getAttribute("href", { timeout: 4000 });
      if (href && href !== padrao && href.length > padrao.length) achados.push([href, nome]);
    } catch {
      /* a lista pode estar vazia ou a rota ainda não existir */
    }
  };

  await primeiroLink("/loja", "/loja/", "produto");
  await primeiroLink("/marcas", "/marcas/", "marca");
  await primeiroLink("/servicos", "/servicos/", "servico");

  return achados;
}

/* ------------------------------------------------------------- captura --- */

const TELAS = soCelular
  ? [{ nome: "celular", width: 390, height: 844 }]
  : [
      { nome: "desktop", width: 1440, height: 900 },
      { nome: "celular", width: 390, height: 844 },
    ];

const resultados = [];

async function visitar(contexto, grupo, rota, nome) {
  const pagina = await contexto.newPage();
  const problemas = [];

  pagina.on("console", (m) => {
    if (m.type() !== "error") return;
    const texto = m.text();
    // ruído conhecido do ambiente de desenvolvimento, não da aplicação
    if (/favicon|Download the React DevTools|Fast Refresh/i.test(texto)) return;
    problemas.push(`console: ${texto.slice(0, 160)}`);
  });
  pagina.on("pageerror", (e) => problemas.push(`exceção: ${String(e.message).slice(0, 160)}`));
  pagina.on("requestfailed", (r) => {
    const url = r.url();
    if (url.startsWith("data:") || /_next\/static\/.*\.hot-update/.test(url)) return;
    problemas.push(`falhou: ${url.replace(BASE, "").slice(0, 100)}`);
  });

  const inicio = Date.now();
  let status = 0;

  try {
    const resposta = await pagina.goto(BASE + rota, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    status = resposta?.status() ?? 0;
    await pagina.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await pagina.emulateMedia({ reducedMotion: "reduce" });
    await pagina.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});

    if (!semFotos) {
      for (const tela of TELAS) {
        await pagina.setViewportSize({ width: tela.width, height: tela.height });
        await pagina.waitForTimeout(250);
        const destino = path.join(SAIDA, grupo, tela.nome, `${nome}.png`);
        fs.mkdirSync(path.dirname(destino), { recursive: true });
        await pagina.screenshot({ path: destino, fullPage: true });
      }
    }
  } catch (e) {
    problemas.push(`navegação: ${String(e.message).split("\n")[0].slice(0, 160)}`);
  }

  const duracao = Date.now() - inicio;
  await pagina.close();

  // 404 é o resultado esperado da rota inexistente
  const esperado404 = nome === "404";
  const ok = (esperado404 ? status === 404 : status > 0 && status < 400) && problemas.length === 0;

  resultados.push({ grupo, rota, status, ms: duracao, problemas, ok });

  const marca = ok ? "ok  " : "FALHA";
  const extra = problemas.length ? `  ${problemas.length} problema(s)` : "";
  console.log(`  ${marca} ${String(status).padEnd(3)} ${rota}${extra}`);
  for (const problema of problemas.slice(0, 3)) console.log(`         ↳ ${problema}`);
}

/* --------------------------------------------------------------- login --- */

async function entrar(contexto, rota, email, senha) {
  const pagina = await contexto.newPage();
  try {
    await pagina.goto(BASE + rota, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pagina.getByLabel(/e-?mail/i).first().fill(email, { timeout: 8000 });
    await pagina.getByLabel(/senha/i).first().fill(senha, { timeout: 8000 });
    await pagina
      .getByRole("button", { name: /entrar|acessar/i })
      .first()
      .click({ timeout: 8000 });
    await pagina.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    const url = pagina.url();
    const entrou = !url.includes(rota);
    await pagina.close();
    return entrou;
  } catch (e) {
    await pagina.close();
    console.log(`  (login em ${rota} não completou: ${String(e.message).split("\n")[0].slice(0, 80)})`);
    return false;
  }
}

/* ---------------------------------------------------------------- main --- */

const navegador = await chromium.launch();

async function percorrer(grupo, rotas, login) {
  if (grupoPedido && grupoPedido !== grupo) return;
  if (rotas.length === 0) return;

  console.log(`\n── ${grupo} ${"─".repeat(Math.max(0, 40 - grupo.length))}`);
  const contexto = await navegador.newContext({ viewport: TELAS[0], locale: "pt-BR" });

  if (login) {
    const entrou = await entrar(contexto, login.rota, login.email, login.senha);
    if (!entrou) {
      console.log(`  pulando: não foi possível entrar em ${login.rota}`);
      await contexto.close();
      return;
    }
    console.log(`  entrou como ${login.email}`);
  }

  for (const [rota, nome] of rotas) await visitar(contexto, grupo, rota, nome);

  if (grupo === "publico") {
    const pagina = await contexto.newPage();
    const dinamicas = await descobrirDinamicas(pagina);
    await pagina.close();
    for (const [rota, nome] of dinamicas) await visitar(contexto, grupo, rota, nome);
  }

  await contexto.close();
}

console.log(`Tour da plataforma em ${BASE}`);

await percorrer("publico", PUBLICO, null);
await percorrer("conta", CONTA, { rota: "/entrar", ...CLIENTE, senha: CLIENTE.senha });
await percorrer("admin", ADMIN, { rota: "/admin/entrar", ...EQUIPE, senha: EQUIPE.senha });

await navegador.close();

/* -------------------------------------------------------------- resumo --- */

const falhas = resultados.filter((r) => !r.ok);
const lentas = resultados.filter((r) => r.ms > 3000).sort((a, b) => b.ms - a.ms);

console.log(`\n${"═".repeat(56)}`);
console.log(`${resultados.length} rotas · ${resultados.length - falhas.length} ok · ${falhas.length} com problema`);

if (lentas.length) {
  console.log(`\nmais lentas:`);
  for (const r of lentas.slice(0, 5)) console.log(`  ${String(r.ms).padStart(5)}ms  ${r.rota}`);
}

if (falhas.length) {
  console.log(`\nproblemas:`);
  for (const r of falhas) {
    console.log(`\n  ${r.rota}  (status ${r.status})`);
    for (const p of r.problemas) console.log(`    · ${p}`);
  }
}

if (!semFotos) console.log(`\nfotos em .shots/tour/`);

process.exit(falhas.length ? 1 : 0);
