import Link from 'next/link'
import clsx from 'clsx'
import { AppIcon } from '@/components/ui/AppIcon'
import { Container } from '@/components/ui/Container'
import { Footer } from '@/components/landing/Footer'
import { ICON_STROKE } from '@/lib/icon-tokens'

export const metadata = {
  title: 'Contato — Buug',
}

const contactCards = [
  {
    title: 'E-mail',
    body: 'suporte@buug.io',
    href: 'mailto:suporte@buug.io',
    icon: (
      <>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </>
    ),
  },
  {
    title: 'Localização',
    body: 'Brasil',
    icon: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  },
  {
    title: 'Horário',
    body: 'Segunda a Sexta, 9h às 18h (BRT)',
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  },
] as const

export default function ContatoPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(42rem,80vh)] bg-page-gradient opacity-90"
        aria-hidden
      />

      <header
        className={clsx(
          'fixed top-0 left-0 z-50 w-full border-b border-transparent-white',
          'backdrop-blur-[12px] bg-background/80'
        )}
      >
        <Container className="flex h-navigation-height items-center justify-between gap-4">
          <Link
            href="/"
            className="font-logo text-2xl font-bold tracking-tight text-off-white no-underline"
          >
            Buug
          </Link>
          <nav className="flex items-center gap-4 md:gap-6" aria-label="Principal">
            <Link
              href="/"
              className="hidden text-sm text-gray transition-colors hover:text-off-white sm:inline no-underline"
            >
              Início
            </Link>
            <Link
              href="/plans"
              className="hidden text-sm text-gray transition-colors hover:text-off-white md:inline no-underline"
            >
              Planos
            </Link>
            <Link
              href="/auth/login"
              className="text-sm text-gray transition-colors hover:text-off-white no-underline"
            >
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className={clsx(
                'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium',
                'bg-primary-gradient text-off-white shadow-primary no-underline',
                'transition-opacity hover:opacity-90'
              )}
            >
              Começar grátis
            </Link>
          </nav>
        </Container>
      </header>

      <main className="relative flex-1 pt-navigation-height">
        <Container className="pb-16 pt-12 md:pb-24 md:pt-16">
          <div className="mx-auto max-w-[48rem] text-center">
            <span
              className={clsx(
                'mb-6 inline-flex items-center rounded-full border border-transparent-white px-4 py-1.5',
                'text-xs font-medium uppercase tracking-wider text-primary-text'
              )}
            >
              Suporte
            </span>
            <h1 className="text-gradient text-4xl font-bold tracking-tight md:text-5xl md:leading-[1.1]">
              Contato
            </h1>
            <p className="mx-auto mt-6 max-w-[36rem] text-lg leading-relaxed text-primary-text">
              Tem alguma dúvida, sugestão ou precisa de suporte? Fale conosco — respondemos em horário comercial.
            </p>
          </div>

          <ul className="mx-auto mt-14 grid max-w-[56rem] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {contactCards.map((item) => {
              const content = (
                <>
                  <div
                    className={clsx(
                      'mb-5 flex h-12 w-12 items-center justify-center rounded-2xl',
                      'border border-transparent-white bg-background text-off-white'
                    )}
                  >
                    <AppIcon size="lg" strokeWidth={ICON_STROKE.default} className="text-primary-text">
                      {item.icon}
                    </AppIcon>
                  </div>
                  <h2 className="text-lg font-semibold text-off-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-primary-text">{item.body}</p>
                  {'href' in item && item.href ? (
                    <span className="mt-4 inline-flex text-sm font-medium text-off-white opacity-0 transition-opacity group-hover:opacity-100">
                      Abrir cliente de e-mail →
                    </span>
                  ) : null}
                </>
              )

              const cardClass = clsx(
                'group flex flex-col rounded-[2.4rem] border border-transparent-white p-8 text-left',
                'bg-glass-gradient transition-all duration-300 ease-out',
                'hover:bg-transparent-white hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(120,119,198,0.12)]',
                'hover:-translate-y-1 motion-reduce:hover:translate-y-0'
              )

              if ('href' in item && item.href) {
                return (
                  <li key={item.title}>
                    <a href={item.href} className={clsx(cardClass, 'no-underline')}>
                      {content}
                    </a>
                  </li>
                )
              }

              return (
                <li key={item.title}>
                  <div className={cardClass}>{content}</div>
                </li>
              )
            })}
          </ul>

          <div
            className={clsx(
              'mx-auto mt-14 max-w-[36rem] rounded-[2.4rem] border border-transparent-white',
              'bg-glass-gradient px-8 py-10 text-center md:px-12 md:py-12'
            )}
          >
            <p className="text-primary-text text-lg leading-relaxed">
              Resposta típica em até <span className="text-off-white font-medium">1 dia útil</span>. Para assinaturas e
              faturação, mencione o e-mail da conta no assunto.
            </p>
            <a
              href="mailto:suporte@buug.io?subject=Contato%20Buug"
              className={clsx(
                'mt-8 inline-flex items-center justify-center rounded-full px-8 py-3 text-md font-medium',
                'bg-primary-gradient text-off-white shadow-primary no-underline',
                'transition-opacity hover:opacity-90'
              )}
            >
              Enviar e-mail
            </a>
          </div>
        </Container>
      </main>

      <div className="relative border-t border-transparent-white bg-background">
        <Footer />
      </div>
    </div>
  )
}
