'use client'

import { buttonClassName } from './Button'

/** Destructive submit with browser confirm. */
export function ConfirmSubmitButton({
  children,
  message,
  className,
  variant = 'danger',
  size = 'sm',
}: {
  children: React.ReactNode
  message: string
  className?: string
  variant?: 'danger' | 'secondary'
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type="submit"
      className={buttonClassName(variant, size, className)}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
