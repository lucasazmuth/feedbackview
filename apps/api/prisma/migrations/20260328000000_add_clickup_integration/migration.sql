-- ClickUp integration: per-feedback task link + per-org configuration
ALTER TABLE "Feedback" ADD COLUMN "clickupTaskId" TEXT;
CREATE INDEX "Feedback_clickupTaskId_idx" ON "Feedback"("clickupTaskId");

ALTER TABLE "Organization" ADD COLUMN "clickupIntegration" JSONB;
