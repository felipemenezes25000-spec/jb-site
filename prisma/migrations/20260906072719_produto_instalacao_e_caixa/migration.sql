-- CreateEnum
CREATE TYPE "InstallationPolicy" AS ENUM ('nao_informada', 'nao_oferecida', 'opcional', 'inclusa', 'sob_consulta');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "boxContents" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "infrastructureNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "installationNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "installationPolicy" "InstallationPolicy" NOT NULL DEFAULT 'nao_informada';
