import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  ImageOff,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";

import styles from "./hero-vitrine.module.css";
import overlapStyles from "./hero-vitrine-overlap.module.css";

export type NumeroDaHome = { valor: string; rotulo: string };

const GARANTIAS = [
  { icone: ShieldCheck, titulo: "Laudo técnico", apoio: "Seminovos revisados item a item" },
  { icone: Wrench, titulo: "Assistência própria", apoio: "Equipe JB, sem terceirização" },
  { icone: CreditCard, titulo: "Até 12x sem juros", apoio: "Condições claras para sua clínica" },
  { icone: CalendarCheck, titulo: "Entrega agendada", apoio: "Instalação combinada com você" },
];

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
      <div className={styles.gradeFundo} aria-hidden />
      <div className={`container-jb ${styles.composicao}`}>
        <div className={styles.copy}>
          <div className={styles.contexto}>
            <span className={styles.pontoVivo} aria-hidden />
            <p>Marketplace técnico odontológico{cidade ? ` · ${cidade}` : ""}</p>
          </div>

          <h1 className={styles.titulo}>
            Escolha melhor.
            <span>Equipe sua clínica sem dúvida.</span>
          </h1>

          <p className={styles.resumo}>
            Novos e seminovos revisados, comparação objetiva, parcelamento claro e uma equipe que
            continua ao seu lado depois da compra.
          </p>

          <form action="/busca" method="get" className={styles.busca} role="search">
            <Search aria-hidden />
            <label htmlFor="busca-home" className="sr-only">
              Buscar no catálogo JB
            </label>
            <input
              id="busca-home"
              name="q"
              type="search"
              minLength={3}
              placeholder="Busque por equipamento, marca ou modelo"
            />
            <button type="submit">Buscar</button>
          </form>

          <nav aria-label="Comece sua compra" className={styles.caminhos}>
            <Link href="/loja" className={styles.acaoPrincipal}>
              Explorar equipamentos
              <ArrowRight aria-hidden />
            </Link>
            <Link href="/seminovos" className={styles.acaoSecundaria}>
              Ver seminovos revisados
            </Link>
          </nav>

          <div className={styles.provasRapidas} aria-label="Diferenciais da JB">
            <span><ShieldCheck aria-hidden /> Garantia clara</span>
            <span><Wrench aria-hidden /> Assistência própria</span>
            <span><Sparkles aria-hidden /> Revisão técnica</span>
          </div>

          {numeros.length > 0 ? (
            <dl className={styles.numeros} aria-label="Catálogo JB agora">
              {numeros.slice(0, 3).map((numero) => (
                <div key={numero.rotulo}>
                  <dd>{numero.valor}</dd>
                  <dt>{numero.rotulo}</dt>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {destaque ? (
          <div className={styles.palcoWrapper}>
            <span className={styles.numeroEditorial} aria-hidden>01</span>
            <span className={styles.haloProduto} aria-hidden />

            <Link
              href={`/loja/${destaque.slug}`}
              aria-label={`Conhecer ${destaque.name}`}
              className={styles.palcoProduto}
            >
              <span className={`${styles.seloProduto} ${overlapStyles.badgeFix}`}>
                <span aria-hidden />
                {destaque.condition === "seminovo" ? "Seminovo revisado" : "Destaque JB"}
              </span>

              <span className={`${styles.imagemProduto} ${overlapStyles.mediaFix}`}>
                {destaque.imageUrl ? (
                  <Image
                    src={destaque.imageUrl}
                    alt={destaque.imageAlt || destaque.name}
                    fill
                    preload
                    unoptimized={destaque.imageUrl.startsWith("/")}
                    sizes="(max-width: 1024px) 92vw, 48rem"
                    className="object-contain"
                  />
                ) : (
                  <span className={styles.semImagem}>
                    <ImageOff aria-hidden />
                  </span>
                )}
              </span>

              <span className={`${styles.calloutTopo} ${overlapStyles.calloutFix}`}>
                <small>Compra com continuidade</small>
                <strong>Venda + assistência JB</strong>
              </span>

              <span className={styles.fichaProduto}>
                <span className={styles.identificacaoProduto}>
                  <small>{destaque.brandName || "Equipamento selecionado"}</small>
                  <strong>{destaque.name}</strong>
                </span>
                <span className={styles.precoProduto}>
                  <strong>{temPreco ? formatarPreco(destaque.priceCents) : "Sob consulta"}</strong>
                  {parcelas ? (
                    <small>
                      até {parcelas.parcelas}x de {formatarPreco(parcelas.valorCents)}
                    </small>
                  ) : null}
                </span>
                <span className={styles.abrirProduto} aria-hidden>
                  <ArrowRight />
                </span>
              </span>
            </Link>
          </div>
        ) : (
          <div className={styles.palcoVazio}>
            <ShieldCheck aria-hidden />
            <p>Catálogo técnico atualizado pela equipe JB.</p>
          </div>
        )}
      </div>

      <div className={styles.faixaConfianca}>
        <ul className="container-jb">
          {GARANTIAS.map((garantia) => (
            <li key={garantia.titulo}>
              <span className={styles.iconeGarantia}>
                <garantia.icone aria-hidden />
              </span>
              <span>
                <strong>{garantia.titulo}</strong>
                <small>{garantia.apoio}</small>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
