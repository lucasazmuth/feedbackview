import clsx from 'clsx'

export const Container = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div className={clsx('mx-auto max-w-[120rem] px-4 md:px-8', className)}>
    {children}
  </div>
)
