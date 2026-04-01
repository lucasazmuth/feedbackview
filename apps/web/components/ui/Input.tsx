import clsx from 'clsx'
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  /** Alinhado à direita na mesma linha do label (ex.: “Esqueceu a senha?”). */
  labelRightSlot?: ReactNode
  error?: string
  /** Conteúdo alinhado à direita dentro da altura do input (ex.: botão mostrar senha). */
  trailingSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, labelRightSlot, error, id, trailingSlot, ...props }, ref) => {
    const inputId = id ?? props.name

    const inputClassName = clsx(
      'h-10 w-full box-border rounded-[0.5rem] border border-solid px-3 text-sm outline-none',
      'border-[color:var(--neutral-border-medium)] bg-[var(--surface-background)]',
      'text-[color:var(--neutral-on-background-strong)]',
      'placeholder:text-[color:var(--neutral-on-background-weak)]',
      'transition-[border-color,box-shadow] duration-150',
      'focus:border-[color:var(--brand-solid-strong)] focus:shadow-[0_0_0_2px_var(--brand-alpha-weak)]',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      error &&
        'border-[color:var(--danger-solid-strong)] focus:border-[color:var(--danger-solid-strong)] focus:shadow-[0_0_0_2px_var(--danger-alpha-weak)]',
      trailingSlot && 'pr-10',
      className
    )

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-[color:var(--neutral-on-background-medium)]"
            >
              {label}
            </label>
            {labelRightSlot}
          </div>
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
