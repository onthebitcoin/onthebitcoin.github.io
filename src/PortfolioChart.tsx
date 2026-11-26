// Simple SVG donut chart showing each token's share of the chain's total
// USD value — no charting library, just a handful of <circle> arcs via
// stroke-dasharray (a well-known lightweight technique for a donut chart).
// Only rendered when there's at least one priced value to show.
const COLORS = [
  '#a78bfa', // purple-400
  '#60a5fa', // blue-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f472b6', // pink-400
  '#38bdf8', // sky-400
  '#fb923c', // orange-400
  '#a3e635', // lime-400
]

export interface ChartSlice {
  label: string
  value: number
}

const SIZE = 140
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function PortfolioChart({ slices }: { slices: ChartSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  if (total <= 0 || slices.length === 0) return null

  let offset = 0
  const arcs = slices.map((slice, i) => {
    const fraction = slice.value / total
    const dash = fraction * CIRCUMFERENCE
    const arc = {
      color: COLORS[i % COLORS.length],
      dash,
      offset,
      slice,
      fraction,
    }
    offset += dash
    return arc
  })

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0 -rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          className="text-neutral-800 light:text-neutral-200"
          strokeWidth={STROKE}
        />
        {arcs.map((arc) => (
          <circle
            key={arc.slice.label}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
        {arcs.map((arc) => (
          <li key={arc.slice.label} className="flex items-center gap-1.5 truncate">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: arc.color }}
            />
            <span className="truncate text-neutral-300 light:text-neutral-700">
              {arc.slice.label}
            </span>
            <span className="ml-auto shrink-0 font-mono text-neutral-500">
              {(arc.fraction * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
