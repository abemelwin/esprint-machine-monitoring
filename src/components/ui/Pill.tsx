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
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-[650] whitespace-nowrap"
      style={{ background: hexAlpha(cfg.hex, 0.14), color: cfg.color }}
    >
      <span
        className="w-2 h-2 rounded-full flex-none"
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
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-[650] whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}
