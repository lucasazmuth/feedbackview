-- Create Notification table for in-app notifications
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'NEW_FEEDBACK',
  "title" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Indexes for fast querying
CREATE INDEX "Notification_userId_read_idx" ON "Notification" ("userId", "read");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt" DESC);
