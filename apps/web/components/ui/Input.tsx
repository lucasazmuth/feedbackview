import clsx from 'clsx'
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  /** Conteúdo alinhado à direita dentro da altura do input (ex.: botão mostrar senha). */
  trailingSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, trailingSlot, ...props }, ref) => {
    const inputId = id ?? props.name

    const inputClassName = clsx(
      'h-10 w-full rounded-lg border bg-gray-dark px-3 text-sm text-off-white placeholder:text-gray',
      'border-transparent-white',
      'focus:outline-none focus:ring-2 focus:ring-[rgb(86,67,204)] focus:border-transparent',
      'transition-shadow duration-200',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error && 'border-danger focus:ring-danger',
      trailingSlot && 'pr-10',
      className
    )

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-off-white"
          >
            {label}
          </label>
        )}
        {trailingSlot ? (
          <div className="relative w-full">
            <input ref={ref} id={inputId} className={inputClassName} {...props} />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center">
              <div className="pointer-events-auto">{trailingSlot}</div>
            </div>
          </div>
        ) : (
          <input ref={ref} id={inputId} className={inputClassName} {...props} />
        )}
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
