'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']
    const particles: { x: number; y: number; w: number; h: number; color: string; vx: number; vy: number; rot: number; rotSpeed: number; opacity: number }[] = []

    for (let i = 0; i < 200; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height * 1.5,
        w: Math.random() * 10 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        opacity: 1,
      })
    }

    let animId: number
    let frame = 0
    const maxFrames = 300

    function animate() {
      frame++
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotSpeed
        p.vy += 0.04
        p.vx *= 0.999
        if (frame > maxFrames - 90) {
          p.opacity = Math.max(0, p.opacity - 0.012)
        }

        ctx!.save()
        ctx!.translate(p.x, p.y)
        ctx!.rotate(p.rot)
        ctx!.globalAlpha = p.opacity
        ctx!.fillStyle = p.color
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx!.restore()
      }

      if (frame < maxFrames) {
        animId = requestAnimationFrame(animate)
      }
    }

    animate()
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  )
}

export default function UpgradeSuccessPage() {
  const router = useRouter()
  const [planName, setPlanName] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Fetch the current plan name
    fetch('/api/billing/subscription')
      .then(r => r.json())
      .then(data => {
        const plan = data.organization?.plan || 'Pro'
        setPlanName(plan === 'PRO' ? 'Pro' : plan === 'BUSINESS' ? 'Business' : plan)
      })
      .catch(() => setPlanName('Pro'))

    // Animate in
    requestAnimationFrame(() => setShow(true))
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 50%, #faf5ff 100%)',
      position: 'relative',
      overflow: 'hidden',
      padding: '2rem',
    }}>
      <ConfettiCanvas />

      <div style={{
        position: 'relative',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
        maxWidth: 480,
        textAlign: 'center',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Checkmark with pulse */}
        <div style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.15), 0 20px 40px rgba(16, 185, 129, 0.2)',
          animation: 'pulse-ring 2s ease-out infinite',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#111827',
            margin: 0,
            letterSpacing: '-0.02em',
          }}>
            Bem-vindo ao {planName || 'novo plano'}!
          </h1>
          <p style={{
            fontSize: '1.125rem',
            color: '#6b7280',
            margin: 0,
            lineHeight: 1.6,
          }}>
            Sua assinatura foi ativada com sucesso. Todos os recursos do plano {planName} já estão disponíveis.
          </p>
        </div>

        {/* Features unlocked */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {[
            { icon: '⚡', label: 'Mais reports' },
            { icon: '📊', label: 'Logs avançados' },
            { icon: '🕐', label: 'Maior retenção' },
          ].map((item) => (
            <div key={item.label} style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '1rem',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}>
              <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            marginTop: '0.5rem',
            padding: '1rem 2.5rem',
            borderRadius: '1rem',
            border: 'none',
            background: 'linear-gradient(135deg, #111827, #374151)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)'
          }}
        >
          Ir para meus projetos
        </button>

        {/* Powered by */}
        <p style={{
          fontSize: '0.75rem',
          color: '#9ca3af',
          margin: 0,
        }}>
          Powered by <strong>Report Bug</strong>
        </p>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.15), 0 20px 40px rgba(16, 185, 129, 0.2); }
          50% { box-shadow: 0 0 0 16px rgba(16, 185, 129, 0.05), 0 20px 40px rgba(16, 185, 129, 0.2); }
          100% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.15), 0 20px 40px rgba(16, 185, 129, 0.2); }
        }
      `}</style>
    </div>
  )
}
