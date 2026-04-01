'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { Container } from '@/components/ui/Container'
import { landingFaqSection, landingFaqs } from '@/content/landing.pt-BR'

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i)
  }

  return (
    <section className="landing-section-pad" id="faq">
      <Container>
        {/* Section header */}
        <div className="landing-section-intro">
          <span className="mb-4 inline-flex items-center rounded-full border border-transparent-white px-4 py-1 text-xs text-primary-text uppercase tracking-wider">
            {landingFaqSection.tag}
          </span>
          <h2 className="text-gradient text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {landingFaqSection.title}
          </h2>
          <p className="text-primary-text text-lg leading-relaxed">
            {landingFaqSection.sub}
          </p>
        </div>

        {/* FAQ items */}
        <div className="mx-auto max-w-[64rem]">
          {landingFaqs.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div key={i} className="border-b border-transparent-white">
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-6 text-left"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  <span className="text-off-white text-md font-medium pr-4">
                    {faq.question}
                  </span>
                  <svg
                    className={clsx(
                      'h-5 w-5 shrink-0 text-gray transition-transform duration-300',
                      isOpen && 'rotate-180'
                    )}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div
                  className={clsx(
                    'overflow-hidden transition-all duration-300',
                    isOpen ? 'max-h-[40rem] pb-6' : 'max-h-0'
                  )}
                >
                  <p className="text-primary-text text-sm leading-relaxed pr-8">
                    {faq.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
