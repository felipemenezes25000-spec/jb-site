import { Check } from "lucide-react";

import { Cartao, Etiqueta } from "@/components/ui/data";
import { formatarPreco, plural } from "@/lib/format";
import { precoDoPlano, type PlanoPublico } from "@/lib/plano";
import { cn } from "@/lib/utils";

/**
 * Um plano de manutenção, como ele está cadastrado.
 *
 * Todo número desta tela sai de `MaintenancePlan`: preço, base de cobrança,
 * vigência, visitas incluídas, desconto em peças e a lista de benefícios.
 * Campo não cadastrado não vira linha vazia — some.
 *
 * A ordem do cartão responde às perguntas na ordem em que quem compra as faz:
 * o que é, quanto custa, **pelo que exatamente**, o que está incluído, o que
 * não está. A terceira é a que faltava: preço e vigência sozinhos não dizem se
 * R$ 890 cobre um aparelho ou a clínica inteira, e a diferença entre as duas
 * leituras é dinheiro. Quem decide o que a tela pode afirmar é
 * `precoDoPlano`, em `src/lib/plano.ts` — aqui só se desenha o resultado.
 *
 * O ✓ dos benefícios é marcador de escopo, não de etapa cumprida: ele diz "faz
 * parte deste plano", uma afirmação sobre a oferta. É diferente do check
 * proibido em `docs/evolucao-jb/direcao-visual.md`, que sugeriria serviço já
 * executado em um equipamento específico.
 */

/* O formato de `PlanoPublico` e a conversão a partir do Prisma vivem em
   `src/lib/plano.ts`: a regra é do domínio, e três telas dependem dela. */
export type { PlanoPublico };

/** "12 meses com 2 visitas" → uma visita a cada 6 meses. */
export function periodicidade(plano: PlanoPublico) {
  if (plano.visitasIncluidas <= 0) return null;
  const meses = Math.max(1, Math.round(plano.mesesDeVigencia / plano.visitasIncluidas));
  if (meses === 1) return "Uma visita por mês";
  if (meses === 12) return "Uma visita por ano";
  return `Uma visita a cada ${meses} meses`;
}

export function CartaoPlano({
  plano,
  destaque,
  acao,
  className,
}: {
  plano: PlanoPublico;
  destaque?: boolean;
  acao?: React.ReactNode;
  className?: string;
}) {
  const ritmo = periodicidade(plano);
  const preco = precoDoPlano({
    priceCents: plano.precoCents,
    periodMonths: plano.mesesDeVigencia,
    billingBasis: plano.baseDeCobranca,
    coveredEquipment: plano.equipamentosCobertos,
  });

  return (
    <Cartao
      className={cn(
        "flex h-full flex-col p-6 sm:p-7",
        destaque && "border-jb-200 ring-1 ring-jb-500/15",
        className,
      )}
    >
      {/* h2, não h3: em /planos-de-manutencao o cartão vem logo abaixo do h1
          da página e cada plano é uma seção de primeiro nível. Com h3 o
          documento pulava de h1 para h3. */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-title texto-forte">{plano.nome}</h2>
        {destaque ? (
          <Etiqueta tom="marca" className="mt-1 shrink-0">
            Mais completo
          </Etiqueta>
        ) : null}
      </div>

      {plano.descricao ? (
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-graf-600">
          {plano.descricao}
        </p>
      ) : null}

      <div className="mt-7">
        {preco.tipo === "valor" ? (
          <>
            {/* "A partir de" fica ACIMA do número, não num rodapé: quem lê o
                valor precisa saber que ele é piso antes de guardá-lo. */}
            {preco.aPartirDe ? (
              <p className="text-sm font-semibold text-graf-500">A partir de</p>
            ) : null}
            <p className="tabular text-display leading-none text-graf-950">
              {formatarPreco(preco.centavos)}
            </p>
            <p className="mt-2.5 text-sm text-graf-600">
              {preco.aPartirDe ? preco.periodo : `${preco.unidade}, ${preco.periodo}`}
            </p>
          </>
        ) : (
          <>
            <p className="text-title texto-forte">Sob consulta</p>
            <p className="mt-2.5 text-sm text-graf-500">{preco.explicacao}</p>
          </>
        )}
      </div>

      <dl className="mt-7 divide-y divide-graf-100 border-y border-graf-200 text-sm">
        <Ficha rotulo="Vigência" valor={plural(plano.mesesDeVigencia, "mês", "meses")} />
        <Ficha
          rotulo="Visitas incluídas"
          valor={
            plano.visitasIncluidas > 0
              ? plural(plano.visitasIncluidas, "visita", "visitas")
              : "A combinar"
          }
        />
        {ritmo ? <Ficha rotulo="Periodicidade" valor={ritmo} /> : null}
        {plano.politicaDePecas ? (
          <Ficha rotulo="Peças" valor={plano.politicaDePecas} />
        ) : plano.descontoEmPecas > 0 ? (
          <Ficha
            rotulo="Desconto em peças"
            valor={`${plano.descontoEmPecas}%`}
            destaque="text-ok-700"
          />
        ) : null}
        {plano.politicaDeDeslocamento ? (
          <Ficha rotulo="Deslocamento" valor={plano.politicaDeDeslocamento} />
        ) : null}
        {plano.elegibilidade ? (
          <Ficha rotulo="Para quem" valor={plano.elegibilidade} />
        ) : null}
      </dl>

      {plano.beneficios.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {plano.beneficios.map((beneficio) => (
            <li
              key={beneficio}
              className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-graf-700"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-ok-700" aria-hidden />
              <span>{beneficio}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* O que muda o valor e o que não está coberto ficam JUNTO do preço, na
          mesma decisão. Empurrar isso para um rodapé de página é a forma
          educada de esconder. */}
      {plano.fatoresDePreco.length > 0 ? (
        <ListaDeCondicoes
          titulo="O que pode alterar o valor"
          itens={plano.fatoresDePreco}
          className="mt-6"
        />
      ) : null}

      {plano.exclusoes.length > 0 ? (
        <ListaDeCondicoes titulo="O plano não cobre" itens={plano.exclusoes} className="mt-5" />
      ) : null}

      {acao ? <div className="mt-auto pt-7">{acao}</div> : null}
    </Cartao>
  );
}

/** Uma linha da ficha técnica do plano: rótulo à esquerda, dado à direita. */
function Ficha({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  /** Cor do valor quando ele é uma vantagem, e não só um dado. */
  destaque?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-graf-500">{rotulo}</dt>
      <dd className={cn("tabular min-w-0 text-right font-semibold text-graf-950", destaque)}>
        {valor}
      </dd>
    </div>
  );
}

/**
 * Ressalva do plano — o que muda o preço, o que fica de fora.
 *
 * Marcador neutro, nunca ✓: nada aqui é benefício. Usar o mesmo sinal da lista
 * de inclusões faria uma exclusão parecer uma vantagem em leitura rápida.
 */
function ListaDeCondicoes({
  titulo,
  itens,
  className,
}: {
  titulo: string;
  itens: string[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-graf-500">{titulo}</p>
      <ul className="mt-2.5 space-y-2">
        {itens.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-graf-600">
            <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-graf-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
