import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'primary' | 'danger' | 'ghost'
type Size = 'md' | 'sm'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const base = 'inline-flex items-center gap-1.5 font-[550] cursor-pointer transition-[filter,border-color,color] duration-150 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  default: 'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
  primary: 'bg-[var(--accent)] text-white border border-[var(--accent)] hover:brightness-110',
  danger:  'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--danger)] hover:border-[var(--border-strong)]',
  ghost:   'bg-transparent border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
}

const sizes: Record<Size, string> = {
  md: 'px-3.5 py-2 rounded-[9px] text-[13px]',
  sm: 'px-2.5 py-1.5 rounded-[7px] text-[12px]',
}

export function Button({ variant = 'default', size = 'md', className = '', children, ...props }: Props) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
