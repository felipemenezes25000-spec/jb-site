/* ============================================================================
   Cases técnicos — o que precisa existir antes de um case ir ao ar

   Um case é uma afirmação sobre um atendimento que aconteceu, feita em nome
   de um cliente que existe. Publicar um errado não é publicar um texto ruim:
   é atribuir a uma clínica real um problema, um diagnóstico e um resultado
   que ela não confirmou.

   Por isso são três exigências, e nenhuma delas é opcional:

   1. **Autorização do cliente.** Case completo e revisado, sem autorização,
      não vai ao ar. O vínculo com a OS prova o que aconteceu para a JB; ele
      não autoriza publicar.
   2. **Diagnóstico confirmado.** O campo se chama "confirmado" e é isso que
      ele guarda — o que a bancada verificou, não o que se suspeitou nem o que
      um resumo automático concluiu.
   3. **Técnico e revisor identificados**, e diferentes entre si.

   Módulo puro, testável sem banco.
   ============================================================================ */

export type EstadoDoCase = "rascunho" | "em_revisao" | "publicado" | "arquivado";

export const ROTULO_ESTADO_CASE: Record<EstadoDoCase, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em revisão",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export type FatosDoCase = {
  temTitulo: boolean;
  temSintoma: boolean;
  /** O que foi confirmado na bancada. */
  temDiagnostico: boolean;
  temIntervencao: boolean;
  temTesteFinal: boolean;
  tecnicoId: string | null;
  revisorId: string | null;
  revisadoEm: Date | null;
  /** O cliente autorizou a publicação? */
  autorizadoPeloCliente: boolean;
};

export type ImpedimentoDoCase = { falta: string[] };

/**
 * O que impede este case de ser publicado — ou `null` quando nada impede.
 *
 * A lista sai inteira. Descobrir uma pendência por vez, a cada tentativa de
 * publicar, faz o operador crer que está quase lá cinco vezes seguidas.
 */
export function impedimentoDoCase(fatos: FatosDoCase): ImpedimentoDoCase | null {
  const falta: string[] = [];

  if (!fatos.temTitulo) falta.push("um título");
  if (!fatos.temSintoma) falta.push("o sintoma relatado pelo cliente");
  if (!fatos.temDiagnostico) falta.push("o diagnóstico confirmado na bancada");
  if (!fatos.temIntervencao) falta.push("o que foi feito");
  if (!fatos.temTesteFinal) falta.push("os testes finais");
  if (!fatos.tecnicoId) falta.push("o técnico que executou");
  if (!fatos.revisorId) falta.push("o revisor técnico");

  if (fatos.tecnicoId && fatos.revisorId && fatos.tecnicoId === fatos.revisorId) {
    falta.push("um revisor diferente de quem executou");
  }

  if (!fatos.revisadoEm) falta.push("a data em que a revisão aconteceu");

  /* Fica por último na lista de propósito: é a que mais frequentemente
     bloqueia um case pronto, e ler as outras antes deixa claro que o texto
     está completo — o que falta é permissão, não trabalho. */
  if (!fatos.autorizadoPeloCliente) {
    falta.push("a autorização do cliente para publicar este atendimento");
  }

  return falta.length > 0 ? { falta } : null;
}

/**
 * O que o público vê de um case.
 *
 * A projeção existe como função para haver um lugar só onde se decide o que
 * sai da OS — e para ser óbvio, na revisão de código, quando alguém acrescenta
 * um campo que não deveria. Número de OS, nome do cliente, endereço, valores e
 * observações internas não estão aqui e não devem passar a estar.
 */
export type CasePublico = {
  slug: string;
  title: string;
  symptom: string;
  equipmentLabel: string;
  modelLabel: string;
  diagnosis: string;
  intervention: string;
  parts: string[];
  finalTests: string;
  durationLabel: string;
  result: string;
  tecnico: string | null;
  revisor: string | null;
  publicadoEm: Date | null;
};

/**
 * A frase sobre o tempo do atendimento.
 *
 * Sem tempo registrado, devolve `null` — e a página omite a linha. "Resolvido
 * rapidamente" é a frase que aparece quando ninguém mediu, e ela promete um
 * prazo que a JB não se comprometeu a cumprir.
 */
export function fraseDeDuracao(duracao: string): string | null {
  const texto = duracao.trim();
  return texto.length > 0 ? texto : null;
}
