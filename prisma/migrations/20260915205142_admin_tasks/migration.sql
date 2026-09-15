-- CreateEnum
CREATE TYPE "AdminTaskCategory" AS ENUM ('APRESENTACAO_MATERIAL', 'RELACIONAMENTO_ORIGINADOR', 'FUNDO_ESTRUTURA', 'FERRAMENTAS_FORNECEDORES', 'JURIDICO_COMPLIANCE', 'MARKETING_COMUNICACAO', 'INTERNO_OUTRO');

-- CreateEnum
CREATE TYPE "AdminTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AdminTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "AdminTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "AdminTaskCategory" NOT NULL DEFAULT 'INTERNO_OUTRO',
    "status" "AdminTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "AdminTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "counterpart" TEXT,
    "sourceOpportunityId" TEXT,
    "sourceLegacyId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3),

    CONSTRAINT "AdminTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminTaskAssignee" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AdminTaskAssignee_pkey" PRIMARY KEY ("taskId","userId")
);

-- CreateTable
CREATE TABLE "AdminTaskUpdate" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminTaskUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminTask_status_dueAt_idx" ON "AdminTask"("status", "dueAt");

-- CreateIndex
CREATE INDEX "AdminTask_category_idx" ON "AdminTask"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AdminTask_sourceOpportunityId_key" ON "AdminTask"("sourceOpportunityId");

-- CreateIndex
CREATE INDEX "AdminTaskAssignee_userId_idx" ON "AdminTaskAssignee"("userId");

-- CreateIndex
CREATE INDEX "AdminTaskUpdate_taskId_occurredAt_idx" ON "AdminTaskUpdate"("taskId", "occurredAt");

-- AddForeignKey
ALTER TABLE "AdminTask" ADD CONSTRAINT "AdminTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTaskAssignee" ADD CONSTRAINT "AdminTaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AdminTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTaskAssignee" ADD CONSTRAINT "AdminTaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTaskUpdate" ADD CONSTRAINT "AdminTaskUpdate_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AdminTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminTaskUpdate" ADD CONSTRAINT "AdminTaskUpdate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
