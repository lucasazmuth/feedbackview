import clsx from 'clsx'
import { cva, type VariantProps } from 'class-variance-authority'

const spinnerVariants = cva(
  'inline-block rounded-full border-2 border-transparent border-t-[rgb(69,94,181)] border-r-[rgb(86,67,204)] animate-spin',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-10 w-10 border-[3px]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string
}

export const Spinner = ({ size, className }: SpinnerProps) => (
  <div
    role="status"
    aria-label="Loading"
    className={clsx(spinnerVariants({ size }), className)}
  >
    <span className="sr-only">Loading...</span>
  </div>
)
