import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CreditCard, ImageOff, ShieldCheck, Wrench } from "lucide-react";

import type { ProdutoCard } from "@/components/loja/card-produto";
import { calcularParcelas, formatarPreco } from "@/lib/format";

import styles from "./hero-vitrine.module.css";

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
      <div className={`container-jb ${styles.composicao}`}>
        <div className={styles.introducao}>
          <p className={styles.contexto}>
            <span aria-hidden />
            Equipamentos odontológicos{cidade ? ` em ${cidade}` : ""}
          </p>
          <h1 className={styles.titulo}>Equipamentos à altura da sua clínica.</h1>
        </div>

        {destaque ? (
          <Link
            href={`/loja/${destaque.slug}`}
            aria-label={`Conhecer ${destaque.name}`}
            className={styles.palcoProduto}
          >
            <span className={styles.arcoProduto} aria-hidden />
            <span className={styles.seloProduto}>Escolha JB</span>
            <span className={styles.imagemProduto}>
              {destaque.imageUrl ? (
                <Image
                  src={destaque.imageUrl}
                  alt={destaque.imageAlt || destaque.name}
                  fill
                  preload
                  unoptimized={destaque.imageUrl.startsWith("/")}
                  sizes="(max-width: 1024px) 88vw, 43rem"
                  className="object-contain"
                />
              ) : (
                <span className={styles.semImagem}>
                  <ImageOff aria-hidden />
                </span>
              )}
            </span>

            <span className={styles.fichaProduto}>
              <span className={styles.identificacaoProduto}>
                <span>
                  {destaque.condition === "seminovo" ? "Seminovo revisado" : "Em destaque"}
                  {destaque.brandName ? ` · ${destaque.brandName}` : ""}
                </span>
                <strong>{destaque.name}</strong>
              </span>
              <span className={styles.precoProduto}>
                <strong>{temPreco ? formatarPreco(destaque.priceCents) : "Sob consulta"}</strong>
                {parcelas ? (
                  <span>
                    até {parcelas.parcelas}x de {formatarPreco(parcelas.valorCents)}
                  </span>
                ) : null}
              </span>
              <span className={styles.abrirProduto} aria-hidden>
                <ArrowRight />
              </span>
            </span>
          </Link>
        ) : (
          <div className={styles.palcoVazio}>
            <ShieldCheck aria-hidden />
            <p>Catálogo técnico atualizado pela equipe JB.</p>
          </div>
        )}

        <div className={styles.acoes}>
          <p className={styles.resumo}>
            Novos e seminovos revisados, com informação técnica para decidir e uma equipe que
            continua ao seu lado depois da compra.
          </p>

          <nav aria-label="Comece sua busca" className={styles.caminhos}>
            <Link href="/loja" className={styles.acaoPrincipal}>
              Explorar equipamentos
              <ArrowRight aria-hidden />
            </Link>
            <Link href="/seminovos" className={styles.acaoSecundaria}>
              Ver seminovos revisados
            </Link>
          </nav>

          {numeros.length > 0 ? (
            <dl className={styles.numeros} aria-label="Catálogo JB agora">
              {numeros.slice(0, 3).map((numero) => (
                <div key={numero.rotulo}>
                  <dt>{numero.rotulo}</dt>
                  <dd>{numero.valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
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
