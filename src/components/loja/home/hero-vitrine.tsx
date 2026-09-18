"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff, Pause, Play, Search, ShieldCheck, Wrench } from "lucide-react";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";
import styles from "./hero-movimento.module.css";
import { useRotacaoVitrine } from "./use-rotacao-vitrine";

export type NumeroDaHome = { valor: string; rotulo: string };

const FEMININOS_FORA_DA_REGRA = new Set(["autoclave"]);

function comArtigo(palavra: string) {
  const feminina = palavra.endsWith("a") || FEMININOS_FORA_DA_REGRA.has(palavra);
  return `${feminina ? "a" : "o"} ${palavra}`;
}

function tipoDoEquipamento(nome: string) {
  return nome.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

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
  const { palcoRef, indice, automatico, reduzido, pausar, alternarPausa, selecionar } = useRotacaoVitrine(vitrine.length);
  const foco = vitrine[indice] ?? null;
  const temPreco = Boolean(foco?.allowDirectPurchase && foco.priceCents > 0);
  const parcelas = foco && temPreco
    ? calcularParcelas(foco.priceCents, parcelamento?.max, parcelamento?.minimoCents)
    : null;
  const palavras = vitrine.map((produto) => comArtigo(tipoDoEquipamento(produto.name)));
  const maisLonga = palavras.reduce((a, b) => b.length > a.length ? b : a, "equipamento");
  const palavraEmFoco = foco
    ? comArtigo(tipoDoEquipamento(foco.name) || "equipamento")
    : "o equipamento";

  return (
    <section className="relative overflow-hidden">
      <div className="container-loja relative grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div className="min-w-0">
          <p className="etiqueta flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-jb-500" aria-hidden />
            {[cidade, desde ? `desde ${desde}` : null, "assistência própria"].filter(Boolean).join(" · ")}
          </p>

          <h1 className={`${styles.manchete} fonte-display mt-5 text-[clamp(2.4rem,6.2vw,5rem)] leading-[0.98] text-graf-950`}>
            <span className="sr-only">
              A clínica escolhe o equipamento. A JB responde pelos próximos anos.
            </span>
            <span aria-hidden>
              <span className="block">A clínica escolhe</span>
              <span className="relative inline-grid">
                <span key={palavraEmFoco} className={`${styles.palavra} col-start-1 row-start-1`}>
                  {palavraEmFoco}
                </span>
                <span className="invisible col-start-1 row-start-1">{maisLonga}</span>
              </span>
              <span className="block">A JB responde</span>
              <span className="block text-jb-500">pelos próximos anos.</span>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-graf-700">
            Equipamentos novos e seminovos com condição, preço e garantia para conferir.
            E uma equipe própria para cuidar do que vem depois.
          </p>

          <form
            action="/busca"
            method="get"
            role="search"
            className="mt-7 flex max-w-xl items-center gap-2 rounded-full border border-graf-450 bg-surface py-1.5 pr-1.5 pl-5 transition-colors focus-within:border-jb-500"
          >
            <Search className="size-4 shrink-0 text-graf-500" aria-hidden />
            <label htmlFor="busca-home" className="sr-only">Buscar na loja JB</label>
            <input
              id="busca-home"
              name="q"
              type="search"
              minLength={3}
              placeholder="Produto, marca, modelo, peça ou SKU"
              className="min-h-11 min-w-0 flex-1 bg-transparent py-2 text-corpo text-graf-950 outline-none placeholder:text-graf-500"
            />
            <button
              type="submit"
              className="foco-jb inline-flex min-h-11 shrink-0 items-center rounded-full bg-graf-100 px-5 text-apoio font-semibold text-graf-900 transition-colors hover:bg-graf-200"
            >
              Buscar
            </button>
          </form>

          <nav aria-label="Comece sua compra" className="mt-5 flex flex-wrap gap-3">
            <Link href="/loja" className="botao-jb foco-jb inline-flex min-h-13 items-center gap-2 rounded-full px-7 text-corpo">
              Abrir o catálogo
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/assistencia-tecnica/solicitar"
              className="foco-jb inline-flex min-h-13 items-center gap-2 rounded-lg px-3 text-corpo font-semibold text-graf-700 underline decoration-graf-300 underline-offset-4 hover:text-jb-700"
            >
              <Wrench className="size-4" aria-hidden />
              Abrir chamado técnico
            </Link>
          </nav>

          {numeros.length > 0 ? (
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-graf-200 pt-5" aria-label="Catálogo JB">
              {numeros.slice(0, 3).map((numero) => (
                <div key={numero.rotulo} className="min-w-0">
                  <dt className="etiqueta">{numero.rotulo}</dt>
                  <dd className="fonte-display tabular mt-1 text-2xl text-graf-950">{numero.valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {foco ? (
          <div
            className="relative min-w-0"
            role="group"
            aria-label="Equipamentos em destaque"
            onFocusCapture={(evento) => {
              if (!(evento.target instanceof Element) || !evento.target.closest("[data-controle-rotacao]")) pausar();
            }}
            onPointerDown={(evento) => {
              if (!(evento.target instanceof Element) || !evento.target.closest("[data-controle-rotacao]")) pausar();
            }}
          >
            <div className="mb-2 flex min-h-11 items-center justify-between gap-3">
              <p className="etiqueta flex items-center gap-3">
                <span className="tabular">{String(indice + 1).padStart(2, "0")} / {String(vitrine.length).padStart(2, "0")}</span>
                <span>Em foco</span>
              </p>
              {vitrine.length > 1 ? (
                <button
                  type="button"
                  data-controle-rotacao
                  onClick={alternarPausa}
                  disabled={reduzido}
                  aria-label={reduzido ? "Troca automática desativada pela preferência de movimento" : automatico ? "Pausar troca automática de equipamentos" : "Retomar troca automática de equipamentos"}
                  className="foco-jb inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-apoio font-semibold text-graf-950 hover:bg-graf-50 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  {automatico ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                  {reduzido ? "Troca manual" : automatico ? "Pausar" : "Reproduzir"}
                </button>
              ) : null}
            </div>

            <Link
              href={`/loja/${foco.slug}`}
              aria-label={`Conhecer ${foco.name}`}
              className="foco-jb relative block rounded-2xl"
              onPointerEnter={(evento) => {
                if (evento.pointerType === "mouse") pausar();
              }}
            >
              <div ref={palcoRef} data-palco-imagem-produto className={styles.palco}>
                <svg key={`linha-${foco.slug}`} className={styles.linhaTecnica} viewBox="0 0 600 500" fill="none" aria-hidden focusable="false">
                  <path className={styles.traco} pathLength="1" d="M64 360V410H180M420 90H536V156" />
                  <path d="M180 410H536M64 90H420" className={styles.guia} />
                </svg>
                <span key={`sombra-${foco.slug}`} className={styles.sombra} aria-hidden />
                {foco.imageUrl ? (
                  <Image
                    key={foco.slug}
                    data-imagem-produto
                    src={imagemProdutoSemFundo(foco.imageUrl)}
                    alt={foco.imageAlt || foco.name}
                    fill
                    loading="eager"
                    fetchPriority={indice === 0 ? "high" : "auto"}
                    sizes="(max-width: 1024px) 92vw, 42rem"
                    className={styles.imagem}
                    onLoad={(evento) => { evento.currentTarget.dataset.carregada = "true"; }}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-graf-500">
                    <ImageOff className="size-16" aria-hidden />
                    <span className="sr-only">Imagem indisponível</span>
                  </div>
                )}
              </div>
            </Link>

            <div
              className="grid gap-4 border-t border-graf-200 pt-4 min-[400px]:grid-cols-[minmax(0,1fr)_auto]"
              onPointerEnter={(evento) => {
                if (evento.pointerType === "mouse") pausar();
              }}
            >
              <div key={`nome-${foco.slug}`} className={styles.legenda}>
                <p className="etiqueta text-jb-700">{foco.condition === "seminovo" ? "Seminovo JB" : "Em destaque"}</p>
                <p className="mt-1.5 text-corpo font-extrabold leading-6 text-graf-950">{foco.name}</p>
              </div>
              {temPreco ? (
                <div key={`preco-${foco.slug}`} className={`${styles.preco} min-[400px]:text-right`}>
                  <p className="etiqueta">Preço do equipamento</p>
                  <p className="fonte-display tabular mt-1 text-2xl text-graf-950">{formatarPreco(foco.priceCents)}</p>
                  {parcelas ? (
                    <p className="micro tabular mt-0.5 text-graf-500">{parcelas.parcelas}x de {formatarPreco(parcelas.valorCents)}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {vitrine.length > 1 ? (
              <div
                className="mt-5 grid grid-cols-3 gap-2"
                onPointerEnter={(evento) => {
                  if (evento.pointerType === "mouse") pausar();
                }}
              >
                {vitrine.map((produto, i) => (
                  <button
                    key={produto.slug}
                    type="button"
                    onClick={() => selecionar(i)}
                    aria-pressed={i === indice}
                    className={`foco-jb flex min-h-16 flex-col items-center gap-1 rounded-xl border p-2 transition-colors duration-200 motion-reduce:transition-none ${i === indice ? "border-jb-500 bg-jb-50" : "border-graf-200 hover:border-graf-450"}`}
                  >
                    {produto.imageUrl ? (
                      <Image src={imagemProdutoSemFundo(produto.imageUrl)} alt="" width={80} height={80} className="size-10 object-contain" />
                    ) : (
                      <ImageOff className="size-10 p-2 text-graf-400" aria-hidden />
                    )}
                    <span className="line-2 text-center text-[0.75rem] leading-tight font-bold text-graf-700">{produto.name.split(" ").slice(0, 2).join(" ")}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <p className="sr-only" aria-live={automatico ? "off" : "polite"} aria-atomic="true">
              {foco.name}. Equipamento {indice + 1} de {vitrine.length}.
            </p>
          </div>
        ) : (
          <div className="grid place-items-center gap-2 rounded-2xl border border-graf-200 bg-surface p-12 text-center">
            <ShieldCheck className="size-8 text-jb-500" aria-hidden />
            <strong className="text-bloco text-graf-950">Catálogo JB</strong>
            <p className="text-corpo text-graf-700">Produtos publicados pela equipe aparecem aqui em destaque.</p>
          </div>
        )}
      </div>
    </section>
  );
}
