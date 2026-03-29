-- Per-project ClickUp list destination
ALTER TABLE "Project" ADD COLUMN "clickupListId" TEXT;
ALTER TABLE "Project" ADD COLUMN "clickupListPath" TEXT;
