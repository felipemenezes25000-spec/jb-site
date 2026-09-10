-- Produto físico vendável não é necessariamente equipamento técnico.
ALTER TABLE "Product" ADD COLUMN "isEquipment" BOOLEAN NOT NULL DEFAULT true;

-- O pedido guarda a decisão histórica; serviços permanecem false.
ALTER TABLE "OrderItem" ADD COLUMN "isEquipment" BOOLEAN NOT NULL DEFAULT false;
UPDATE "OrderItem" SET "isEquipment" = true WHERE "kind" = 'produto';
