-- Add inviteEmail column to TeamMember for in-app invite system
ALTER TABLE "TeamMember" ADD COLUMN "inviteEmail" TEXT;

-- Make userId nullable (pending invites don't have a userId yet)
ALTER TABLE "TeamMember" ALTER COLUMN "userId" DROP NOT NULL;

-- Drop existing unique constraint on (organizationId, userId) if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'TeamMember_organizationId_userId_key'
  ) THEN
    ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_organizationId_userId_key";
  END IF;
END $$;

-- Create partial unique index: one active membership per user per org
CREATE UNIQUE INDEX "TeamMember_org_user_active"
  ON "TeamMember" ("organizationId", "userId")
  WHERE "userId" IS NOT NULL AND "status" != 'REMOVED';

-- Create partial unique index: one pending invite per email per org
CREATE UNIQUE INDEX "TeamMember_org_invite_pending"
  ON "TeamMember" ("organizationId", "inviteEmail")
  WHERE "inviteEmail" IS NOT NULL AND "status" = 'PENDING';

-- Index for fast lookup of pending invites by email
CREATE INDEX "TeamMember_inviteEmail_pending"
  ON "TeamMember" ("inviteEmail")
  WHERE "status" = 'PENDING';
