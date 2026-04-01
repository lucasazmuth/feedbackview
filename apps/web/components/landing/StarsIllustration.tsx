import type { CSSProperties } from 'react'
import clsx from 'clsx'

const STAR_COUNT = 120

export function StarsIllustration({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'pointer-events-none relative flex h-full min-h-[28rem] w-full items-end justify-center overflow-hidden md:min-h-[36rem]',
        className
      )}
      aria-hidden
    >
      <svg
        className="h-[85%] w-full max-w-[120rem] text-off-white opacity-[0.06] md:opacity-[0.08]"
        viewBox="0 0 800 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        {Array.from({ length: STAR_COUNT }, (_, i) => {
          const x = (i * 127 + 31) % 800
          const y = (i * 83 + 17) % 400
          const size = (i % 3) + 1
          const twinkle = i % 5 === 0
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={size}
              height={size}
              fill="currentColor"
              className={twinkle ? 'animate-zap' : undefined}
              style={twinkle ? ({ '--index': i } as CSSProperties) : undefined}
            />
          )
        })}
      </svg>
    </div>
  )
}
