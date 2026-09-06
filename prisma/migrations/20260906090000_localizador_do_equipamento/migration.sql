-- Localizador opaco da etiqueta de QR.
--
-- Aditivo e anulável: nenhum equipamento existente ganha valor, e o índice
-- único convive com muitos NULL no Postgres. A coluna só passa a ter conteúdo
-- quando alguém imprime a primeira etiqueta.

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "locator" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_locator_key" ON "Equipment"("locator");
