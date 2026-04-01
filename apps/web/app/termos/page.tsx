import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso — Buug',
}

export default function TermosPage() {
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
            Termos de Uso
          </h1>
          <p className="text-sm text-gray">
            Última atualização: Março de 2026
          </p>

          <div className="flex flex-col gap-4">
            <h2 className="text-off-white text-lg font-semibold">1. Aceitação dos Termos</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Ao acessar e usar o Buug, você concorda com estes Termos de Uso. Se você não concorda com algum destes termos, não utilize nossos serviços. O uso continuado da plataforma constitui aceitação de quaisquer alterações feitas nestes termos.
            </p>

            <h2 className="text-off-white text-lg font-semibold">2. Descrição do Serviço</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              O Buug é uma plataforma de QA (Quality Assurance) que permite capturar screenshots, session replays, logs de console e rede automaticamente junto a reports de bugs e sugestões. O serviço inclui um widget embarcável, link compartilhável e painel de gerenciamento.
            </p>

            <h2 className="text-off-white text-lg font-semibold">3. Cadastro e Conta</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Para usar o Buug, você deve criar uma conta fornecendo informações verdadeiras e completas. Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente caso suspeite de uso não autorizado.
            </p>

            <h2 className="text-off-white text-lg font-semibold">4. Uso Aceitável</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Você concorda em usar o Buug apenas para fins legais e de acordo com estes termos. É proibido: (a) usar o serviço para atividades ilegais; (b) tentar acessar áreas restritas da plataforma; (c) interferir no funcionamento do serviço; (d) coletar dados de outros usuários sem consentimento.
            </p>

            <h2 className="text-off-white text-lg font-semibold">5. Propriedade Intelectual</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Todo o conteúdo da plataforma Buug, incluindo textos, gráficos, logos, ícones e software, é protegido por leis de propriedade intelectual. Você mantém a propriedade dos dados enviados através da plataforma, concedendo-nos uma licença limitada para processar e armazenar esses dados conforme necessário para a prestação do serviço.
            </p>

            <h2 className="text-off-white text-lg font-semibold">6. Limitação de Responsabilidade</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              O Buug é fornecido &ldquo;como está&rdquo;. Não garantimos que o serviço será ininterrupto ou livre de erros. Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso do serviço.
            </p>

            <h2 className="text-off-white text-lg font-semibold">7. Cancelamento</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Você pode cancelar sua conta a qualquer momento. Após o cancelamento, seus dados serão retidos por 30 dias e depois permanentemente excluídos. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.
            </p>

            <h2 className="text-off-white text-lg font-semibold">8. Alterações nos Termos</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Podemos atualizar estes termos periodicamente. Notificaremos sobre alterações significativas por e-mail ou aviso na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.
            </p>

            <h2 className="text-off-white text-lg font-semibold">9. Contato</h2>
            <p className="text-gray" style={{ lineHeight: 1.7 }}>
              Para dúvidas sobre estes termos, entre em contato através da nossa{' '}
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
            <Link href="/privacidade">
              <span className="text-xs text-gray" style={{ textDecoration: 'none' }}>Privacidade</span>
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
