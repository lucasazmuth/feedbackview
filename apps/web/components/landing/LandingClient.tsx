'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from './Navbar'
import { HeroSection } from './HeroSection'
import { PricingSection } from './PricingSection'
import { FaqSection } from './FaqSection'
import { CtaSection } from './CtaSection'
import { Footer } from './Footer'

export function LandingClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setIsLoggedIn(true)
    })
  }, [])

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} />
      <HeroSection isLoggedIn={isLoggedIn} />
    </>
  )
}

export function LandingClientBottom() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setIsLoggedIn(true)
    })
  }, [])

  return (
    <>
      <PricingSection isLoggedIn={isLoggedIn} />
      <FaqSection />
      <CtaSection isLoggedIn={isLoggedIn} />
      <Footer />
    </>
  )
}
