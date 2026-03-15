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
  let widgetPosition = 'bottom-right'
  let widgetStyle = 'text'
  let widgetText = 'Reportar Bug'
  try {
    const { data } = await supabase
      .from('Project')
      .select('widgetColor, widgetPosition, widgetStyle, widgetText')
      .eq('id', projectId)
      .single()
    if (data?.widgetColor) widgetColor = data.widgetColor
    if (data?.widgetPosition) widgetPosition = data.widgetPosition
    if (data?.widgetStyle) widgetStyle = data.widgetStyle
    if (data?.widgetText) widgetText = data.widgetText
  } catch {}

  return <ViewerClient projectId={projectId} widgetColor={widgetColor} widgetPosition={widgetPosition} widgetStyle={widgetStyle} widgetText={widgetText} />
}
