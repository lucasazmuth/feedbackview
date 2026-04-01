'use client'

import React from 'react'
import { ICON_PX, ICON_STROKE, type IconSizeName } from '@/lib/icon-tokens'

export type AppIconSize = IconSizeName | number

export type AppIconProps = Omit<React.SVGProps<SVGSVGElement>, 'children' | 'size'> & {
  children: React.ReactNode
  size?: AppIconSize
  strokeWidth?: number
}

export function AppIcon({
  children,
  size = 'md',
  strokeWidth = ICON_STROKE.default,
  className,
  style,
  ...rest
}: AppIconProps) {
  const px = typeof size === 'number' ? size : ICON_PX[size]
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      {...rest}
    >
      {children}
    </svg>
  )
}

AppIcon.displayName = 'AppIcon'

/** Para clonar tamanho no sidebar colapsado (só funciona com `<AppIcon>` direto). */
export function appIconWithSize(icon: React.ReactNode, px: number) {
  if (React.isValidElement(icon) && (icon.type as { displayName?: string }).displayName === 'AppIcon') {
    return React.cloneElement(icon as React.ReactElement<AppIconProps>, { size: px })
  }
  return icon
}
