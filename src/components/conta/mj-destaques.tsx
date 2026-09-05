import { cn } from "@/lib/utils";

/**
 * Faixa de fatos de um registro — o cabeçalho de leitura rápida do prontuário,
 * do pedido ou da ordem de serviço.
 *
 * Não é métrica de painel (aquilo é `CartaoMetrica`, com número grande e
 * clique): aqui cada célula responde a uma pergunta objetiva sobre ESTE
 * registro — em que estado está, até quando vale a garantia, quando é a próxima
 * visita.
 *
 * Célula sem dado não entra na lista: campo vazio repetido em cinza não informa
 * nada e ainda faz a tela parecer quebrada. Por isso a grade é escolhida pela
 * quantidade de itens — até quatro, nunca sobra coluna vazia.
 *
 * A separação entre as células é o próprio vão da grade sobre o fundo grafite
 * claro: uma linha de 1px que continua certa em qualquer ponto de quebra, sem
 * borda que sobra no fim da fila.
 */

export type TomDestaque = "neutro" | "ok" | "atencao" | "alerta" | "info";

const TONS: Record<TomDestaque, { valor: string; selo: string }> = {
  neutro: { valor: "text-graf-950", selo: "bg-graf-100 text-graf-600" },
  ok: { valor: "text-ok-700", selo: "bg-ok-50 text-ok-700" },
  atencao: { valor: "text-warn-700", selo: "bg-warn-50 text-warn-700" },
  alerta: { valor: "text-jb-700", selo: "bg-jb-50 text-jb-700" },
  info: { valor: "text-info-700", selo: "bg-info-50 text-info-700" },
};

/** Colunas por quantidade — o que garante que nenhuma célula fique vazia. */
const GRADE = [
  "grid-cols-1",
  "grid-cols-1",
  "grid-cols-1 sm:grid-cols-2",
  "grid-cols-1 sm:grid-cols-3",
  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
] as const;

export type Destaque = {
  rotulo: string;
  /** Já formatado — data, contagem, rótulo de estado. */
  valor: React.ReactNode;
  detalhe?: string;
  icone?: React.ComponentType<{ className?: string }>;
  tom?: TomDestaque;
};

export function Destaques({
  itens,
  className,
}: {
  /** Até quatro. O que passar disso fica de fora da faixa. */
  itens: Destaque[];
  className?: string;
}) {
  const lista = itens.slice(0, 4);
  if (lista.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-graf-200 bg-graf-200 shadow-card",
        GRADE[lista.length],
        className,
      )}
    >
      {lista.map((item) => {
        const cores = TONS[item.tom ?? "neutro"];
        const Icone = item.icone;

        return (
          /* O HTML só admite um nível de <div> dentro de <dl>, e só com <dt> e
             <dd> dentro dele. A coluna de texto era um segundo <div> e tirava
             o par da lista de definição. Agora o selo é posicionado sobre o
             recuo do cartão, e o <div> tem exatamente o par dentro. */
          <div
            key={item.rotulo}
            className={cn("relative min-w-0 bg-white p-4", Icone && "pl-16")}
          >
            <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-graf-500">
              {Icone ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-4 top-4 flex size-9 items-center justify-center rounded-lg",
                    cores.selo,
                  )}
                >
                  <Icone className="size-[18px]" />
                </span>
              ) : null}
              {item.rotulo}
            </dt>
            <dd>
              <span className={cn("block text-[0.9375rem] font-bold leading-snug", cores.valor)}>
                {item.valor}
              </span>
              {item.detalhe ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-graf-500">
                  {item.detalhe}
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
