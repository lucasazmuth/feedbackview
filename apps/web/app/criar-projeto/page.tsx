import type { Metadata } from 'next'
import { CreateProjectWizard } from '@/components/projects/CreateProjectWizard'

export const metadata: Metadata = {
  title: 'Criar projeto',
  description: 'Configure o site a monitorar, integração e widget de feedback.',
}

export default function CriarProjetoPage() {
  return <CreateProjectWizard />
}
