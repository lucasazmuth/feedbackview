import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SQL = `CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "userId" TEXT,
  "userEmail" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_project ON "ActivityLog"("projectId");
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON "ActivityLog"("createdAt" DESC);

ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ActivityLog' AND policyname = 'activity_log_select') THEN
    CREATE POLICY "activity_log_select" ON "ActivityLog" FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ActivityLog' AND policyname = 'activity_log_insert') THEN
    CREATE POLICY "activity_log_insert" ON "ActivityLog" FOR INSERT WITH CHECK (true);
  END IF;
END $$;`

export async function POST() {
  try {
    // Check if table already exists
    const { error: checkError } = await supabase.from('ActivityLog').select('id').limit(1)

    if (!checkError) {
      return NextResponse.json({ message: 'ActivityLog table already exists' })
    }

    // Try to create via Supabase SQL endpoint
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const res = await fetch(`${url}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({}),
    })

    // If rpc doesn't work, return SQL for manual execution
    return NextResponse.json({
      message: 'ActivityLog table does not exist. Please run the following SQL in the Supabase SQL Editor (Dashboard > SQL Editor):',
      sql: SQL,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
