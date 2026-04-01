import { createClient } from '@/lib/supabase/client'

/** Encerra a sessão Supabase e redireciona ao login (apenas em componentes client). */
export async function signOutAndRedirectToLogin() {
  const supabase = createClient()
  await supabase.auth.signOut()
  try {
    localStorage.removeItem('qbugs_current_org_id')
    sessionStorage.clear()
  } catch {
    /* ignore */
  }
  window.location.href = '/auth/login'
}
