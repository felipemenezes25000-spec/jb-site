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
   destaque, com o nome e o preço reais. Não há foto de estrutura nem de
   equipe no acervo da JB — então o hero se apoia no que existe de fato, que
   é o produto, e dá a ele a maior área da tela.

   A placa principal é grande de propósito: equipamento odontológico é objeto
   físico de ticket alto, e miniatura em fundo enorme é o que faz uma loja
   parecer catálogo improvisado. Os outros equipamentos entram como uma tira
   fina embaixo — referência, não um segundo grid de cartões disputando o
   olho com o primeiro.

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
        className="field-orbit pointer-events-none absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(70%_60%_at_78%_8%,#000,transparent)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-graf-50 to-transparent"
      />

      <div
        className={cn(
          "container-jb grid gap-12 py-14 md:py-18 lg:gap-14 lg:py-22 xl:gap-20",
          temVitrine && "lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center",
        )}
      >
        {/* --------------------------------------------------------- texto */}
        <div className={cn(!temVitrine && "max-w-3xl")}>
          {desde || cidade ? (
            <p className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-graf-200 bg-white px-4 py-2 text-[0.8125rem] font-semibold text-graf-600 shadow-xs">
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
            Compra, instalação, manutenção e o histórico de cada máquina no mesmo lugar. A
            JB continua com o equipamento depois da venda — e deixa registrado o que foi
            feito em cada um deles.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkBotao href="/loja" tamanho="lg">
              Ver equipamentos
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </LinkBotao>
            <LinkBotao href="/assistencia-tecnica/solicitar" variante="secundario" tamanho="lg">
              <Wrench className="size-4 shrink-0" aria-hidden />
              Solicitar assistência
            </LinkBotao>
          </div>

          {telefone ? (
            <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-graf-600">
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
              <>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.08em] text-graf-500">
                  Também no catálogo
                </p>
                <ul
                  className={cn("mt-3 grid gap-3", secundarios.length > 1 && "sm:grid-cols-2")}
                >
                  {secundarios.map((produto) => (
                    <li key={produto.slug}>
                      <TiraSecundaria produto={produto} />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** Placa grande: a foto ocupa a maior área do hero, sem moldura disputando. */
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
      <div className="relative aspect-16/11 overflow-hidden bg-gradient-to-b from-white to-graf-50">
        {foto ? (
          <Image
            src={foto.url}
            alt={foto.alt}
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 52vw"
            className="object-contain p-5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03] sm:p-7"
          />
        ) : null}
        <span className="absolute left-5 top-5">
          <Etiqueta tom={condicao.tom}>{condicao.rotulo}</Etiqueta>
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-graf-200 px-6 py-6 sm:px-7">
        <div className="min-w-0">
          {produto.brand ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-graf-500">
              {produto.brand.name}
            </p>
          ) : null}
          <p className="mt-1 line-2 text-title text-graf-950">{produto.name}</p>
          <BlocoPreco produto={produto} parcelamento={parcelamento} className="mt-4" />
        </div>

        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-jb-700 transition-transform duration-200 group-hover:translate-x-0.5">
          Ver equipamento
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

/**
 * Tira fina: miniatura e nome, na horizontal. O preço fica na página do
 * equipamento — aqui a peça só existe para dizer que o catálogo continua.
 */
function TiraSecundaria({ produto }: { produto: ProdutoHome }) {
  const foto = fotoDe(produto);
  const condicao = CONDICAO_HOME[produto.condition];

  return (
    <Link
      href={`/loja/${produto.slug}`}
      className="group flex h-full items-center gap-3.5 rounded-xl border border-graf-200 bg-white p-2.5 pr-4 transition-[border-color,background-color] duration-200 hover:border-graf-300 hover:bg-graf-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-graf-50">
        {foto ? (
          <Image src={foto.url} alt={foto.alt} fill sizes="64px" className="object-contain p-1" />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold uppercase tracking-wider text-graf-500">
          {condicao.rotulo}
        </span>
        <span className="mt-0.5 line-2 block text-sm font-bold leading-snug text-graf-900 transition-colors group-hover:text-jb-700">
          {produto.name}
        </span>
      </span>
    </Link>
  );
}
