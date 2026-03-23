import { requireUser } from '@/lib/auth'
import IntegrationsClient from './IntegrationsClient'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const user = await requireUser()
  return <IntegrationsClient userId={user.id} />
}
