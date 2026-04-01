import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — Buug',
}

export default function PrivacidadePage() {
  return (
    <div className="flex flex-col w-full" style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav
        className="flex w-full items-center justify-between px-6 py-3 border-b border-transparent-white"
        style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--surface-background)' }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em' }} className="text-off-white">Buug</span>
        </Link>
      </nav>

      <div className="flex w-full justify-center" style={{ flex: 1 }}>
        <div style={{ padding: '6rem 2rem 3rem', maxWidth: '72rem', margin: '0 auto', color: 'var(--neutral-on-background-strong)' }}>
          <h1 className="text-off-white text-3xl font-bold">
            Política de Privacidade
          </h1>
          <p className="text-sm text-gray">
            Última atualização: Março de 2026
          </p>

          <div className="flex flex-col gap-4">
            <h2 className="text-off-white text-lg font-semibold">1. Dados que Coletamos</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Coletamos dados que você nos fornece diretamente (nome, e-mail, empresa, telefone, CEP) e dados gerados pelo uso do serviço (screenshots, session replays, logs de console e rede). Também coletamos dados técnicos como tipo de navegador, sistema operacional e endereço IP para fins de funcionamento e segurança.
            </p>

            <h2 className="text-off-white text-lg font-semibold">2. Como Usamos seus Dados</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Utilizamos seus dados para: (a) fornecer e manter o serviço; (b) processar e exibir reports de bugs e sugestões; (c) enviar comunicações sobre o serviço; (d) melhorar a plataforma; (e) garantir a segurança do serviço. Não vendemos seus dados a terceiros.
            </p>

            <h2 className="text-off-white text-lg font-semibold">3. Session Replay e Screenshots</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              O Buug captura session replays e screenshots para facilitar a reprodução de bugs. Campos sensíveis como senhas são automaticamente mascarados nas gravações. As capturas são armazenadas de forma segura e acessíveis apenas aos membros do projeto autorizado.
            </p>

            <h2 className="text-off-white text-lg font-semibold">4. Armazenamento e Segurança</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso. Implementamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>

            <h2 className="text-off-white text-lg font-semibold">5. Compartilhamento de Dados</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Compartilhamos seus dados apenas com: (a) membros da sua equipe no projeto; (b) prestadores de serviço que nos ajudam a operar a plataforma (hospedagem, armazenamento); (c) quando exigido por lei. Todos os prestadores são obrigados a manter a confidencialidade dos dados.
            </p>

            <h2 className="text-off-white text-lg font-semibold">6. Seus Direitos</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Você tem direito a: (a) acessar seus dados pessoais; (b) corrigir dados incorretos; (c) solicitar a exclusão dos seus dados; (d) exportar seus dados; (e) revogar consentimento a qualquer momento. Para exercer esses direitos, entre em contato conosco pela{' '}
              <Link href="/contato" className="text-primary-text font-semibold" style={{ textDecoration: 'none' }}>
                página de contato
              </Link>.
            </p>

            <h2 className="text-off-white text-lg font-semibold">7. Cookies</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação e preferências de sessão). Não utilizamos cookies de rastreamento ou publicidade.
            </p>

            <h2 className="text-off-white text-lg font-semibold">8. Retenção de Dados</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Mantemos seus dados enquanto sua conta estiver ativa. Após cancelamento, os dados são retidos por 30 dias para possibilitar recuperação e depois permanentemente excluídos. Dados de session replay e screenshots são retidos de acordo com o plano contratado.
            </p>

            <h2 className="text-off-white text-lg font-semibold">9. Alterações nesta Política</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas por e-mail. Recomendamos revisar esta página regularmente.
            </p>

            <h2 className="text-off-white text-lg font-semibold">10. Contato</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Para questões sobre privacidade, entre em contato pela nossa{' '}
              <Link href="/contato" className="text-primary-text font-semibold" style={{ textDecoration: 'none' }}>
                página de contato
              </Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex w-full justify-center border-t border-transparent-white" style={{ background: 'var(--surface-background)' }}>
        <div className="flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '-0.02em' }} className="text-gray">Buug</span>
            <span className="text-xs text-gray">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4">
            <Link href="/termos">
              <span className="text-xs text-gray" style={{ textDecoration: 'none' }}>Termos</span>
            </Link>
            <Link href="/contato">
              <span className="text-xs text-gray" style={{ textDecoration: 'none' }}>Contato</span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
