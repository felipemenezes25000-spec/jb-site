/* ============================================================================
   Horário de atendimento: aberto agora ou não

   O horário vive nas configurações como texto livre ("Segunda a sexta, das 8h
   às 18h30"), escrito para gente ler. Este módulo tenta entender esse texto e
   dizer se a equipe está atendendo neste minuto, no fuso de São Paulo.

   Quando não entende, devolve `null` e a tela simplesmente não mostra o
   selo. Um "Atendendo agora" chutado é pior que nenhum: a pessoa chama às 22h
   esperando resposta e a JB começa a conversa devendo.
   ============================================================================ */

const FUSO = "America/Sao_Paulo";

const DIAS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

const NOME_DO_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export type Expediente = {
  /** Dias da semana atendidos, 0 = domingo. */
  dias: number[];
  /** Minutos desde a meia-noite. */
  abre: number;
  fecha: number;
};

function semAcento(texto: string) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function minutos(hora: string, minuto: string | undefined) {
  const h = Number(hora);
  const m = minuto ? Number(minuto) : 0;
  if (!Number.isInteger(h) || !Number.isInteger(m) || h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** "Segunda a sexta, das 8h às 18h30" → dias 1..5, 480..1110. */
export function lerExpediente(texto: string): Expediente | null {
  const limpo = semAcento(texto ?? "");

  const faixaDeDias = limpo.match(
    /(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\s+(?:a|ate)\s+(domingo|segunda|terca|quarta|quinta|sexta|sabado)/,
  );
  if (!faixaDeDias) return null;

  const inicio = DIAS[faixaDeDias[1]];
  const fim = DIAS[faixaDeDias[2]];
  const dias: number[] = [];
  for (let dia = inicio; ; dia = (dia + 1) % 7) {
    dias.push(dia);
    if (dia === fim || dias.length === 7) break;
  }

  const horas = [...limpo.matchAll(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/g)];
  if (horas.length < 2) return null;

  const abre = minutos(horas[0][1], horas[0][2]);
  const fecha = minutos(horas[1][1], horas[1][2]);
  if (abre === null || fecha === null || fecha <= abre) return null;

  return { dias, abre, fecha };
}

/** Dia da semana e minuto do dia em São Paulo, qualquer que seja o fuso do aparelho. */
function agoraEmSaoPaulo(agora: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);

  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(valor("weekday"));
  return { dia, minuto: Number(valor("hour")) * 60 + Number(valor("minute")) };
}

function formatarHora(minutoDoDia: number) {
  const h = Math.floor(minutoDoDia / 60);
  const m = minutoDoDia % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export type SituacaoDoAtendimento = {
  aberto: boolean;
  texto: string;
};

export function situacaoDoAtendimento(
  horario: string,
  agora: Date,
): SituacaoDoAtendimento | null {
  const expediente = lerExpediente(horario);
  if (!expediente) return null;

  const { dia, minuto } = agoraEmSaoPaulo(agora);
  if (dia < 0) return null;

  const atendeHoje = expediente.dias.includes(dia);
  if (atendeHoje && minuto >= expediente.abre && minuto < expediente.fecha) {
    return { aberto: true, texto: `Atendendo agora, até ${formatarHora(expediente.fecha)}` };
  }

  const abre = formatarHora(expediente.abre);
  if (atendeHoje && minuto < expediente.abre) {
    return { aberto: false, texto: `Deixe sua mensagem: abrimos hoje às ${abre}` };
  }

  for (let passo = 1; passo <= 7; passo++) {
    const proximo = (dia + passo) % 7;
    if (!expediente.dias.includes(proximo)) continue;
    const quando = passo === 1 ? "amanhã" : NOME_DO_DIA[proximo];
    return { aberto: false, texto: `Deixe sua mensagem: respondemos ${quando} às ${abre}` };
  }

  return null;
}
