-- Add archivedAt column to Feedback for retention-based soft-delete
ALTER TABLE "Feedback" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Index for efficient cleanup queries
CREATE INDEX "Feedback_archivedAt_idx" ON "Feedback"("archivedAt") WHERE "archivedAt" IS NOT NULL;

-- Index for retention queries (find old non-archived feedback)
CREATE INDEX "Feedback_createdAt_archivedAt_idx" ON "Feedback"("createdAt") WHERE "archivedAt" IS NULL;
