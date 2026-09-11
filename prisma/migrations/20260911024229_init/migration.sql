-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "OperationCategory" AS ENUM ('CREDITO_ESTRUTURADO', 'DIP_EXIT_FINANCING', 'NPL', 'LEGAL_CLAIM', 'LITIGATION_FINANCE', 'PRECATORIO_FEDERAL', 'PRECATORIO_ESTADUAL', 'PRECATORIO_MUNICIPAL', 'PRE_PRECATORIO', 'DIREITOS_CREDITORIOS', 'FIDC', 'ANTECIPACAO_RECEBIVEIS', 'FALENCIA_DISTRESSED', 'OUTROS');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('OPEN', 'WON', 'LOST', 'ON_HOLD', 'INACTIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StatusGroup" AS ENUM ('ACTIVE', 'ON_HOLD', 'CONCLUDED', 'CLOSED', 'LEGACY');

-- CreateEnum
CREATE TYPE "CompanyCategory" AS ENUM ('BANCO', 'ASSET', 'CONSULTORIA', 'BOUTIQUE', 'BROKER', 'ESCRITORIO_ADVOCACIA', 'EMPRESARIO_EXECUTIVO', 'ADVISOR', 'ORIGINACAO_PROPRIA', 'FUNDO', 'OUTROS');

-- CreateEnum
CREATE TYPE "EntryChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'LIGACAO', 'REUNIAO', 'INDICACAO', 'ORIGINACAO_PROPRIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "Relationship" AS ENUM ('ESTRATEGICO', 'ATIVO', 'ESPORADICO', 'FRIO', 'NOVO');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('EMAIL', 'WHATSAPP', 'LIGACAO', 'REUNIAO', 'NOTA', 'OUTRO');

-- CreateEnum
CREATE TYPE "OriginatorRole" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'NOTE', 'EMAIL', 'WHATSAPP', 'MEETING', 'CALL', 'INFO_RECEIVED', 'PROPOSAL_SENT', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'REACTIVATED', 'CLOSED', 'FOLLOW_UP', 'LEGACY_STATUS', 'LEGACY_FEEDBACK', 'MEETING_SNAPSHOT', 'IMPORTED');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('TEASER', 'MODEL', 'PRESENTATION', 'LEGAL', 'PROPOSAL', 'NDA', 'OTHER');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "initials" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "OperationCategory" NOT NULL DEFAULT 'OUTROS',
    "description" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationTypeMapping" (
    "id" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "operationTypeId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'rule',
    "occurrences" INTEGER NOT NULL DEFAULT 0,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationTypeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityStatus" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" "StatusGroup" NOT NULL,
    "outcome" "Outcome" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "color" TEXT,
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OpportunityStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "normalizedName" TEXT NOT NULL,
    "category" "CompanyCategory" NOT NULL DEFAULT 'OUTROS',
    "categoryRaw" TEXT,
    "website" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "relationship" "Relationship" NOT NULL DEFAULT 'NOVO',
    "lastInteractionAt" TIMESTAMP(3),
    "migrationConfidence" DOUBLE PRECISION,
    "migrationNotes" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAlias" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "CompanyAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "fullName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "linkedin" TEXT,
    "category" "CompanyCategory",
    "notes" TEXT,
    "relationship" "Relationship" NOT NULL DEFAULT 'NOVO',
    "lastContactAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "migrationConfidence" DOUBLE PRECISION,
    "migrationNotes" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInteraction" (
    "id" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "type" "InteractionType" NOT NULL DEFAULT 'NOTA',
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "name" TEXT NOT NULL,
    "nameRaw" TEXT,
    "economicGroup" TEXT,
    "description" TEXT,
    "sector" TEXT,
    "operationTypeId" TEXT,
    "operationTypeRaw" TEXT,
    "statusId" TEXT NOT NULL,
    "statusRaw" TEXT,
    "legacyStatusText" TEXT,
    "legacyFeedback" TEXT,
    "entryDate" TIMESTAMP(3),
    "entryDateRaw" TEXT,
    "entryYear" INTEGER,
    "entryYearRaw" TEXT,
    "exitDate" TIMESTAMP(3),
    "exitDateRaw" TEXT,
    "amount" DECIMAL(18,4),
    "amountRaw" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "entryChannel" "EntryChannel",
    "emailSubject" TEXT,
    "emailSender" TEXT,
    "emailDate" TIMESTAMP(3),
    "whatsappContact" TEXT,
    "whatsappNumber" TEXT,
    "whatsappSummary" TEXT,
    "firstContactAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "assigneesRaw" TEXT,
    "originatorRaw" TEXT,
    "originatorTypeRaw" TEXT,
    "originatorCategory" "CompanyCategory",
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityAssignee" (
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityAssignee_pkey" PRIMARY KEY ("opportunityId","userId")
);

-- CreateTable
CREATE TABLE "OpportunityOriginator" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "role" "OriginatorRole" NOT NULL DEFAULT 'PRIMARY',
    "rawText" TEXT,
    "confidence" DOUBLE PRECISION,
    "migrationNotes" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityOriginator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "metadata" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT,
    "url" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "fileHash" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "summary" JSONB,
    "userId" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "sourceWorkbook" TEXT NOT NULL,
    "sheet" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "legacyId" INTEGER,
    "rawData" JSONB NOT NULL,
    "normalized" JSONB,
    "opportunityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'imported',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataQualityIssue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'WARNING',
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isArchived_isActive_idx" ON "User"("isArchived", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OperationType_name_key" ON "OperationType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OperationType_slug_key" ON "OperationType"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OperationTypeMapping_rawValue_key" ON "OperationTypeMapping"("rawValue");

-- CreateIndex
CREATE INDEX "OperationTypeMapping_normalizedKey_idx" ON "OperationTypeMapping"("normalizedKey");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityStatus_key_key" ON "OpportunityStatus"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Company_normalizedName_key" ON "Company"("normalizedName");

-- CreateIndex
CREATE INDEX "Company_category_idx" ON "Company"("category");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAlias_alias_key" ON "CompanyAlias"("alias");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE INDEX "Contact_fullName_idx" ON "Contact"("fullName");

-- CreateIndex
CREATE INDEX "Contact_nextFollowUpAt_idx" ON "Contact"("nextFollowUpAt");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_normalizedName_companyId_key" ON "Contact"("normalizedName", "companyId");

-- CreateIndex
CREATE INDEX "ContactInteraction_contactId_occurredAt_idx" ON "ContactInteraction"("contactId", "occurredAt");

-- CreateIndex
CREATE INDEX "ContactInteraction_companyId_occurredAt_idx" ON "ContactInteraction"("companyId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_legacyId_key" ON "Opportunity"("legacyId");

-- CreateIndex
CREATE INDEX "Opportunity_entryDate_idx" ON "Opportunity"("entryDate");

-- CreateIndex
CREATE INDEX "Opportunity_entryYear_idx" ON "Opportunity"("entryYear");

-- CreateIndex
CREATE INDEX "Opportunity_statusId_idx" ON "Opportunity"("statusId");

-- CreateIndex
CREATE INDEX "Opportunity_operationTypeId_idx" ON "Opportunity"("operationTypeId");

-- CreateIndex
CREATE INDEX "Opportunity_nextFollowUpAt_idx" ON "Opportunity"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Opportunity_updatedAt_idx" ON "Opportunity"("updatedAt");

-- CreateIndex
CREATE INDEX "Opportunity_entryChannel_idx" ON "Opportunity"("entryChannel");

-- CreateIndex
CREATE INDEX "Opportunity_name_idx" ON "Opportunity"("name");

-- CreateIndex
CREATE INDEX "Opportunity_isDeleted_statusId_idx" ON "Opportunity"("isDeleted", "statusId");

-- CreateIndex
CREATE INDEX "Opportunity_originatorCategory_idx" ON "Opportunity"("originatorCategory");

-- CreateIndex
CREATE INDEX "OpportunityAssignee_userId_idx" ON "OpportunityAssignee"("userId");

-- CreateIndex
CREATE INDEX "OpportunityOriginator_companyId_idx" ON "OpportunityOriginator"("companyId");

-- CreateIndex
CREATE INDEX "OpportunityOriginator_contactId_idx" ON "OpportunityOriginator"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityOriginator_opportunityId_role_key" ON "OpportunityOriginator"("opportunityId", "role");

-- CreateIndex
CREATE INDEX "Activity_opportunityId_occurredAt_idx" ON "Activity"("opportunityId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_type_idx" ON "Activity"("type");

-- CreateIndex
CREATE INDEX "Note_opportunityId_createdAt_idx" ON "Note"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUp_dueAt_completedAt_idx" ON "FollowUp"("dueAt", "completedAt");

-- CreateIndex
CREATE INDEX "FollowUp_opportunityId_idx" ON "FollowUp"("opportunityId");

-- CreateIndex
CREATE INDEX "Attachment_opportunityId_idx" ON "Attachment"("opportunityId");

-- CreateIndex
CREATE INDEX "SavedView_userId_page_idx" ON "SavedView"("userId", "page");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_opportunityId_createdAt_idx" ON "AuditLog"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_opportunityId_idx" ON "ImportRow"("opportunityId");

-- CreateIndex
CREATE INDEX "ImportRow_legacyId_idx" ON "ImportRow"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_sourceWorkbook_sheet_sourceRow_key" ON "ImportRow"("sourceWorkbook", "sheet", "sourceRow");

-- CreateIndex
CREATE INDEX "DataQualityIssue_code_resolved_idx" ON "DataQualityIssue"("code", "resolved");

-- CreateIndex
CREATE INDEX "DataQualityIssue_opportunityId_idx" ON "DataQualityIssue"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "DataQualityIssue_code_entity_entityId_key" ON "DataQualityIssue"("code", "entity", "entityId");

-- AddForeignKey
ALTER TABLE "OperationTypeMapping" ADD CONSTRAINT "OperationTypeMapping_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "OperationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAlias" ADD CONSTRAINT "CompanyAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInteraction" ADD CONSTRAINT "ContactInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_operationTypeId_fkey" FOREIGN KEY ("operationTypeId") REFERENCES "OperationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "OpportunityStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityAssignee" ADD CONSTRAINT "OpportunityAssignee_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityAssignee" ADD CONSTRAINT "OpportunityAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityOriginator" ADD CONSTRAINT "OpportunityOriginator_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityOriginator" ADD CONSTRAINT "OpportunityOriginator_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityOriginator" ADD CONSTRAINT "OpportunityOriginator_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityIssue" ADD CONSTRAINT "DataQualityIssue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
