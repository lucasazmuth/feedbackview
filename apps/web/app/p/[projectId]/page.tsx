import ViewerClient from './ViewerClient'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export const dynamic = 'force-dynamic'

export default async function PublicViewerPage({ params }: PageProps) {
  const { projectId } = await params
  return <ViewerClient projectId={projectId} />
}
