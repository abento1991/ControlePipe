-- CreateEnum
CREATE TYPE "DeclineReason" AS ENUM ('SEM_FIT', 'GARANTIA_RISCO', 'PRECO_RETORNO', 'CREDITO_FRACO', 'PRAZO', 'TICKET', 'ATIVO_RESOLVIDO', 'PERDEMOS_CONCORRENTE', 'CONTRAPARTE_DESISTIU', 'NAO_PARTICIPAMOS', 'OUTRO');

-- CreateEnum
CREATE TYPE "DeclinedBy" AS ENUM ('LETO', 'CONTRAPARTE');

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "declineReason" "DeclineReason",
ADD COLUMN     "declineReasonInferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "declinedBy" "DeclinedBy";
