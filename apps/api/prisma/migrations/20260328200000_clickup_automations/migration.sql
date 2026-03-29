-- ClickUp automations: org-level rules mapping Buug projects → ClickUp list
CREATE TABLE "ClickUpAutomation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "clickupTeamId" TEXT NOT NULL,
    "clickupSpaceId" TEXT NOT NULL,
    "clickupListId" TEXT NOT NULL,
    "listPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickUpAutomation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickUpAutomationProject" (
    "automationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ClickUpAutomationProject_pkey" PRIMARY KEY ("automationId","projectId")
);

CREATE UNIQUE INDEX "ClickUpAutomationProject_projectId_key" ON "ClickUpAutomationProject"("projectId");

CREATE INDEX "ClickUpAutomation_organizationId_idx" ON "ClickUpAutomation"("organizationId");

CREATE INDEX "ClickUpAutomationProject_projectId_idx" ON "ClickUpAutomationProject"("projectId");

ALTER TABLE "ClickUpAutomation" ADD CONSTRAINT "ClickUpAutomation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClickUpAutomationProject" ADD CONSTRAINT "ClickUpAutomationProject_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "ClickUpAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClickUpAutomationProject" ADD CONSTRAINT "ClickUpAutomationProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One automation per legacy project row (list id only; team/space filled from org integration when possible)
INSERT INTO "ClickUpAutomation" ("id", "organizationId", "name", "enabled", "clickupTeamId", "clickupSpaceId", "clickupListId", "listPath", "createdAt", "updatedAt")
SELECT
  'cua_mig_' || p."id",
  p."organizationId",
  'Migração: ' || p."name",
  true,
  COALESCE((o."clickupIntegration"->>'teamId')::text, ''),
  '',
  p."clickupListId",
  p."clickupListPath",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Project" p
JOIN "Organization" o ON o."id" = p."organizationId"
WHERE p."clickupListId" IS NOT NULL
  AND p."clickupListId" != ''
  AND p."organizationId" IS NOT NULL;

INSERT INTO "ClickUpAutomationProject" ("automationId", "projectId")
SELECT 'cua_mig_' || p."id", p."id"
FROM "Project" p
WHERE p."clickupListId" IS NOT NULL
  AND p."clickupListId" != ''
  AND p."organizationId" IS NOT NULL;
