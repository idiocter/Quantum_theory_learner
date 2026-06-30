'use client'

// An SVG progress ring: a coloured arc whose fill tracks `percent`, with the
// percentage in the centre. Used for per-branch completion on the dashboard.
export default function ProgressRing({
  percent,
  color,
  label,
  sublabel,
  size = 72,
}: {
  percent: number
  color: string
  label?: string
  sublabel?: string
  size?: number
}) {
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = c * (1 - clamped / 100)

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-mono text-white">
          {clamped}%
        </div>
      </div>
      {label && <span className="text-[11px] text-slate-400 text-center leading-tight max-w-[88px]">{label}</span>}
      {sublabel && <span className="text-[10px] text-slate-600 font-mono">{sublabel}</span>}
    </div>
  )
}
