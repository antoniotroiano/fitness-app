import { useRef, useState, type ReactNode } from 'react'
import { LinkButton, cx } from '../../components/ui'
import { habitDots, monthGrid, shiftMonth, monthOf } from '../../engine/habits'
import { formatMonth, WEEKDAYS } from '../../utils/dates'
import { de } from '../../i18n/de'

/** Ring, bei dem sich nur die Linie füllt. */
export function Ring({ done, total, color, size, stroke, children }: {
  done: number; total: number; color: string; size: number; stroke: number; children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(1, done / total) : 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset 500ms ease-out' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">{children}</div>
    </div>
  )
}

/** `shown`: Ganzzahl für die Anzeige, falls der Ring anteilig (done) gefüllt wird. */
export function RingStat({ label, done, total, color, big, shown }: { label: string; done: number; total: number; color: string; big?: boolean; shown?: number }) {
  const num = shown ?? Math.round(done * 10) / 10
  const left = Math.max(0, total - num)
  return (
    <div className="flex flex-col items-center gap-3.5" role="img" aria-label={`${label}: ${num} von ${total}, ${left} übrig`}>
      <Ring done={done} total={total} color={color} size={big ? 136 : 88} stroke={big ? 7 : 5}>
        <span className={cx('font-bold tabular-nums', big ? 'text-3xl' : 'text-xl')}>{num}</span>
        <span className={cx('text-muted', big ? 'text-xs' : 'text-2xs')}>{left} übrig</span>
      </Ring>
      <div className="text-center">
        <div className={cx('font-semibold', big ? 'text-sm' : 'text-xs')}>{label}</div>
        <div className="text-2xs text-muted">{total} Ziel</div>
      </div>
    </div>
  )
}

/** Kleines Balkendiagramm (z. B. letzte 7 Tage, rechts = heute). */
export function MiniBars({ values, color = 'var(--chart-bar)' }: { values: number[]; color?: string }) {
  const max = Math.max(1, ...values)
  const w = 100 / values.length
  return (
    <svg viewBox="0 0 100 36" className="w-full h-9" preserveAspectRatio="none" aria-hidden>
      {values.map((v, i) => {
        const h = v > 0 ? Math.max(3, (v / max) * 34) : 2
        return <rect key={i} x={i * w + w * 0.15} y={36 - h} width={w * 0.7} height={h} rx={1.5}
          fill={v > 0 ? color : 'var(--line)'} />
      })}
    </svg>
  )
}

/** Kleines Liniendiagramm (z. B. 1RM der letzten 7 Tage); Tage ohne Wert (null) werden übersprungen. */
export function MiniLine({ values, color = 'var(--chart-line)' }: { values: (number | null)[]; color?: string }) {
  const present = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null)
  const min = Math.min(...present.map((p) => p.v))
  const max = Math.max(...present.map((p) => p.v))
  const x = (i: number) => ((i + 0.5) / values.length) * 100
  const y = (v: number) => (max > min ? 30 - ((v - min) / (max - min)) * 24 : 18)
  return (
    <svg viewBox="0 0 100 36" className="w-full h-9" preserveAspectRatio="none" aria-hidden>
      {present.length > 1 && (
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
          points={present.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} />
      )}
      {present.map((p) => (
        <path key={p.i} d={`M${x(p.i)} ${y(p.v)} h0.01`} stroke={color} strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

/** Box mit Name, 7-Tage-Diagramm und Summe. */
export function StatBox({ title, values, line, total, unit, onClick }: {
  title: string; values: number[]; line?: (number | null)[]; total: number; unit: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl bg-surface border border-line p-3 active:opacity-70 min-w-0">
      <div className="text-sm font-semibold truncate">{title}</div>
      <div className="text-2xs text-muted mb-1.5">Letzte 7 Tage</div>
      {line ? <MiniLine values={line} /> : <MiniBars values={values} />}
      <div className="mt-2 pt-2 border-t border-line text-xs text-muted">
        <span className="text-fg font-semibold tabular-nums">{Math.round(total * 10) / 10}</span> {unit}
      </div>
    </button>
  )
}

/** Kachel für Körperkennzahlen: letzte 7 Einträge als Linie, darunter der zuletzt erfasste Wert. */
export function MetricBox({ title, values, last, unit, onClick }: {
  title: string; values: number[]; last: string | null; unit: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl bg-surface border border-line p-3 active:opacity-70 min-w-0">
      <div className="text-sm font-semibold truncate">{title}</div>
      <div className="text-2xs text-muted mb-1.5">{de.dashboard.last7Entries}</div>
      {values.length ? <MiniLine values={values} /> : <div className="h-9 flex items-center text-xs text-muted">Noch keine Daten</div>}
      <div className="mt-2 pt-2 border-t border-line text-xs text-muted">
        <span className="text-fg font-semibold tabular-nums">{last ?? '–'}</span> {last ? unit : ''}
      </div>
    </button>
  )
}

export function SectionHeader({ title, onAll }: { title: string; onAll?: () => void }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-semibold">{title}</h2>
      {onAll && <LinkButton onClick={onAll}>{de.common.showAll}</LinkButton>}
    </div>
  )
}

/** Gewohnheits-Box: 30 Punkte, Trennlinie, Wochenzähler. */
export function HabitBox({ title, dates, today, color, weekDone, onClick }: {
  title: string; dates: Set<string>; today: string; color: string; weekDone: number; onClick: () => void
}) {
  const dots = habitDots(dates, today, 30)
  return (
    <button onClick={onClick} className="text-left rounded-2xl bg-surface border border-line p-3 active:opacity-70 min-w-0">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-2xs text-muted mb-2">Letzte 30 Tage</div>
      <div className="grid grid-cols-10 gap-1.5" aria-hidden>
        {dots.map((d) => <i key={d.date} className="aspect-square rounded-full" style={{ background: d.on ? color : 'var(--surface2)' }} />)}
      </div>
      <div className="mt-2.5 pt-2 border-t border-line text-xs text-muted">
        <span className="text-fg font-semibold tabular-nums">{weekDone}/7</span> diese Woche
      </div>
    </button>
  )
}

/** Monatskalender mit Kreisen; Wischen nach links/rechts wechselt den Monat. */
export function MonthCalendar({ tracked, today, color, onSelect }: { tracked: Set<string>; today: string; color: string; onSelect?: (date: string) => void }) {
  const [view, setView] = useState(() => monthOf(today))
  const down = useRef<{ x: number; y: number } | null>(null)
  const go = (d: number) => setView((v) => shiftMonth(v.year, v.month0, d))
  const grid = monthGrid(view.year, view.month0)
  const key = `${view.year}-${String(view.month0 + 1).padStart(2, '0')}`

  return (
    <div className="select-none" style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY } }}
      onPointerUp={(e) => {
        const s = down.current
        down.current = null
        if (!s) return
        const dx = e.clientX - s.x
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) go(dx < 0 ? 1 : -1)
      }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => go(-1)} aria-label="Vorheriger Monat" className="w-9 h-9 text-xl text-muted">‹</button>
        <div className="font-semibold capitalize">{formatMonth(key)}</div>
        <button onClick={() => go(1)} aria-label="Nächster Monat" className="w-9 h-9 text-xl text-muted">›</button>
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center">
        {WEEKDAYS.map((w) => <div key={w} className="text-2xs text-muted">{w}</div>)}
        {grid.flat().map((d, i) => {
          if (!d) return <div key={i} />
          const on = tracked.has(d)
          const future = d > today
          return (
            <div key={d} className="flex justify-center">
              <button type="button" disabled={!onSelect} onClick={() => onSelect?.(d)} aria-label={d}
                className={cx('w-9 h-9 rounded-full flex items-center justify-center text-sm tabular-nums', d === today && 'font-bold', future && 'opacity-40', onSelect && 'active:opacity-60')}
                style={on ? { background: color, color: '#fff' } : { border: `1px solid ${d === today ? 'var(--fg)' : 'var(--line)'}` }}>
                {Number(d.slice(8))}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CalendarLegend({ color }: { color: string }) {
  return (
    <div className="flex justify-center gap-6 text-xs text-muted pt-2">
      <span className="flex items-center gap-2"><i className="w-3.5 h-3.5 rounded-full inline-block" style={{ background: color }} /> Erfasst</span>
      <span className="flex items-center gap-2"><i className="w-3.5 h-3.5 rounded-full inline-block border border-line" /> Nicht erfasst</span>
    </div>
  )
}
