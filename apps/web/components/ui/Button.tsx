import clsx from 'clsx'
import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 whitespace-nowrap select-none disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-gradient text-white hover:shadow-primary hover:brightness-110 active:brightness-95',
        secondary:
          'bg-glass-gradient border border-transparent-white text-off-white hover:bg-transparent-white active:brightness-90',
        ghost:
          'bg-transparent text-gray hover:text-off-white hover:bg-transparent-white active:brightness-90',
        danger:
          'bg-danger text-white hover:brightness-110 active:brightness-95',
      },
      size: {
        small: 'text-xs px-3 h-7 gap-1.5',
        medium: 'text-sm px-4 h-8 gap-2',
        large: 'text-md px-6 h-12 gap-2.5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'medium',
    },
  }
)

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'>,
    VariantProps<typeof buttonVariants> {
  href?: string
  target?: string
  rel?: string
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ className, variant, size, href, children, ...props }, ref) => {
    const classes = clsx(buttonVariants({ variant, size }), className)

    if (href) {
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={classes}
          {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </Link>
      )
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <span className={clsx('bg-primary-gradient bg-clip-text text-transparent', className)}>
    {children}
  </span>
)

export { buttonVariants }
