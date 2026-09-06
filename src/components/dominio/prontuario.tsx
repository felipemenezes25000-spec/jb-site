import {
  CalendarClock,
  CircleAlert,
  FileText,
  ShieldQuestion,
  Wrench,
} from "lucide-react";
import type { EquipmentOrigin, EquipmentStatus } from "@prisma/client";

import { Etiqueta, type Tom } from "@/components/ui/data";
import { formatarData } from "@/lib/format";
import { ROTULO_EQUIPAMENTO, ROTULO_ORIGEM } from "@/lib/rotulos-equipamento";
import { cn } from "@/lib/utils";

/* ============================================================================
   Componentes do Prontuário Técnico JB

   A assinatura da plataforma não é uma cor nem uma fonte: é a forma de mostrar
   o estado de um equipamento. Estes componentes existem para que a mesma
   informação tenha a mesma aparência na home, na ficha do equipamento, no
   produto seminovo, na assistência e no painel — e para que a regra de
   honestidade seja uma só, escrita num lugar.

   Três invariantes, e elas são o motivo destes componentes existirem:

   1. **Estado nunca é só cor.** Toda etiqueta carrega texto. Daltonismo,
      impressão em preto e branco e leitor de tela não recebem cor nenhuma.

   2. **Fato e previsão não se parecem.** Um evento que aconteceu tem data e
      autor. Uma data calculada — próxima preventiva, fim de garantia — é
      apresentada com verbo no futuro e com a regra ao lado. Nunca com o mesmo
      desenho.

   3. **Ausência não é zero.** Serial desconhecido é "será identificado", não
      um traço. Garantia não cadastrada é "não informada", não "sem garantia".
      A diferença entre não saber e saber que não tem é a diferença entre uma
      ficha honesta e uma que mente por omissão.

   Ver docs/evolucao-jb/direcao-visual.md, seção 3.
   ============================================================================ */

/* ------------------------------------------------------- estado do aparelho */

const TOM_DO_ESTADO: Record<EquipmentStatus, Tom> = {
  operacional: "ok",
  em_manutencao: "aguardando",
  aguardando_peca: "aguardando",
  inoperante: "alerta",
  desativado: "neutro",
};

/**
 * O estado de um equipamento, com texto e semântica além da cor.
 *
 * `operacional` sai de conclusão técnica registrada — conclusão de OS, visita
 * concluída, criação por compra confirmada. Nunca de leitura de QR nem de
 * "ninguém reclamou".
 */
export function EstadoDoEquipamento({
  estado,
  className,
}: {
  estado: EquipmentStatus;
  className?: string;
}) {
  return (
    <Etiqueta tom={TOM_DO_ESTADO[estado]} className={className}>
      {ROTULO_EQUIPAMENTO[estado]}
    </Etiqueta>
  );
}

/* ------------------------------------------------------------------ serial */

/**
 * Número de série, em monoespaçada — ou o estado de identificação pendente.
 *
 * Serial é o dado que a pessoa vai conferir caractere a caractere contra uma
 * etiqueta colada na máquina; por isso monoespaçada, que é onde `1` e `l` se
 * separam. Ver direcao-visual.md, seção 2.
 *
 * Sem serial, o componente NÃO desenha um traço: ele diz o que vai acontecer.
 * Um equipamento comprado hoje costuma ter o serial atribuído na preparação ou
 * na instalação, e "—" faria parecer que o dado se perdeu.
 */
export function Serial({
  numero,
  className,
}: {
  numero: string | null | undefined;
  className?: string;
}) {
  const valor = (numero ?? "").trim();

  if (!valor) {
    return (
      <span className={cn("text-sm italic text-graf-500", className)}>
        Será identificado na preparação
      </span>
    );
  }

  return (
    <span
      className={cn(
        "label-mono inline-flex items-center rounded-md border border-graf-200 bg-graf-50 px-2 py-0.5 text-graf-800",
        className,
      )}
    >
      {valor}
    </span>
  );
}

/* ---------------------------------------------------------------- garantia */

export type DadosDeGarantia = {
  /** Fim da cobertura. `null` quando não há garantia cadastrada. */
  ate: Date | null;
  /** De onde ela vem: compra na JB, contrato, cadastro do próprio cliente. */
  origem: EquipmentOrigin;
};

/**
 * Situação da garantia — prazo, origem e o que ela NÃO afirma.
 *
 * Um equipamento que a clínica cadastrou por conta própria não ganha garantia
 * JB por inferência: `cadastro_cliente` sem data é "não informada", e não "sem
 * garantia". A JB não sabe o que o fabricante deu.
 */
export function SituacaoDaGarantia({
  garantia,
  className,
}: {
  garantia: DadosDeGarantia;
  className?: string;
}) {
  const { ate, origem } = garantia;

  if (!ate) {
    return (
      <div className={className}>
        <p className="flex items-center gap-2 text-sm font-semibold text-graf-700">
          <ShieldQuestion className="size-4 shrink-0 text-graf-400" aria-hidden />
          Garantia não informada
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-graf-500">
          {origem === "compra_jb"
            ? "O prazo ainda não foi registrado para este equipamento."
            : "Equipamento registrado pela clínica. A JB não tem o prazo de fábrica."}
        </p>
      </div>
    );
  }

  const vigente = ate.getTime() > Date.now();

  return (
    <div className={className}>
      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-graf-800">
        <ShieldQuestion
          className={cn("size-4 shrink-0", vigente ? "text-ok-700" : "text-graf-400")}
          aria-hidden
        />
        {vigente ? "Garantia até" : "Garantia encerrada em"} {formatarData(ate)}
      </p>
      <p className="mt-1 text-[0.8125rem] leading-relaxed text-graf-500">
        Origem: {ROTULO_ORIGEM[origem].toLowerCase()}.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- preventiva */

/**
 * A próxima revisão — uma PREVISÃO, e desenhada como tal.
 *
 * Nunca aparece como evento cumprido. A data sai da periodicidade cadastrada;
 * sem periodicidade, o componente diz que ela ainda não foi definida, em vez
 * de calcular um intervalo padrão que ninguém combinou.
 */
export function ProximaPreventiva({
  data,
  className,
}: {
  data: Date | null | undefined;
  className?: string;
}) {
  if (!data) {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-graf-500", className)}>
        <CalendarClock className="size-4 shrink-0 text-graf-400" aria-hidden />
        Próxima preventiva ainda não definida
      </p>
    );
  }

  const atrasada = data.getTime() < Date.now();

  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-2 text-sm",
        atrasada ? "font-semibold text-jb-700" : "text-graf-700",
        className,
      )}
    >
      {atrasada ? (
        <CircleAlert className="size-4 shrink-0" aria-hidden />
      ) : (
        <CalendarClock className="size-4 shrink-0 text-graf-400" aria-hidden />
      )}
      {atrasada ? "Preventiva vencida em" : "Próxima preventiva prevista para"}{" "}
      {formatarData(data)}
    </p>
  );
}

/* ----------------------------------------------------------- linha do tempo */

export type EventoDaTimeline = {
  id: string;
  titulo: string;
  detalhe?: string | null;
  /** `null` em etapa prevista que ainda não aconteceu. */
  data: Date | null;
  /** Quem registrou. Ausente em evento gerado pelo sistema. */
  autor?: string | null;
};

/**
 * A linha do tempo de um equipamento.
 *
 * O ponto inteiro deste componente é a separação visual entre o que aconteceu
 * e o que está previsto. Evento com data ganha marcador cheio e a data ao
 * lado; etapa prevista ganha marcador vazado, texto mais claro e a palavra
 * "previsto". Sem essa distinção, uma ficha de equipamento novo pareceria um
 * histórico de manutenções que nunca houve.
 */
export function LinhaDoTempo({
  eventos,
  className,
}: {
  eventos: EventoDaTimeline[];
  className?: string;
}) {
  if (eventos.length === 0) {
    return (
      <p className={cn("text-sm leading-relaxed text-graf-500", className)}>
        Ainda não há eventos registrados para este equipamento. O primeiro
        aparece quando houver um chamado, uma visita ou um documento.
      </p>
    );
  }

  return (
    <ol className={cn("relative", className)}>
      {eventos.map((evento, indice) => {
        const aconteceu = evento.data !== null;
        const ultimo = indice === eventos.length - 1;

        return (
          <li key={evento.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* fio ligando os marcadores, menos depois do último */}
            {!ultimo ? (
              <span
                aria-hidden
                className="absolute left-[7px] top-4 h-full w-px bg-graf-200"
              />
            ) : null}

            <span
              aria-hidden
              className={cn(
                "relative mt-1 size-3.5 shrink-0 rounded-full border-2",
                aconteceu ? "border-jb-500 bg-jb-500" : "border-graf-300 bg-white",
              )}
            />

            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-bold leading-snug",
                  aconteceu ? "text-graf-950" : "text-graf-500",
                )}
              >
                {evento.titulo}
              </p>

              <p className="mt-0.5 text-[0.8125rem] text-graf-500">
                {aconteceu ? (
                  <>
                    {formatarData(evento.data as Date)}
                    {evento.autor ? ` · ${evento.autor}` : ""}
                  </>
                ) : (
                  <span className="italic">Previsto — ainda não aconteceu</span>
                )}
              </p>

              {evento.detalhe ? (
                <p className="mt-1.5 text-sm leading-relaxed text-graf-600">
                  {evento.detalhe}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------- ficha curta */

export type ResumoDoProntuario = {
  nome: string;
  marca?: string | null;
  modelo?: string | null;
  serial?: string | null;
  estado: EquipmentStatus;
  origem: EquipmentOrigin;
  garantiaAte: Date | null;
  proximaPreventiva: Date | null;
  local?: string | null;
};

/**
 * O cabeçalho de um prontuário: quem é a máquina e como ela está.
 *
 * A ordem responde às perguntas na sequência em que quem abre a ficha as faz:
 * que aparelho é este, onde ele está, como está agora, até quando tem cobertura
 * e quando volta o técnico.
 */
export function CabecalhoDoProntuario({
  resumo,
  className,
}: {
  resumo: ResumoDoProntuario;
  className?: string;
}) {
  const identificacao = [resumo.marca, resumo.modelo].filter(Boolean).join(" · ");

  return (
    <div className={cn("rounded-2xl border border-graf-200 bg-white p-5 sm:p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {identificacao ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-graf-500">
              {identificacao}
            </p>
          ) : null}
          <h2 className="mt-1 text-title texto-forte">{resumo.nome}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Serial numero={resumo.serial} />
            {resumo.local ? (
              <span className="text-sm text-graf-600">{resumo.local}</span>
            ) : null}
          </div>
        </div>

        <EstadoDoEquipamento estado={resumo.estado} className="mt-1 shrink-0" />
      </div>

      <dl className="mt-6 grid gap-5 border-t border-graf-200 pt-5 sm:grid-cols-2">
        <div>
          <dt className="sr-only">Garantia</dt>
          <dd>
            <SituacaoDaGarantia
              garantia={{ ate: resumo.garantiaAte, origem: resumo.origem }}
            />
          </dd>
        </div>
        <div>
          <dt className="sr-only">Próxima preventiva</dt>
          <dd>
            <ProximaPreventiva data={resumo.proximaPreventiva} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------ ações contextuais */

/**
 * O que dá para fazer a partir desta ficha.
 *
 * Cada ação leva a um fluxo que existe. Nenhum botão aqui abre modal de
 * "em breve" — o escopo é explícito: nada de controle inerte.
 */
export function AcoesDoProntuario({
  abrirChamado,
  verDocumentos,
  className,
}: {
  abrirChamado: React.ReactNode;
  verDocumentos: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <span className="inline-flex items-center gap-1.5 text-graf-400" aria-hidden>
        <Wrench className="size-4" />
      </span>
      {abrirChamado}
      <span className="inline-flex items-center gap-1.5 text-graf-400" aria-hidden>
        <FileText className="size-4" />
      </span>
      {verDocumentos}
    </div>
  );
}
