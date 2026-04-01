import clsx from 'clsx'
import { type HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export const Card = ({
  children,
  className,
  hover = false,
  ...props
}: CardProps) => (
  <div
    className={clsx(
      'bg-glass-gradient border border-transparent-white rounded-2xl backdrop-blur-md p-6',
      hover &&
        'transition-all duration-300 hover:border-gray hover:scale-[1.01] hover:shadow-primary',
      className
    )}
    {...props}
  >
    {children}
  </div>
)
