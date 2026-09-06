-- CreateEnum
CREATE TYPE "PlanBillingBasis" AS ENUM ('sob_consulta', 'por_equipamento', 'pacote', 'a_partir_de');

-- AlterTable
ALTER TABLE "MaintenancePlan" ADD COLUMN     "billingBasis" "PlanBillingBasis" NOT NULL DEFAULT 'sob_consulta',
ADD COLUMN     "coveredEquipment" INTEGER,
ADD COLUMN     "eligibility" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "exclusions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "partsPolicy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "priceFactors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "travelPolicy" TEXT NOT NULL DEFAULT '';
