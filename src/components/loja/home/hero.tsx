import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone, Wrench } from "lucide-react";

import { LinkBotao } from "@/components/ui/button";
import { Etiqueta } from "@/components/ui/data";
import {
  BlocoPreco,
  CONDICAO_HOME,
  fotoDe,
  type Parcelamento,
  type ProdutoHome,
} from "@/components/loja/home/comum";
import { telHref } from "@/lib/format";
import type { SettingsMap } from "@/lib/settings";
import { cn } from "@/lib/utils";

/* ============================================================================
   Hero da página principal

   Texto à esquerda, catálogo de verdade à direita: a foto do equipamento em
   destaque, com o nome e o preço reais, e duas outras unidades ao lado. Não
   há foto de estrutura nem de equipe no acervo da JB — então o hero se apoia
   no que existe de fato, que é o produto.

   Sem produto com foto cadastrada, a coluna da direita simplesmente não
   aparece e o texto ocupa a faixa inteira. Nada de imagem de banco.
   ============================================================================ */

export function Hero({
  configuracoes: s,
  produtos,
  parcelamento,
}: {
  configuracoes: SettingsMap;
  /** Já filtrados: só entram aqui produtos com foto cadastrada. */
  produtos: ProdutoHome[];
  parcelamento: Parcelamento;
}) {
  const principal = produtos[0];
  const secundarios = produtos.slice(1, 3);
  const temVitrine = Boolean(principal);

  const telefone = s.telefone.trim();
  const desde = s.empresa_desde.trim();
  const cidade = s.endereco_cidade.trim();

  return (
    <section className="relative isolate overflow-hidden border-b border-graf-200 bg-white">
      <span
        aria-hidden
        className="field-orbit pointer-events-none absolute inset-0 -z-10 opacity-50 [mask-image:radial-gradient(75%_65%_at_75%_10%,#000,transparent)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-graf-50 to-transparent"
      />

      <div
        className={cn(
          "container-jb grid gap-12 py-14 md:py-20 lg:gap-16 lg:py-24",
          temVitrine && "lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:items-center",
        )}
      >
        {/* --------------------------------------------------------- texto */}
        <div className={cn(!temVitrine && "max-w-3xl")}>
          {desde || cidade ? (
            <p className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-graf-200 bg-white px-4 py-2 text-xs font-semibold text-graf-600 shadow-xs">
              <span className="size-1.5 shrink-0 rounded-full bg-jb-500" aria-hidden />
              <span>
                {`Equipe técnica própria${cidade ? ` em ${cidade}` : ""}${
                  desde ? ` · desde ${desde}` : ""
                }`}
              </span>
            </p>
          ) : null}

          <h1 className="mt-6 text-hero text-balance text-graf-950">
            Equipamentos odontológicos. Assistência técnica. Tudo em um só lugar
            <span className="text-jb-500">.</span>
          </h1>

          <p className="texto-guia mt-6 max-w-xl text-graf-600">
            Da compra à manutenção, a JB acompanha todo o ciclo dos equipamentos da sua
            clínica — e deixa registrado o que foi feito em cada um deles.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/loja" tamanho="lg">
              Comprar equipamentos
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" tamanho="lg">
              <Wrench className="size-4 shrink-0" aria-hidden />
              Solicitar assistência
            </LinkBotao>
          </div>

          {telefone ? (
            <p className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-graf-600">
              <Phone className="size-4 shrink-0 text-graf-400" aria-hidden />
              <span>Prefere falar agora?</span>
              <a
                href={telHref(telefone)}
                className="inline-flex min-h-11 items-center font-bold text-jb-700 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
              >
                {telefone}
              </a>
              {/* O ponto separador é do desktop, onde a linha inteira cabe.
                  No celular a frase quebra e a linha começava com "·", que
                  lido em voz alta e olhado de perto vira um marcador solto. */}
              {s.horario.trim() ? (
                <span className="text-graf-500 sm:before:mr-1.5 sm:before:content-['·']">
                  {s.horario}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>

        {/* ------------------------------------------------------- vitrine */}
        {principal ? (
          <div className="relative">
            <VitrinePrincipal produto={principal} parcelamento={parcelamento} />

            {secundarios.length > 0 ? (
              <ul className="mt-4 grid grid-cols-2 gap-4">
                {secundarios.map((produto) => (
                  <li key={produto.slug} className={cn(secundarios.length === 1 && "col-span-2")}>
                    <VitrineSecundaria produto={produto} unica={secundarios.length === 1} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Placa grande: foto dominante e a informação que decide a visita. */
function VitrinePrincipal({
  produto,
  parcelamento,
}: {
  produto: ProdutoHome;
  parcelamento: Parcelamento;
}) {
  const foto = fotoDe(produto);
  const condicao = CONDICAO_HOME[produto.condition];

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group block overflow-hidden rounded-2xl border border-graf-200 bg-white shadow-raised transition-[border-color,box-shadow] duration-200 hover:border-graf-300 hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <div className="relative aspect-4/3 overflow-hidden bg-gradient-to-b from-white to-graf-50">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 44vw"
            className="object-contain p-8 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] sm:p-10"
          />
        ) : null}
        <span className="absolute left-4 top-4">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-graf-200 px-5 py-5 sm:px-6">
        <div className="min-w-0">
          {produto.brand ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-graf-500">
              {produto.brand.name}
            </p>
          ) : null}
          <p className="mt-1 line-2 text-lg font-bold leading-snug text-graf-950">
            {produto.name}
          </p>
          <BlocoPreco produto={produto} parcelamento={parcelamento} className="mt-3" />
        </div>

        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
          Ver equipamento
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/** Placa menor: foto e nome. O preço fica na página do equipamento. */
function VitrineSecundaria({ produto, unica }: { produto: ProdutoHome; unica: boolean }) {
  const foto = fotoDe(produto);
  const condicao = CONDICAO_HOME[produto.condition];

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-graf-200 bg-white transition-[border-color,box-shadow] duration-200 hover:border-graf-300 hover:shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <div
        className={cn(
          "relative overflow-hidden bg-graf-50",
          unica ? "aspect-16/9" : "aspect-4/3",
        )}
      >
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            sizes="(max-width: 1024px) 45vw, 22vw"
            className="object-contain p-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-4 py-3.5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-graf-500">
          {condicao.rotulo}
        </p>
        <p className="line-2 text-sm font-bold leading-snug text-graf-900 group-hover:text-jb-700">
          {produto.name}
        </p>
      </div>
    </Link>
  );
}
