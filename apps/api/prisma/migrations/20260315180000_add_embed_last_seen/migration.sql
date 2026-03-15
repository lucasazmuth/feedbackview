-- Add embed connection tracking
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "embedLastSeenAt" TIMESTAMPTZ;
