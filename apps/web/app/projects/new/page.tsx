import { redirect } from 'next/navigation'

/** Mantido por compatibilidade com links antigos; fluxo canônico em /criar-projeto */
export default function LegacyNewProjectRedirect() {
  redirect('/criar-projeto')
}
