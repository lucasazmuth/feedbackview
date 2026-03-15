import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time setup endpoint to create the Notification table
// Can be removed after the table is created
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // Try to select from Notification table to check if it exists
    const { error: checkError } = await supabase.from('Notification').select('id').limit(1)

    if (!checkError) {
      return NextResponse.json({ message: 'Notification table already exists' })
    }

    // Table doesn't exist - we need to create it via raw SQL
    // Since we can't run DDL through the REST API, we'll use the pg_net extension
    // or just return instructions
    return NextResponse.json({
      message: 'Notification table does not exist. Please run the following SQL in the Supabase SQL Editor:',
      sql: `CREATE TABLE IF NOT EXISTS "Notification" (
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
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification" ("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt" DESC);`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
