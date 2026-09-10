import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff, Search, ShieldCheck, Truck, Wrench } from "lucide-react";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";
import { imagemProdutoSemFundo } from "@/lib/imagem-produto";

import styles from "./hero-vitrine.module.css";

export type NumeroDaHome = { valor: string; rotulo: string };

export function HeroVitrine({
  cidade,
  numeros,
  destaque,
  parcelamento,
}: {
  cidade?: string;
  numeros: NumeroDaHome[];
  destaque: ProdutoCard | null;
  parcelamento?: { max: number; minimoCents: number };
}) {
  const temPreco = Boolean(destaque?.allowDirectPurchase && destaque.priceCents > 0);
  const parcelas =
    destaque && temPreco
      ? calcularParcelas(destaque.priceCents, parcelamento?.max, parcelamento?.minimoCents)
      : null;

  return (
    <section className={styles.hero}>
      <div className={`container-jb ${styles.composicao}`}>
        <div className={styles.copy}>
          <p className={styles.sobretitulo}>
            Loja odontológica{cidade ? ` · ${cidade}` : ""}
          </p>

          <h1 className={styles.titulo}>Produtos odontológicos para comprar com clareza.</h1>

          <p className={styles.resumo}>
            Compare opções, confira preço, condição e especificações e siga para a compra sem
            perder o suporte técnico da JB depois da decisão.
          </p>

          <form action="/busca" method="get" className={styles.busca} role="search">
            <Search aria-hidden />
            <label htmlFor="busca-home" className="sr-only">
              Buscar na loja JB
            </label>
            <input
              id="busca-home"
              name="q"
              type="search"
              minLength={3}
              placeholder="Produto, marca, modelo, peça ou SKU"
            />
            <button type="submit">Buscar</button>
          </form>

          <nav aria-label="Comece sua compra" className={styles.acoes}>
            <Link href="/loja" className={styles.acaoPrincipal}>
              Explorar loja
              <ArrowRight aria-hidden />
            </Link>
            <Link href="/seminovos" className={styles.acaoSecundaria}>
              Ver seminovos
            </Link>
          </nav>

          {numeros.length > 0 ? (
            <dl className={styles.numeros} aria-label="Catálogo JB">
              {numeros.slice(0, 3).map((numero) => (
                <div key={numero.rotulo}>
                  <dt>{numero.rotulo}</dt>
                  <dd>{numero.valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {destaque ? (
          <Link
            href={`/loja/${destaque.slug}`}
            aria-label={`Conhecer ${destaque.name}`}
            className={styles.destaque}
          >
            <div className={styles.topoDestaque}>
              <span className={styles.etiqueta}>
                {destaque.condition === "seminovo" ? "Seminovo" : "Destaque"}
              </span>
              {destaque.brandName ? <span className={styles.marca}>{destaque.brandName}</span> : null}
            </div>

            <div data-palco-imagem-produto className={styles.imagemProduto}>
              {destaque.imageUrl ? (
                <Image
                  data-imagem-produto
                  src={imagemProdutoSemFundo(destaque.imageUrl)}
                  alt={destaque.imageAlt || destaque.name}
                  fill
                  preload
                  unoptimized={destaque.imageUrl.startsWith("/")}
                  sizes="(max-width: 1024px) 92vw, 42rem"
                  className="object-contain"
                />
              ) : (
                <span className={styles.semImagem}>
                  <ImageOff aria-hidden />
                </span>
              )}
            </div>

            <div className={styles.rodapeDestaque}>
              <div className={styles.identificacaoProduto}>
                <strong>{destaque.name}</strong>
                {destaque.model ? <small>{destaque.model}</small> : null}
              </div>
              <div className={styles.precoProduto}>
                <strong>{temPreco ? formatarPreco(destaque.priceCents) : "Sob consulta"}</strong>
                {parcelas ? (
                  <small>
                    até {parcelas.parcelas}x de {formatarPreco(parcelas.valorCents)}
                  </small>
                ) : null}
              </div>
              <span className={styles.abrirProduto} aria-hidden>
                <ArrowRight />
              </span>
            </div>
          </Link>
        ) : (
          <div className={styles.destaqueVazio}>
            <ShieldCheck aria-hidden />
            <strong>Catálogo JB</strong>
            <p>Produtos publicados pela equipe aparecem aqui em destaque.</p>
          </div>
        )}
      </div>

      <div className={styles.faixaConfianca}>
        <ul className="container-jb">
          <li>
            <ShieldCheck aria-hidden />
            <span>Condição e informações na página do produto</span>
          </li>
          <li>
            <Truck aria-hidden />
            <span>Entrega definida antes do pagamento</span>
          </li>
          <li>
            <Wrench aria-hidden />
            <span>Assistência técnica JB disponível</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
