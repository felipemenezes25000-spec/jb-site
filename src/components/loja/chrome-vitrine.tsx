import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Heart,
  MessageCircle,
  Phone,
  Scale,
  Search,
  Wrench,
} from "lucide-react";

import { cacheLife, cacheTag } from "next/cache";

import { ETIQUETA_CONFIGURACOES, type CategoriaDoMenu } from "@/lib/loja-publica";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Cromo da vitrine — cabeçalho e rodapé pretos

   O cabeçalho branco da loja serve bem uma página institucional: ele recua e
   deixa o texto falar. Numa vitrine ele compete com o produto, porque
   equipamento odontológico é branco sobre branco.

   Aqui o cromo é preto quase absoluto e o vermelho da marca só aparece onde
   existe ação — pedir assistência, ver seminovo, comprar. É o mesmo princípio
   que o design system já declara ("vermelho é sinal, nunca preenchimento"),
   levado às últimas consequências: no preto, o sinal acende.

   Três faixas, cada uma com um trabalho:
     1. avisos — o que a JB garante, e como falar com ela agora;
     2. barra principal — marca, busca, conta, carrinho, assistência;
     3. categorias — a navegação do catálogo, sempre visível.
   ============================================================================ */

const AVISOS = [
  "Assistência técnica própria — equipe JB em São Paulo",
  "12x sem juros em todo o catálogo",
  "Seminovos com laudo técnico item por item",
  "Instalação e treinamento inclusos nos equipamentos de bancada",
];

export function CabecalhoVitrine({
  categorias,
  telefone,
  whatsapp,
  horario,
  acessoDaConta,
  contadorDoCarrinho,
}: {
  categorias: CategoriaDoMenu[];
  telefone?: string;
  whatsapp?: string;
  horario?: string;
  acessoDaConta: React.ReactNode;
  contadorDoCarrinho: React.ReactNode;
}) {
  return (
    <header className="on-dark sticky top-0 z-40 bg-chrome text-white">
      {/* ------------------------------------------------------------ avisos */}
      <div className="border-b border-chrome-line">
        <div className="container-jb flex h-9 items-center justify-between gap-6">
          {/* A lista rola no celular em vez de quebrar em duas linhas: é
              informação de apoio, não pode empurrar a busca para baixo. */}
          <ul className="scrollbar-none flex min-w-0 items-center gap-5 overflow-x-auto">
            {AVISOS.map((aviso) => (
              <li
                key={aviso}
                className="micro flex shrink-0 items-center gap-2 text-white/60"
              >
                <span aria-hidden className="size-1 shrink-0 rounded-full bg-jb-500" />
                {aviso}
              </li>
            ))}
          </ul>

          <div className="micro hidden shrink-0 items-center gap-4 text-white/60 lg:flex">
            {horario ? (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3" aria-hidden />
                {horario}
              </span>
            ) : null}
            {telefone ? (
              <a
                href={`tel:${telefone.replace(/\D/g, "")}`}
                className="flex items-center gap-1.5 transition-colors hover:text-white"
              >
                <Phone className="size-3" aria-hidden />
                {telefone}
              </a>
            ) : null}
            {whatsapp ? (
              <a
                href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`}
                className="flex items-center gap-1.5 transition-colors hover:text-white"
              >
                <MessageCircle className="size-3" aria-hidden />
                WhatsApp {whatsapp}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- barra principal */}
      <div className="container-jb flex h-16 items-center gap-3 sm:gap-5">
        <Link
          href="/"
          aria-label="JB Soluções Odontológicas — página inicial"
          className="flex shrink-0 items-center gap-2.5"
        >
          {/* A logo foi desenhada para fundo claro. Em vez de recolori-la — o
              que descaracteriza a marca —, ela ganha a própria placa branca. */}
          <span className="flex h-9 items-center rounded-xs bg-white px-2">
            <Image
              src="/marca/jb-logo.webp"
              alt="JB Soluções Odontológicas"
              width={104}
              height={58}
              priority
              className="h-6 w-auto"
            />
          </span>
          <span className="micro hidden text-white/50 sm:block">Odonto</span>
        </Link>

        {/* A busca é um formulário de verdade: funciona sem script e o
            resultado tem endereço próprio, que pode ser compartilhado. */}
        <form action="/busca" role="search" className="flex min-w-0 flex-1 items-center">
          <label htmlFor="busca-vitrine" className="sr-only">
            Buscar no catálogo
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-l-xs bg-white px-3">
            <Search className="size-4 shrink-0 text-graf-500" aria-hidden />
            <input
              id="busca-vitrine"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Buscar autoclave, ultrassom, equipo, SKU…"
              className="h-11 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-graf-900 outline-none placeholder:text-graf-500"
            />
          </div>
          <button
            type="submit"
            className="micro h-11 shrink-0 rounded-r-xs bg-graf-950 px-4 text-white transition-colors hover:bg-graf-800 sm:px-5"
          >
            Buscar
          </button>
        </form>

        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            href="/comparar"
            aria-label="Comparar equipamentos"
            className="hidden size-11 items-center justify-center rounded-xs text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:flex"
          >
            <Scale className="size-5" aria-hidden />
          </Link>
          <Link
            href="/minha-jb/favoritos"
            aria-label="Equipamentos salvos"
            className="hidden size-11 items-center justify-center rounded-xs text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:flex"
          >
            <Heart className="size-5" aria-hidden />
          </Link>
          {contadorDoCarrinho}
        </div>

        <div className="hidden shrink-0 lg:block">{acessoDaConta}</div>

        <Link
          href="/assistencia-tecnica/solicitar"
          className="micro flex h-11 shrink-0 items-center gap-2 rounded-xs bg-jb-500 px-3 text-white transition-colors hover:bg-jb-600 sm:px-4"
        >
          <Wrench className="size-4" aria-hidden />
          <span className="hidden sm:inline">Assistência</span>
        </Link>
      </div>

      {/* ------------------------------------------------------- categorias */}
      <nav aria-label="Categorias do catálogo" className="border-t border-chrome-line">
        <ul className="container-jb scrollbar-none flex items-center gap-6 overflow-x-auto">
          <li className="shrink-0">
            <Link href="/loja" className="micro flex h-11 items-center text-white transition-colors hover:text-jb-300">
              Todo o catálogo
            </Link>
          </li>
          {categorias.slice(0, 6).map((categoria) => (
            <li key={categoria.slug} className="shrink-0">
              <Link
                href={`/categoria/${categoria.slug}`}
                className="micro flex h-11 items-center text-white/65 transition-colors hover:text-white"
              >
                {categoria.name}
              </Link>
            </li>
          ))}
          <li className="shrink-0">
            <Link
              href="/seminovos"
              className="micro flex h-11 items-center text-jb-400 transition-colors hover:text-jb-300"
            >
              Seminovos revisados
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

/* ========================================================================== */

const COLUNAS_DO_RODAPE = [
  {
    titulo: "Catálogo",
    links: [
      { rotulo: "Todos os equipamentos", href: "/loja" },
      { rotulo: "Seminovos revisados", href: "/seminovos" },
      { rotulo: "Peças e acessórios", href: "/pecas-e-acessorios" },
      { rotulo: "Marcas", href: "/marcas" },
      { rotulo: "Comparar equipamentos", href: "/comparar" },
    ],
  },
  {
    titulo: "Assistência",
    links: [
      { rotulo: "Assistência técnica", href: "/assistencia-tecnica" },
      { rotulo: "Solicitar assistência", href: "/assistencia-tecnica/solicitar" },
      { rotulo: "Manutenção preventiva", href: "/manutencao-preventiva" },
      { rotulo: "Planos de manutenção", href: "/planos-de-manutencao" },
      { rotulo: "Pedir orçamento", href: "/orcamento" },
    ],
  },
  {
    titulo: "Área da clínica",
    links: [
      { rotulo: "Entrar", href: "/entrar" },
      { rotulo: "Criar conta", href: "/cadastro" },
      { rotulo: "Meus pedidos", href: "/minha-jb/pedidos" },
      { rotulo: "Meus equipamentos", href: "/minha-jb/equipamentos" },
      { rotulo: "Favoritos", href: "/minha-jb/favoritos" },
    ],
  },
  {
    titulo: "Institucional",
    links: [
      { rotulo: "Sobre a JB", href: "/sobre" },
      { rotulo: "Nossa estrutura", href: "/estrutura" },
      { rotulo: "Central Técnica", href: "/central-tecnica" },
      { rotulo: "Contato", href: "/contato" },
      { rotulo: "Dúvidas frequentes", href: "/faq" },
    ],
  },
];

/**
 * O rodapé lê as próprias configurações dentro de `use cache`.
 *
 * Não é preferência de estilo: o ano do aviso de copyright vem de
 * `new Date()`, e com Cache Components ler a hora atual fora de um escopo
 * cacheado quebra o prerender da rota inteira ("blocking-prerender-current-time").
 * Dentro do cache, o valor é capturado quando o cache é escrito. É o mesmo
 * caminho que o rodapé claro já seguia.
 */
export async function RodapeVitrine() {
  "use cache";
  cacheTag(ETIQUETA_CONFIGURACOES);
  cacheLife("hours");

  const s = await getSettings();
  const telefone = s.telefone;
  const whatsapp = s.whatsapp;
  const horario = s.horario;
  const cidade = s.endereco_cidade;
  const ano = new Date().getFullYear();

  return (
    <footer className="on-dark mt-16 bg-chrome text-white">
      {/* A chamada final repete a única frase que separa a JB de um site de
          revenda: quem vende é quem conserta. */}
      {/* Brasa em vez de malha: a grade de 56px que o protótipo usa aqui passa
          exatamente na altura da manchete e, entre as letras, lê-se como um
          risco sobre o texto. O degradê dá a mesma profundidade sem cruzar
          nada. */}
      <div className="relative isolate overflow-hidden border-b border-chrome-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 120% at 12% 100%, rgb(224 20 27 / 0.22), transparent 62%)",
          }}
        />
        <div className="container-jb flex flex-wrap items-end justify-between gap-x-10 gap-y-6 py-12 lg:py-14">
          <div className="max-w-2xl">
            <p className="micro text-jb-400">JB Soluções Odontológicas</p>
            <p className="manchete mt-4 text-[clamp(1.75rem,1.3rem+1.9vw,2.75rem)] text-white">
              Equipamento, instalação e assistência na mesma relação.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/loja"
              className="micro flex h-12 items-center gap-2 rounded-xs bg-jb-500 px-5 text-white transition-colors hover:bg-jb-600"
            >
              Explorar catálogo
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link
              href="/assistencia-tecnica/solicitar"
              className="micro flex h-12 items-center gap-2 rounded-xs border border-white/25 px-5 text-white transition-colors hover:bg-white/10"
            >
              Abrir chamado técnico
            </Link>
          </div>
        </div>
      </div>

      <div className="container-jb grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <span className="flex h-10 w-fit items-center rounded-xs bg-white px-2.5">
            <Image
              src="/marca/jb-logo.webp"
              alt="JB Soluções Odontológicas"
              width={120}
              height={67}
              className="h-7 w-auto"
            />
          </span>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/60">
            Assistência técnica e equipamentos para consultórios odontológicos
            {cidade ? ` em ${cidade}` : ""}.
          </p>

          <ul className="mt-5 space-y-2.5 text-[0.9375rem]">
            {telefone ? (
              <li>
                <a
                  href={`tel:${telefone.replace(/\D/g, "")}`}
                  className="numero text-lg text-jb-400 transition-colors hover:text-jb-300"
                >
                  {telefone}
                </a>
              </li>
            ) : null}
            {whatsapp ? (
              <li>
                <a
                  href={`https://wa.me/55${whatsapp.replace(/\D/g, "")}`}
                  className="text-white/75 transition-colors hover:text-white"
                >
                  WhatsApp {whatsapp}
                </a>
              </li>
            ) : null}
            {horario ? <li className="text-white/50">{horario}</li> : null}
          </ul>
        </div>

        {COLUNAS_DO_RODAPE.map((coluna) => (
          <nav key={coluna.titulo} aria-label={coluna.titulo}>
            <p className="micro text-white/40">{coluna.titulo}</p>
            <ul className="mt-4 space-y-2.5">
              {coluna.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[0.9375rem] text-white/70 transition-colors hover:text-white"
                  >
                    {link.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-chrome-line">
        <div
          className={cn(
            "container-jb flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-5",
            "micro text-white/35",
          )}
        >
          <p>
            © {ano} JB Soluções Odontológicas · São Paulo · Em atividade
            desde 2011
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/entrega" className="transition-colors hover:text-white/70">
              Entrega e retirada
            </Link>
            <Link href="/trocas-e-devolucoes" className="transition-colors hover:text-white/70">
              Trocas e devoluções
            </Link>
            <Link href="/privacidade" className="transition-colors hover:text-white/70">
              Privacidade
            </Link>
            <Link href="/termos" className="transition-colors hover:text-white/70">
              Termos de uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
