import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'primary' | 'danger' | 'ghost'
type Size = 'md' | 'sm'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const base = 'inline-flex items-center justify-center gap-1.5 font-[550] cursor-pointer transition-all duration-150 whitespace-nowrap active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none shadow-sm'

const variants: Record<Variant, string> = {
  default: 'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]',
  primary: 'bg-[var(--accent)] text-white border border-[var(--accent)] hover:brightness-110 active:brightness-95 shadow-[0_1px_3px_rgba(42,120,214,0.3)]',
  danger:  'bg-[var(--surface-1)] border border-[var(--border)] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] active:bg-[color-mix(in_srgb,var(--danger)_15%,transparent)]',
  ghost:   'bg-transparent border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] shadow-none',
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
