-- O telefone fixo da JB, (11) 3715-6362, foi desativado em 06/11/2026.
--
-- O número entrou no banco pela carga do site antigo (`telefone_rodape`) e
-- aparecia na faixa do topo, no rodapé e no JSON-LD. Trocar só o padrão do
-- código não basta: a configuração gravada vence o padrão.
--
-- Limpa a configuração apenas se ela ainda guarda esse número (com qualquer
-- pontuação, com ou sem +55). Um telefone novo cadastrado no painel fica como
-- está. Em branco, o site não mostra linha de telefone e o JSON-LD usa o
-- WhatsApp principal.
UPDATE "Setting"
SET "value" = '',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'telefone'
  AND regexp_replace("value", '\D', '', 'g') LIKE '%37156362';
