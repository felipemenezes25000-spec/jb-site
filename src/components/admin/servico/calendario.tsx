import Link from "next/link";

import {
  AcoesDoAgendamento,
  type TecnicoDaEscala,
} from "@/components/admin/servico/acoes-agendamento";
import { Vazio } from "@/components/ui/data";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Calendário da agenda técnica

   Mês e semana desenhados na mão, sem biblioteca: o que existe aqui é uma
   grade de sete colunas e uma lista de compromissos por dia — não vale carregar
   um calendário inteiro de terceiro para isso.

   Toda a matemática de data acontece em chaves "AAAA-MM-DD" já no fuso de São
   Paulo. Somar 24 horas a um `Date` e reler o dia local é o erro clássico que
   faz o compromisso das 23h aparecer no dia seguinte; aqui a chave é gerada
   pelo `Intl`, que respeita o fuso, e a soma é feita a partir do meio-dia.

   No celular a grade vira lista por dia: sete colunas em 360px não se leem.
   ============================================================================ */

const FUSO = "America/Sao_Paulo";

const formatoChave = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const formatoMes = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  month: "long",
  year: "numeric",
});

const formatoDiaLongo = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const formatoHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
});

export type TipoCompromisso = "visita" | "manutencao" | "instalacao";

export type Compromisso = {
  id: string;
  tipo: TipoCompromisso;
  titulo: string;
  detalhe: string;
  quando: Date;
  /** Falso quando a data é só a prevista, ainda sem hora marcada. */
  temHora: boolean;
  href: string;
  tecnico?: string | null;
  corDoTecnico?: string | null;
  status: string;
  cancelado?: boolean;
  /**
   * `ServiceAppointment.id` da visita técnica. Preenchido, a agenda oferece
   * remarcar e cancelar sem sair da tela.
   */
  agendamentoId?: string | null;
  /**
   * `Technician.id` de quem está escalado. Anda junto com `tecnicos` na
   * `Calendario`: sem os dois, o campo de técnico nem aparece na remarcação —
   * um select vazio enviaria "" e apagaria a escala em silêncio.
   */
  tecnicoId?: string | null;
};

const PREFIXO_VISITA = "visita-";

/**
 * Descobre qual `ServiceAppointment` está por trás do compromisso.
 *
 * O caminho oficial é o campo `agendamentoId`. O `id` com prefixo é a rede de
 * segurança para quem monta a lista à moda antiga (`visita-<id>`, que é como os
 * três tipos convivem sem colidir): sem ele, os botões simplesmente não
 * aparecem — nada quebra, só deixa de ser oferecido.
 */
function agendamentoDe(compromisso: Compromisso) {
  if (compromisso.tipo !== "visita") return null;
  if (compromisso.agendamentoId) return compromisso.agendamentoId;
  return compromisso.id.startsWith(PREFIXO_VISITA)
    ? compromisso.id.slice(PREFIXO_VISITA.length)
    : null;
}

/** Visita que ainda pode mudar de dia. Concluída e cancelada são história. */
function visitaEmAberto(compromisso: Compromisso) {
  return (
    compromisso.tipo === "visita" &&
    (compromisso.status === "agendado" || compromisso.status === "em_andamento")
  );
}

export const ROTULO_TIPO_AGENDA: Record<TipoCompromisso, string> = {
  visita: "Visita técnica",
  manutencao: "Manutenção preventiva",
  instalacao: "Instalação",
};

const ESTILO_TIPO: Record<TipoCompromisso, string> = {
  visita: "border-jb-500/40 bg-jb-50 text-jb-800",
  manutencao: "border-info-500/40 bg-info-50 text-info-700",
  instalacao: "border-ok-500/40 bg-ok-50 text-ok-700",
};

const DIAS_CURTOS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/* ------------------------------------------------------------------ datas */

export function chaveDoDia(data: Date) {
  return formatoChave.format(data);
}

/** Meio-dia da data, para que somar dias nunca esbarre em virada de fuso. */
function meioDia(chave: string) {
  return new Date(`${chave}T12:00:00-03:00`);
}

export function somarDias(chave: string, dias: number) {
  return chaveDoDia(new Date(meioDia(chave).getTime() + dias * 86_400_000));
}

/** 0 = domingo. */
function diaDaSemana(chave: string) {
  return meioDia(chave).getUTCDay();
}

export function somarMeses(chave: string, meses: number) {
  const [ano, mes] = chave.split("-").map(Number);
  const alvo = new Date(Date.UTC(ano, mes - 1 + meses, 1, 12));
  return chaveDoDia(alvo);
}

export function primeiroDiaDoMes(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

/** Intervalo coberto pela visão, para a página consultar só o necessário. */
export function intervaloDaVisao(visao: "mes" | "semana", ancora: string) {
  const dias = gradeDeDias(visao, ancora);
  return {
    inicio: new Date(`${dias[0]}T00:00:00-03:00`),
    fim: new Date(`${somarDias(dias[dias.length - 1], 1)}T00:00:00-03:00`),
    dias,
  };
}

export function gradeDeDias(visao: "mes" | "semana", ancora: string): string[] {
  if (visao === "semana") {
    const inicio = somarDias(ancora, -diaDaSemana(ancora));
    return Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  }

  const primeiro = primeiroDiaDoMes(ancora);
  const [ano, mes] = primeiro.split("-").map(Number);
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const deslocamento = diaDaSemana(primeiro);
  const semanas = Math.ceil((deslocamento + diasNoMes) / 7);
  const inicio = somarDias(primeiro, -deslocamento);
  return Array.from({ length: semanas * 7 }, (_, i) => somarDias(inicio, i));
}

export function tituloDaVisao(visao: "mes" | "semana", ancora: string) {
  if (visao === "mes") {
    const texto = formatoMes.format(meioDia(primeiroDiaDoMes(ancora)));
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  const dias = gradeDeDias("semana", ancora);
  const de = formatoDiaLongo.format(meioDia(dias[0])).replace(/^\w+-feira, |^\w+, /, "");
  const ate = formatoDiaLongo.format(meioDia(dias[6])).replace(/^\w+-feira, |^\w+, /, "");
  return `${de} a ${ate}`;
}

/* --------------------------------------------------------------- desenho */

export function Calendario({
  visao,
  ancora,
  compromissos,
  hoje,
  tecnicos = [],
}: {
  visao: "mes" | "semana";
  /** Dia de referência, no formato "AAAA-MM-DD". */
  ancora: string;
  compromissos: Compromisso[];
  hoje: string;
  /**
   * Escala disponível para remarcar. Lista vazia esconde o campo de técnico —
   * é diferente de mostrá-lo vazio, que apagaria o técnico já escalado.
   */
  tecnicos?: TecnicoDaEscala[];
}) {
  const dias = gradeDeDias(visao, ancora);
  const mesAtual = primeiroDiaDoMes(ancora).slice(0, 7);

  const porDia = new Map<string, Compromisso[]>();
  for (const item of compromissos) {
    const chave = chaveDoDia(item.quando);
    const lista = porDia.get(chave);
    if (lista) lista.push(item);
    else porDia.set(chave, [item]);
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => a.quando.getTime() - b.quando.getTime());
  }

  const comAlgo = dias.filter((dia) => (porDia.get(dia)?.length ?? 0) > 0);

  return (
    <>
      {/* ------------------------------------------------------- desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-graf-200 bg-white shadow-card md:block">
        <div className="grid grid-cols-7 border-b border-graf-200 bg-graf-50">
          {DIAS_CURTOS.map((dia) => (
            <div
              key={dia}
              className="px-2 py-2 text-center text-apoio font-bold uppercase tracking-[0.08em] text-graf-500"
            >
              {dia}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {dias.map((dia) => {
            const doMes = dia.slice(0, 7) === mesAtual;
            const ehHoje = dia === hoje;
            const itens = porDia.get(dia) ?? [];

            return (
              <div
                key={dia}
                className={cn(
                  "min-h-28 border-b border-r border-graf-200 p-1.5 last:border-r-0",
                  visao === "semana" && "min-h-64",
                  doMes ? "bg-white" : "bg-graf-50/70",
                )}
              >
                <p
                  className={cn(
                    "tabular mb-1 flex items-center gap-1.5 px-1 text-xs font-semibold",
                    ehHoje
                      ? "text-jb-700"
                      : doMes
                        ? "text-graf-700"
                        : "text-graf-500",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-5 items-center justify-center rounded-full",
                      ehHoje && "bg-jb-500 text-white",
                    )}
                  >
                    {Number(dia.slice(8))}
                  </span>
                  {ehHoje ? <span className="text-xs font-bold uppercase tracking-[0.08em]">hoje</span> : null}
                </p>

                <ul className="space-y-1">
                  {itens.map((item) => (
                    <li key={item.id}>
                      <ItemDoDia compromisso={item} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------- mobile */}
      <div className="md:hidden">
        {comAlgo.length === 0 ? (
          <Vazio
            titulo="Nada marcado neste período"
            descricao="Visitas técnicas, manutenções preventivas e instalações aparecem aqui assim que ganham data."
          />
        ) : (
          <ul className="space-y-4">
            {comAlgo.map((dia) => (
              <li key={dia}>
                <h3
                  className={cn(
                    "mb-2 text-sm font-bold",
                    dia === hoje ? "text-jb-700" : "text-graf-800",
                  )}
                >
                  {formatoDiaLongo.format(meioDia(dia))}
                  {dia === hoje ? " · hoje" : ""}
                </h3>
                <ul className="space-y-2">
                  {(porDia.get(dia) ?? []).map((item) => (
                    <li key={item.id}>
                      <ItemDoDia compromisso={item} detalhado />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>

      <VisitasParaRemarcar compromissos={compromissos} tecnicos={tecnicos} />
    </>
  );
}

/**
 * Visitas técnicas do período que ainda podem mudar de dia.
 *
 * Fica embaixo da grade, e não dentro de cada quadradinho, por uma razão de
 * espaço: a célula de um dia tem pouco mais de cem pixels — dois botões ali
 * empurrariam o compromisso para fora da vista. Aqui embaixo eles cabem, e o
 * gesto continua na mesma tela: o telefone toca pedindo para adiar a visita de
 * quinta e a pessoa resolve sem navegar para o chamado.
 *
 * A lista some sozinha quando não há nada em aberto — e some também no perfil
 * que não escreve, porque a área de assistência não tem papel só de leitura:
 * quem abre a agenda é quem opera a agenda.
 */
function VisitasParaRemarcar({
  compromissos,
  tecnicos,
}: {
  compromissos: Compromisso[];
  tecnicos: TecnicoDaEscala[];
}) {
  const abertas = compromissos
    .filter((item) => visitaEmAberto(item) && agendamentoDe(item))
    .sort((a, b) => a.quando.getTime() - b.quando.getTime());

  if (abertas.length === 0) return null;

  return (
    <section className="rounded-xl border border-graf-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-bold text-graf-950">Visitas técnicas em aberto</h2>
      <p className="mt-0.5 text-sm text-graf-500">
        {plural(abertas.length, "visita marcada", "visitas marcadas")} neste período.
        Remarcar move o compromisso — não cria um segundo.
      </p>

      <ul className="mt-4 divide-y divide-graf-200 border-t border-graf-200">
        {abertas.map((visita) => {
          const agendamentoId = agendamentoDe(visita);
          if (!agendamentoId) return null;

          /*
           * O campo de técnico só entra quando a escala é conhecida: ou o
           * compromisso trouxe o `tecnicoId`, ou não há técnico nenhum para
           * perder. Não sabendo o id de quem está escalado, mostrar o select
           * seria oferecer um "Definir depois" que apagaria a escala.
           */
          const conheceEscala = visita.tecnicoId !== undefined || !visita.tecnico;

          return (
            <li
              key={visita.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
            >
              {/* `flex-1` com base zero não dispara a quebra de linha: ele
                  encolhe até sobrar. Em 360px a coluna do texto ficava com
                  28px e a visita virava "se…" / "Ch…" ao lado dos dois botões.
                  Com uma largura mínima, as ações descem para a linha de
                  baixo e o texto volta a ser legível. */}
              <span className="min-w-[14rem] flex-1">
                <Link
                  href={visita.href}
                  /* `block` deixava o alvo com a altura da linha: 316x20 no
                     dedo. `flex items-center` com altura mínima no toque dá
                     os 44px sem alterar a densidade no mouse, que é o que a
                     lista de operação precisa. */
                  className="flex items-center truncate text-sm font-semibold text-graf-900 pointer-coarse:min-h-11 hover:text-jb-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  {formatoDiaLongo.format(visita.quando)} ·{" "}
                  {formatoHora.format(visita.quando)} — {visita.titulo}
                </Link>
                <span className="block truncate text-apoio text-graf-500">
                  {visita.detalhe || "Sem chamado vinculado"}
                  {visita.tecnico ? ` · ${visita.tecnico}` : " · sem técnico"}
                </span>
              </span>

              <AcoesDoAgendamento
                agendamentoId={agendamentoId}
                quandoAtual={visita.quando.toISOString()}
                status={visita.status}
                titulo={`a visita de ${formatoDiaLongo.format(visita.quando)}`}
                tecnicoAtual={visita.tecnicoId ?? null}
                tecnicos={conheceEscala ? tecnicos : []}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ItemDoDia({
  compromisso,
  detalhado,
}: {
  compromisso: Compromisso;
  detalhado?: boolean;
}) {
  const hora = compromisso.temHora ? formatoHora.format(compromisso.quando) : "prevista";

  return (
    <Link
      href={compromisso.href}
      className={cn(
        "block rounded-md border px-2 py-1.5 transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-jb-500",
        ESTILO_TIPO[compromisso.tipo],
        compromisso.cancelado && "opacity-55 line-through decoration-1",
        /* No mouse a grade do mês fica densa de propósito — é uma tela de
           operação, e altura sobrando ali custa dias visíveis. No toque o
           mesmo item cresce para 44px, que é a convenção que `ui/button.tsx`
           já usa. Media 316x20 no dedo. */
        detalhado ? "min-h-11 px-3 py-2.5" : "pointer-coarse:min-h-11 hover:brightness-[0.97]",
      )}
    >
      <span className="flex items-center gap-1.5">
        {compromisso.corDoTecnico ? (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
            style={{ backgroundColor: compromisso.corDoTecnico }}
          />
        ) : null}
        <span className="tabular text-xs font-bold">{hora}</span>
        <span className="line-2 min-w-0 flex-1 text-xs font-semibold">{compromisso.titulo}</span>
      </span>

      {/* Sem `opacity-90` na linha de apoio. O texto já é `text-ok-700` sobre
          `bg-ok-50`, que dá 4,83:1; a opacidade derrubava para 4,33:1 e
          reprovava o mínimo de 4,5:1 da WCAG 1.4.3. A hierarquia entre as
          duas linhas vem do peso da fonte, que não mexe em contraste. */}
      {detalhado ? (
        <span className="mt-1 block text-xs font-normal">
          {ROTULO_TIPO_AGENDA[compromisso.tipo]}
          {compromisso.detalhe ? ` · ${compromisso.detalhe}` : ""}
          {compromisso.tecnico ? ` · ${compromisso.tecnico}` : " · sem técnico"}
        </span>
      ) : null}
    </Link>
  );
}

/** Legenda das cores. Cor nunca é o único indicador: o texto vem junto. */
export function LegendaDaAgenda() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-apoio text-graf-600">
      {(Object.keys(ROTULO_TIPO_AGENDA) as TipoCompromisso[]).map((tipo) => (
        <li key={tipo} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("size-3 rounded border", ESTILO_TIPO[tipo])}
          />
          {ROTULO_TIPO_AGENDA[tipo]}
        </li>
      ))}
    </ul>
  );
}
