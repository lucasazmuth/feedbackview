-- Create new enums
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');
CREATE TYPE "PlanPeriod" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- Create Organization table
CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "planPeriod" "PlanPeriod",
  "planExpiresAt" TIMESTAMP(3),
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "maxProjects" INTEGER NOT NULL DEFAULT 1,
  "maxMembers" INTEGER NOT NULL DEFAULT 1,
  "maxReportsPerMonth" INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- Create TeamMember table
CREATE TABLE "TeamMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "TeamRole" NOT NULL DEFAULT 'MEMBER',
  "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joinedAt" TIMESTAMP(3),
  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMember_organizationId_userId_key" ON "TeamMember"("organizationId", "userId");

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add columns to User
ALTER TABLE "User" ADD COLUMN "defaultOrgId" TEXT;

-- Add organizationId to Project
ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data migration: create Organization for each existing User
INSERT INTO "Organization" ("id", "name", "slug", "plan", "maxProjects", "maxMembers", "maxReportsPerMonth", "createdAt")
SELECT
  'org_' || "id",
  COALESCE("name", split_part("email", '@', 1)),
  lower(replace(split_part("email", '@', 1), '.', '-')) || '-' || substr("id", 1, 6),
  'FREE',
  1,
  1,
  50,
  "createdAt"
FROM "User";

-- Create TeamMember (OWNER) for each existing User
INSERT INTO "TeamMember" ("id", "organizationId", "userId", "role", "status", "invitedAt", "joinedAt")
SELECT
  'tm_' || "id",
  'org_' || "id",
  "id",
  'OWNER',
  'ACTIVE',
  "createdAt",
  "createdAt"
FROM "User";

-- Set defaultOrgId for each User
UPDATE "User" SET "defaultOrgId" = 'org_' || "id";

-- Link Projects to their owner's Organization
UPDATE "Project" SET "organizationId" = 'org_' || "ownerId";
