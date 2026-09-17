import { STATUS_CONFIG } from '../../lib/constants'
import type { MachineStatus } from '../../types/database'

function hexAlpha(hex: string, a: number) {
  if (hex.startsWith('var')) return hex
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export function StatusPill({ status }: { status: MachineStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { hex: '#888', color: '#888', icon: '' }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-[600] tracking-wide whitespace-nowrap shadow-sm border"
      style={{
        background: hexAlpha(cfg.hex, 0.12),
        color: cfg.color,
        borderColor: hexAlpha(cfg.hex, 0.25),
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-none shadow-[0_0_6px_currentColor]"
        style={{ background: cfg.hex }}
      />
      {status}
    </span>
  )
}

export function Pill({
  label,
  color,
  bg,
}: {
  label: string
  color: string
  bg: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-[600] whitespace-nowrap border shadow-sm"
      style={{
        background: bg,
        color,
        borderColor: 'color-mix(in srgb, currentColor 20%, transparent)',
      }}
    >
      {label}
    </span>
  )
}
