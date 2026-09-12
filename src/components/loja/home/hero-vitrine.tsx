"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  ImageOff,
  Search,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";

/* ============================================================================
   Abertura da home

   Composição trazida do protótipo: manchete grande com a palavra do meio
   trocando, foto do equipamento grande à direita com selo girando e cartão de
   preço flutuante, três miniaturas que trocam o equipamento em foco, e a faixa
   de quatro provas logo abaixo.

   Três coisas mudaram em relação ao protótipo, e cada uma tem motivo:

   1. **A palavra que gira sai do catálogo**, não de uma lista escrita à mão.
      Se a JB parar de vender cadeira, a manchete para de oferecer cadeira.
   2. **O artigo acompanha a palavra.** O protótipo dizia "a compressor" e
      "a motor" — o rodízio trocava só o substantivo. Aqui cada item carrega
      o seu artigo.
   3. **O selo não afirma laudo em produto novo.** Laudo, nesta plataforma, é
      documento de unidade física que passou pela bancada — existe para
      seminovo e recondicionado. Escrever "laudo aprovado" em cima de um
      equipamento de caixa seria a mesma classe de erro do "MARKETPLACE" que
      saiu do cabeçalho: afirmação bonita e falsa.
   ============================================================================ */

export type NumeroDaHome = { valor: string; rotulo: string };

/* Substantivo terminado em -a é feminino em praticamente todo o catálogo
   (cadeira, bomba, cuba, seladora, câmera). As exceções que a loja realmente
   tem cabem numa linha — "autoclave" é a que mais aparece. */
const FEMININOS_FORA_DA_REGRA = new Set(["autoclave"]);

function comArtigo(palavra: string) {
  const feminina = palavra.endsWith("a") || FEMININOS_FORA_DA_REGRA.has(palavra);
  return `${feminina ? "a" : "o"} ${palavra}`;
}

/** Primeira palavra do nome do produto: "Autoclave 12 L revisada" → "autoclave". */
function tipoDoEquipamento(nome: string) {
  return nome.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

const PROVAS = [
  {
    icone: ShieldCheck,
    titulo: "Garantia por escrito",
    texto: "O prazo de cada equipamento está na página dele.",
  },
  {
    icone: Wrench,
    titulo: "Bancada própria",
    texto: "Conserto em São Paulo, sem terceirizar.",
  },
  {
    icone: ClipboardCheck,
    titulo: "Laudo por unidade",
    texto: "O seminovo sai com o relatório da unidade.",
  },
  {
    icone: Truck,
    titulo: "Prazo fechado antes",
    texto: "Frete e entrega definidos antes do pagamento.",
  },
];

export function HeroVitrine({
  cidade,
  desde,
  numeros,
  vitrine,
  parcelamento,
}: {
  cidade?: string;
  desde?: string;
  numeros: NumeroDaHome[];
  vitrine: ProdutoCard[];
  parcelamento?: { max: number; minimoCents: number };
}) {
  const [emFoco, setEmFoco] = useState(0);
  const foco = vitrine[emFoco] ?? vitrine[0] ?? null;

  const temPreco = Boolean(foco?.allowDirectPurchase && foco.priceCents > 0);
  const parcelas =
    foco && temPreco
      ? calcularParcelas(foco.priceCents, parcelamento?.max, parcelamento?.minimoCents)
      : null;
  const desconto =
    foco?.compareAtCents && foco.compareAtCents > foco.priceCents
      ? Math.round(((foco.compareAtCents - foco.priceCents) / foco.compareAtCents) * 100)
      : null;

  /* A palavra que gira. Vem dos equipamentos que estão na vitrine agora; sem
     pelo menos dois tipos distintos a manchete fica parada, que é melhor do
     que uma animação que troca "autoclave" por "autoclave". */
  const tipos = [...new Set(vitrine.map((produto) => tipoDoEquipamento(produto.name)))].filter(
    Boolean,
  );
  /* Dois ou três: é o que o CSS do rodízio sabe ladrilhar, e é o tamanho da
     vitrine. Com um tipo só a palavra fica parada. */
  const palavras = (tipos.length >= 2 ? tipos.slice(0, 3) : ["equipamento"]).map(comArtigo);
  const maisLonga = palavras.reduce((a, b) => (b.length > a.length ? b : a), "");

  const laudoDeUnidade = foco?.condition === "seminovo" || foco?.condition === "recondicionado";

  return (
    <section className="relative overflow-hidden">
      {/* Dois círculos de contorno, só a partir de 1024: são o que dá
          profundidade ao lado direito sem colocar mais uma caixa na tela. */}
      <div
        className="pointer-events-none absolute -top-48 -right-32 hidden size-[40rem] rounded-full border border-graf-200/60 lg:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-20 -right-20 hidden size-[28rem] rounded-full border border-graf-200/40 lg:block"
        aria-hidden
      />

      <div className="container-loja relative grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="min-w-0">
          <p className="surge etiqueta flex items-center gap-2">
            <span className="pulso inline-block size-1.5 rounded-full bg-jb-500" aria-hidden />
            {[cidade, desde ? `desde ${desde}` : null, "assistência própria"]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <h1 className="fonte-display mt-5 text-[clamp(2.4rem,6.2vw,5rem)] leading-[0.98] text-graf-950">
            {/* Uma frase para quem ouve, o teatro para quem vê: o rodízio
                renderiza todas as palavras ao mesmo tempo, e lido em voz alta
                viraria "a autoclave o motor o compressor". */}
            <span className="sr-only">
              A clínica escolhe o equipamento. A JB responde pelos próximos anos.
            </span>
            <span aria-hidden>
              <span className="surge block" style={{ animationDelay: "60ms" }}>
                A clínica escolhe
              </span>
              <span className="surge block" style={{ animationDelay: "160ms" }}>
                <span className="rodizio" data-palavras={palavras.length}>
                  {palavras.map((palavra, i) => (
                    <span key={palavra} data-palavra style={{ animationDelay: `${i * 3.6}s` }}>
                      {palavra}
                    </span>
                  ))}
                  {/* Reserva a largura da maior: sem isso a manchete inteira
                      muda de largura a cada troca. */}
                  <span className="invisible">{maisLonga}</span>
                </span>
              </span>
              <span className="surge block" style={{ animationDelay: "260ms" }}>
                A JB responde
              </span>
              <span className="surge block text-jb-500" style={{ animationDelay: "360ms" }}>
                pelos próximos anos.
              </span>
            </span>
          </h1>

          <p
            className="surge mt-6 max-w-xl text-base leading-7 text-graf-700"
            style={{ animationDelay: "460ms" }}
          >
            Equipamento novo e seminovo com condição declarada item por item, comparação lado a
            lado antes de decidir e a mesma equipe na instalação, no chamado e na peça de
            reposição.
          </p>

          <form
            action="/busca"
            method="get"
            role="search"
            className="surge mt-7 flex max-w-xl items-center gap-2 rounded-full border border-graf-450 bg-surface py-1.5 pr-1.5 pl-5 transition-colors focus-within:border-jb-500"
            style={{ animationDelay: "520ms" }}
          >
            <Search className="size-4 shrink-0 text-graf-500" aria-hidden />
            <label htmlFor="busca-home" className="sr-only">
              Buscar na loja JB
            </label>
            <input
              id="busca-home"
              name="q"
              type="search"
              minLength={3}
              placeholder="Produto, marca, modelo, peça ou SKU"
              /* `min-h-11`: o portão mede o campo, não a moldura em volta
                 dele. Com `py-2` o input dava 39px dentro de uma pílula de
                 56px — passava aos olhos e reprovava na régua. */
              className="min-w-0 flex-1 bg-transparent py-2 text-corpo text-graf-950 outline-none placeholder:text-graf-500 min-h-11"
            />
            <button
              type="submit"
              className="botao-jb foco-jb inline-flex min-h-11 shrink-0 items-center rounded-full px-5 text-apoio"
            >
              Buscar
            </button>
          </form>

          <nav
            aria-label="Comece sua compra"
            className="surge mt-5 flex flex-wrap gap-3"
            style={{ animationDelay: "560ms" }}
          >
            <Link
              href="/loja"
              className="botao-jb foco-jb inline-flex min-h-13 items-center gap-2 rounded-full px-7 text-corpo"
            >
              Abrir o catálogo
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/assistencia-tecnica/solicitar"
              className="botao-osso foco-jb inline-flex min-h-13 items-center gap-2 rounded-full px-7 text-corpo"
            >
              <Wrench className="size-4" aria-hidden />
              Abrir chamado técnico
            </Link>
          </nav>

          {numeros.length > 0 ? (
            <dl
              className="surge mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-graf-200 pt-5"
              aria-label="Catálogo JB"
              style={{ animationDelay: "660ms" }}
            >
              {numeros.slice(0, 3).map((numero) => (
                <div key={numero.rotulo} className="min-w-0">
                  <dt className="etiqueta">{numero.rotulo}</dt>
                  <dd className="fonte-display tabular mt-1 text-2xl text-graf-950">
                    {numero.valor}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {foco ? (
          <div className="surge relative min-w-0" style={{ animationDelay: "300ms" }}>
            <div className="relative">
              {/* O bloco deslocado atrás da foto. É sombra sem desfoque: a
                  marca aparece como recorte, não como brilho. */}
              <div
                className="absolute inset-0 -z-10 translate-x-4 translate-y-4 rounded-[2rem] bg-jb-50"
                aria-hidden
              />
              <Link
                href={`/loja/${foco.slug}`}
                aria-label={`Conhecer ${foco.name}`}
                className="foco-jb relative block overflow-hidden rounded-[2rem] border border-graf-200 bg-surface shadow-raised"
              >
                {/* O protótipo prende uma foto de cena aqui e deixa o cartão
                    de baixo nomear outro equipamento — funciona lá porque o
                    primeiro item da vitrine era justamente uma autoclave.
                    Aqui a vitrine sai do catálogo e a coincidência não existe:
                    ficava escrito "Compressor" embaixo de uma autoclave.

                    A foto é a do produto em foco. O recorte é a mesma arte de
                    estúdio do protótipo, então o desenho é o mesmo — só o
                    rótulo passou a concordar com a imagem. */}
                <div data-palco-imagem-produto className="relative aspect-square w-full bg-surface">
                  {foco.imageUrl ? (
                    <Image
                      data-imagem-produto
                      src={imagemProdutoSemFundo(foco.imageUrl)}
                      alt={foco.imageAlt || foco.name}
                      fill
                      priority
                      sizes="(max-width: 1024px) 92vw, 42rem"
                      className="object-contain p-10"
                    />
                  ) : (
                    <Image
                      src="/lumina/hero-equipamento.jpg"
                      alt="Equipamento odontológico da JB Soluções"
                      fill
                      priority
                      sizes="(max-width: 1024px) 92vw, 42rem"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="absolute right-5 bottom-5 left-5 flex items-end justify-between gap-3">
                  <span className="rounded-2xl border border-graf-200 bg-surface/90 px-4 py-3 backdrop-blur-md">
                    <span className="etiqueta block text-jb-600">
                      {foco.condition === "seminovo" ? "Seminovo JB" : "Em destaque"}
                    </span>
                    <span className="mt-0.5 block text-apoio font-extrabold text-graf-950">
                      {foco.name}
                    </span>
                  </span>
                  {desconto ? (
                    <span className="micro shrink-0 rounded-full bg-jb-500 px-3 py-1.5 text-white shadow-lg">
                      −{desconto}%
                    </span>
                  ) : null}
                </div>
              </Link>

              {/* Selo girando. O texto muda com a condição porque laudo é
                  documento de unidade que passou pela bancada — não existe
                  para equipamento de caixa. */}
              <span
                className="gira absolute -top-4 -left-4 hidden size-24 place-items-center rounded-full border border-jb-200 bg-surface p-2 shadow-card sm:grid"
                aria-hidden
              >
                <span className="grid size-full place-items-center rounded-full border border-jb-100 text-center text-jb-600">
                  {/* 0,58rem dá 9,3px, e o piso desta plataforma é 10. O selo
                      cresceu de 80 para 96px para o texto caber maior — o
                      protótipo não tinha esse piso. */}
                  <span className="text-[0.65rem] leading-[1.05] font-black tracking-[0.1em] uppercase">
                    {laudoDeUnidade ? "Laudo" : "Garantia"}
                    <strong className="my-0.5 block text-base leading-none tracking-normal">
                      JB
                    </strong>
                    {/* Uma palavra por linha: o círculo tem ~80px de miolo, e
                        "por escrito" quebrava em duas e encostava na borda. */}
                    {laudoDeUnidade ? "unidade" : "escrita"}
                  </span>
                </span>
              </span>

              {temPreco ? (
                <div className="absolute -right-3 -bottom-6 hidden rounded-2xl border border-graf-200 bg-surface px-5 py-4 shadow-pop sm:block">
                  <p className="etiqueta">a partir de</p>
                  <p className="fonte-display tabular text-2xl text-graf-950">
                    {formatarPreco(foco.priceCents)}
                  </p>
                  {parcelas ? (
                    <p className="micro tabular mt-0.5 text-graf-500">
                      {parcelas.parcelas}x de {formatarPreco(parcelas.valorCents)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {vitrine.length > 1 ? (
              <div className="mt-8 grid grid-cols-3 gap-2">
                {vitrine.map((produto, i) => (
                  <button
                    key={produto.slug}
                    type="button"
                    onClick={() => setEmFoco(i)}
                    aria-pressed={i === emFoco}
                    className={`foco-jb flex min-h-16 flex-col items-center gap-1 rounded-xl border p-2 transition-all duration-300 ${
                      i === emFoco
                        ? "border-jb-500 bg-jb-50 shadow-card"
                        : "border-graf-200 hover:border-graf-450 hover:shadow-card"
                    }`}
                  >
                    {produto.imageUrl ? (
                      <Image
                        src={imagemProdutoSemFundo(produto.imageUrl)}
                        alt=""
                        width={80}
                        height={80}
                        className="size-10 object-contain"
                      />
                    ) : (
                      <ImageOff className="size-10 p-2 text-graf-400" aria-hidden />
                    )}
                    <span className="line-2 text-center text-[0.75rem] leading-tight font-bold text-graf-700">
                      {produto.name.split(" ").slice(0, 2).join(" ")}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid place-items-center gap-2 rounded-[2rem] border border-graf-200 bg-surface p-12 text-center shadow-card">
            <ShieldCheck className="size-8 text-jb-500" aria-hidden />
            <strong className="text-bloco text-graf-950">Catálogo JB</strong>
            <p className="text-corpo text-graf-700">
              Produtos publicados pela equipe aparecem aqui em destaque.
            </p>
          </div>
        )}
      </div>

      {/* Faixa de provas: quatro células dividindo um filete, sem moldura
          própria — o mesmo desenho do resto do sistema. */}
      <div className="border-t border-graf-200">
        <ul className="container-loja grid grid-cols-2 gap-px bg-graf-200 sm:grid-cols-4">
          {PROVAS.map((prova) => (
            <li key={prova.titulo} className="bg-surface px-5 py-5">
              <prova.icone className="size-4 text-jb-500" aria-hidden />
              <p className="mt-2.5 text-apoio font-bold text-graf-950">{prova.titulo}</p>
              <p className="micro mt-1 text-graf-500">{prova.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
