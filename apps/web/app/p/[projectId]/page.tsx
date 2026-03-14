import { createClient } from '@supabase/supabase-js'
import ViewerClient from './ViewerClient'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function PublicViewerPage({ params }: PageProps) {
  const { projectId } = await params

  let widgetColor = '#4f46e5'
  try {
    const { data } = await supabase
      .from('Project')
      .select('widgetColor')
      .eq('id', projectId)
      .single()
    if (data?.widgetColor) widgetColor = data.widgetColor
  } catch {}

  return <ViewerClient projectId={projectId} widgetColor={widgetColor} />
}
