-- Add sortOrder for custom drag-and-drop ordering
ALTER TABLE "Feedback" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
