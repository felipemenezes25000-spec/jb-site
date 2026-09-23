-- A linha do tempo do equipamento mostrava o mesmo fato duas vezes.
--
-- Abrir um chamado grava o `ServiceRequest` E um `EquipmentEvent` dizendo
-- "Chamado JB-000012 aberto". Abrir uma OS grava as duas coisas de novo.
-- Concluir uma visita, idem. A ficha do equipamento lia as cinco tabelas e
-- empilhava tudo: dois cartões com o mesmo texto, no mesmo minuto, um do lado
-- do outro — e o histórico de manutenção de um aparelho parecia ter o dobro
-- de acontecimentos que teve.
--
-- Deduplicar precisa de uma referência: de QUE registro este evento fala.
-- `workOrderId` já existia; chamado e visita não tinham nenhuma. Sem coluna,
-- a única saída seria casar o título em português — texto de tela, que muda
-- de redação e quebraria a deduplicação em silêncio.
ALTER TABLE "EquipmentEvent"
  ADD COLUMN "serviceRequestId" TEXT,
  ADD COLUMN "visitId" TEXT;

-- Os eventos que já estão no banco não têm a referência, e sem preenchê-la a
-- correção só valeria para o que acontecer daqui para frente — o histórico
-- antigo continuaria dobrado para sempre.
--
-- O vínculo é reconstruído pelo que é verdade sobre como eles nasceram: o
-- evento e o registro são gravados na MESMA transação, então compartilham o
-- equipamento e caem dentro do mesmo segundo. A janela de 5 segundos cobre uma
-- transação lenta sem alcançar o chamado seguinte do mesmo aparelho, que está
-- a dias de distância.
--
-- A condição de unicidade é o que torna isto seguro: se dois candidatos
-- couberem na janela, nenhum é escolhido. Preferir "o primeiro" gravaria um
-- palpite, e um palpite aqui é atribuir o histórico de um chamado a outro.
UPDATE "EquipmentEvent" AS e
SET "serviceRequestId" = candidato.id
FROM (
  SELECT
    e2.id AS "eventoId",
    MIN(s.id) AS id,
    COUNT(*)  AS quantos
  FROM "EquipmentEvent" e2
  JOIN "ServiceRequest" s
    ON s."equipmentId" = e2."equipmentId"
   AND ABS(EXTRACT(EPOCH FROM (s."createdAt" - e2."happenedAt"))) <= 5
  WHERE e2."kind" = 'assistencia'
    AND e2."workOrderId" IS NULL
  GROUP BY e2.id
) AS candidato
WHERE e.id = candidato."eventoId"
  AND candidato.quantos = 1;

UPDATE "EquipmentEvent" AS e
SET "visitId" = candidato.id
FROM (
  SELECT
    e2.id AS "eventoId",
    MIN(v.id) AS id,
    COUNT(*)  AS quantos
  FROM "EquipmentEvent" e2
  JOIN "MaintenanceVisit" v
    ON v."equipmentId" = e2."equipmentId"
   AND v."doneAt" IS NOT NULL
   AND ABS(EXTRACT(EPOCH FROM (v."doneAt" - e2."happenedAt"))) <= 5
  WHERE e2."kind" = 'manutencao'
  GROUP BY e2.id
) AS candidato
WHERE e.id = candidato."eventoId"
  AND candidato.quantos = 1;
