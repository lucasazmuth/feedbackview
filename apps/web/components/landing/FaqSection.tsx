'use client'

import { useState } from 'react'
import { landingFaqSection, landingFaqs } from '@/content/landing.pt-BR'
import { ChevronDownIcon } from './icons'

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <section className="landing-section landing-section--alt" id="faq">
      <div className="landing-container">
        <div className="landing-section-intro">
          <span className="landing-eyebrow">{landingFaqSection.tag}</span>
          <h2 className="landing-h2">{landingFaqSection.title}</h2>
        </div>

        <div className="landing-faq-list" role="list">
          {landingFaqs.map((faq, index) => (
            <div key={index} className="landing-faq-item" role="listitem">
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="landing-faq-trigger"
                aria-expanded={openFaq === index}
                aria-controls={`faq-answer-${index}`}
                id={`faq-trigger-${index}`}
              >
                <span className="landing-faq-question">{faq.question}</span>
                <ChevronDownIcon
                  size={20}
                  className={`landing-faq-chevron ${openFaq === index ? 'landing-faq-chevron--open' : ''}`}
                />
              </button>
              <div
                id={`faq-answer-${index}`}
                role="region"
                aria-labelledby={`faq-trigger-${index}`}
                className={`landing-faq-answer ${openFaq === index ? 'landing-faq-answer--open' : ''}`}
              >
                <p className="landing-faq-answer-text">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
