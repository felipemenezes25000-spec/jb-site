/* ============================================================================
   Uma coisa que aconteceu, uma linha

   A ficha do equipamento junta cinco tabelas — eventos, chamados, ordens de
   serviço, visitas e documentos — para responder "o que já aconteceu com este
   aparelho". Só que três dessas tabelas gravam o MESMO acontecimento duas
   vezes, porque cada fluxo grava o registro e, na mesma transação, um evento
   narrando que o registro foi criado:

     · abrir chamado  → `ServiceRequest` + evento "Chamado JB-000012 aberto"
     · abrir OS       → `WorkOrder`      + evento "OS 000034 aberta"
     · concluir visita→ `MaintenanceVisit` + evento "Manutenção preventiva
                        realizada"

   Na tela isso virava dois cartões com o mesmo texto e o mesmo minuto, lado a
   lado. Um aparelho com três chamados exibia seis acontecimentos, e a história
   dele parecia o dobro do que foi — que é o pior tipo de erro num prontuário
   técnico, porque frequência de manutenção é justamente o que se lê ali.

   A regra, e ela é uma só: **uma linha por (origem, referência)**. Chamado
   JB-000012 ocupa uma linha, não importa quantos eventos falem dele.

   Duas decisões que a regra obriga:

   1. **A linha sobrevivente é a do registro, não a do evento.** Ela tem estado
      ("Em atendimento") e destino (a página do chamado); o evento tem só
      título e texto. Descartar a mais rica para ficar com a mais pobre seria
      trocar informação por simetria.

   2. **Ela fica no momento MAIS RECENTE do grupo.** Uma OS aberta em 3/9 e
      concluída em 11/9 é uma coisa só que andou até o dia 11 — e é no dia 11
      que quem lê a ficha espera encontrá-la, ao lado da etiqueta "Concluída"
      que ela já carrega. Ancorá-la na abertura mostraria "Concluída" numa data
      em que ela não estava concluída.

   O que o evento tinha e o registro não tinha não se perde: descrição vazia é
   preenchida pela do evento.
   ============================================================================ */

export type TipoHistorico = "evento" | "chamado" | "os" | "visita" | "documento";

export type ItemHistorico = {
  id: string;
  tipo: TipoHistorico;
  titulo: string;
  descricao: string;
  quando: Date;
  /** Rótulo de status, quando o item tem um. */
  etiqueta?: string;
  /** Destino na área do cliente. Ausente quando não há página para abrir. */
  href?: string;
};

/**
 * Um candidato a linha, antes da deduplicação.
 *
 * `referencia` é o id do registro de que a linha fala. Para a linha do próprio
 * registro, é o id dele; para um evento, é o id do chamado / OS / visita que a
 * coluna de referência aponta. Um evento solto — anotação da equipe, mudança
 * de estado — referencia a si mesmo e nunca colide com nada.
 *
 * `preferida` marca a linha do registro. Quando duas concorrem pela mesma
 * chave, ela vence; é a que tem etiqueta e link.
 */
export type CandidatoDoHistorico = ItemHistorico & {
  referencia: string;
  preferida: boolean;
};

/** A chave que define "a mesma coisa". */
function chave(candidato: CandidatoDoHistorico) {
  return `${candidato.tipo}:${candidato.referencia}`;
}

/**
 * Colapsa os candidatos em uma linha por (origem, referência), do mais recente
 * para o mais antigo.
 *
 * Pura de propósito: a regra que decide o que a clínica vê no prontuário do
 * equipamento não deveria precisar de um banco para ser verificada.
 */
export function unificarHistorico(
  candidatos: readonly CandidatoDoHistorico[],
): ItemHistorico[] {
  const porChave = new Map<string, CandidatoDoHistorico>();

  for (const candidato of candidatos) {
    const k = chave(candidato);
    const atual = porChave.get(k);

    if (!atual) {
      porChave.set(k, candidato);
      continue;
    }

    /* Quem fica é o registro. Entre dois eventos sobre o mesmo registro — a
       abertura e a conclusão de uma OS, por exemplo — fica o mais recente,
       que é o que descreve o estado de agora. */
    const vencedor =
      atual.preferida === candidato.preferida
        ? candidato.quando.getTime() > atual.quando.getTime()
          ? candidato
          : atual
        : atual.preferida
          ? atual
          : candidato;
    const perdedor = vencedor === atual ? candidato : atual;

    porChave.set(k, {
      ...vencedor,
      /* O grupo inteiro anda junto: a linha fica no instante mais recente de
         qualquer uma das partes. */
      quando:
        perdedor.quando.getTime() > vencedor.quando.getTime()
          ? perdedor.quando
          : vencedor.quando,
      /* Nada do que o evento dizia se perde por ele ter sido absorvido. */
      descricao: vencedor.descricao.trim() || perdedor.descricao,
    });
  }

  return [...porChave.values()]
    .map(({ referencia: _referencia, preferida: _preferida, ...linha }) => linha)
    .sort((a, b) => b.quando.getTime() - a.quando.getTime());
}
