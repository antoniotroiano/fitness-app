import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BottomSheet, cx } from '../../components/ui'
import {
  axisTicks, bucketSpan, chartWindow, clampOffset, formatRange, inWindow, niceTicks, type ChartWindow,
} from '../../engine/chartWindow'
import { average, type Averaging, type Period, type Point } from '../../engine/stats'
import { formatDate, todayStr } from '../../utils/dates'
import { de } from '../../i18n/de'

const PERIODS: Period[] = ['1W', '1M', '3M', '6M', '1Y', 'All']
const AVG: { value: Averaging; letter: string; label: string }[] = [
  { value: 'daily', letter: 'D', label: de.stats.daily },
  { value: 'weekly', letter: 'W', label: de.stats.weekly },
  { value: 'monthly', letter: 'M', label: de.stats.monthly },
]

const H = 208
const M = { top: 12, right: 56, bottom: 24, left: 6 }

function Chart({ w, points, bar, fmt, mode, canPan, offset, onOffset, today, firstDate }: {
  w: ChartWindow; points: Point[]; bar: boolean; fmt: (v: number) => string; mode: Averaging
  canPan: boolean; offset: number; onOffset: (o: number) => void; today: string; firstDate: string | null
}) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)
  const [sel, setSel] = useState<number | null>(null)
  const drag = useRef<{ x: number; base: number; active: boolean } | null>(null)
  const content = useRef<SVGGElement>(null)
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 320))
    ro.observe(el)
    setWidth(el.clientWidth || 320)
    return () => ro.disconnect()
  }, [])

  const plotW = Math.max(40, width - M.left - M.right)
  const plotH = H - M.top - M.bottom
  const dayW = plotW / w.days
  const placed = useMemo(() => points.map((p) => {
    const span = bucketSpan(p.date, mode, w)
    return { ...p, from: span.from, to: span.to, cx: M.left + ((span.from + span.to + 1) / 2) * dayW }
  }), [points, mode, w, dayW])

  const vals = placed.map((p) => p.value)
  const ticksY = bar
    ? niceTicks(0, Math.max(1, ...vals), 4)
    : vals.length ? niceTicks(Math.min(...vals) - (Math.max(...vals) - Math.min(...vals)) * 0.1, Math.max(...vals) + (Math.max(...vals) - Math.min(...vals)) * 0.1, 4) : [0, 1]
  const lo = ticksY[0]
  const hi = ticksY[ticksY.length - 1]
  const y = (v: number) => M.top + plotH - ((v - lo) / (hi - lo || 1)) * plotH
  const xTicks = axisTicks(w)

  const shift = (px: number, smooth: boolean) => {
    const g = content.current
    if (!g) return
    g.style.transition = smooth ? 'transform 0.15s ease-out' : 'none'
    g.style.transform = `translateX(${px}px)`
  }
  const down = (e: React.PointerEvent) => {
    // Randbereich links bleibt dem System-Wisch (Zurück) überlassen
    if (e.clientX < 20) return
    drag.current = { x: e.clientX, base: offset, active: false }
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || !canPan) return
    const dx = e.clientX - d.x
    if (!d.active) {
      if (Math.abs(dx) < 6) return
      d.active = true
      e.currentTarget.setPointerCapture(e.pointerId)
      setSel(null)
    }
    // Der Graph folgt dem Finger: nach rechts wischen = zurück in die Vergangenheit.
    // Ganze Tage verschieben das Fenster, der Rest wird als Pixelversatz animiert (kein Ratschen).
    const days = Math.round(dx / dayW)
    const next = clampOffset(d.base + days, today, firstDate)
    const atEdge = next !== d.base + days
    shift(atEdge ? 0 : dx - days * dayW, false)
    if (next !== offsetRef.current) { offsetRef.current = next; onOffset(next) }
  }
  const up = () => {
    if (drag.current?.active) shift(0, true)
    drag.current = null
  }

  const selected = sel !== null ? placed[sel] : null
  const bw = Math.max(2, Math.min(28, dayW * 0.7))
  const linePts = [...placed].sort((a, b) => a.cx - b.cx)

  return (
    <div ref={box} className="w-full select-none" style={{ height: H, touchAction: 'pan-y' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <svg width={width} height={H} role="img" aria-label="Diagramm">
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
            <text x={M.left + plotW + 6} y={y(t) + 3.5} fontSize={10} fill="var(--muted)">{fmt(t)}</text>
          </g>
        ))}
        <defs><clipPath id="ts-clip"><rect x={M.left - 2} y={0} width={plotW + 4} height={H} /></clipPath></defs>
        <g clipPath="url(#ts-clip)"><g ref={content} style={{ willChange: 'transform' }}>
        {xTicks.map((t) => (
          <text key={t.index} x={M.left + (t.index + 0.5) * dayW} y={H - 6} fontSize={10} fill="var(--muted)"
            textAnchor={t.index === w.days - 1 && w.days > 7 ? 'end' : t.index === 0 && w.days > 7 ? 'start' : 'middle'}>{t.label}</text>
        ))}
        {bar && placed.map((p, i) => {
          const spanW = mode === 'daily' ? bw : Math.max(3, (p.to - p.from + 1) * dayW * 0.8)
          return <rect key={p.date} x={p.cx - spanW / 2} y={y(p.value)} width={spanW} height={Math.max(1, y(lo) - y(p.value))} rx={3}
            fill="var(--chart-bar)" opacity={sel === null || sel === i ? 1 : 0.5} onClick={() => setSel(sel === i ? null : i)} />
        })}
        {!bar && linePts.length > 1 && (
          <polyline fill="none" stroke="var(--chart-line)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
            points={linePts.map((p) => `${p.cx},${y(p.value)}`).join(' ')} />
        )}
        {!bar && placed.map((p, i) => (
          <circle key={p.date} cx={p.cx} cy={y(p.value)} r={sel === i ? 5 : 3.5} fill="var(--chart-line)" onClick={() => setSel(sel === i ? null : i)} />
        ))}
        </g></g>
        {selected && (() => {
          const label = `${formatDate(selected.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${fmt(selected.value)}`
          const tw = label.length * 6.2 + 14
          const tx = Math.min(width - tw - 2, Math.max(2, selected.cx - tw / 2))
          const ty = Math.max(2, y(selected.value) - 34)
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={tw} height={24} rx={8} fill="var(--surface2)" stroke="var(--line)" />
              <text x={tx + tw / 2} y={ty + 16} fontSize={11} fill="var(--fg)" textAnchor="middle">{label}</text>
            </g>
          )
        })()}
      </svg>
      {points.length === 0 && (
        <div className="-mt-32 text-center text-sm text-muted pointer-events-none">Keine Daten im Zeitraum</div>
      )}
    </div>
  )
}

/**
 * Zeitreihen-Diagramm mit Zeitraum-Auswahl, Datumsbereich als Titel, Wischen durch die Zeit
 * und Mittelung (Daily/Weekly/Monthly) im Auswahlfenster.
 */
export function TimeSeries({ daily, bar, fmt, defaultPeriod = '1W', showAveraging = true, stats, below }: {
  daily: Point[]; bar: boolean; fmt: (v: number) => string; defaultPeriod?: Period; showAveraging?: boolean
  stats?: (shown: Point[]) => ReactNode
  below?: (visible: Point[], w: ChartWindow) => ReactNode
}) {
  const today = todayStr()
  const [period, setPeriod] = useState<Period>(defaultPeriod)
  const [offset, setOffset] = useState(0)
  const [highlight, setHighlight] = useState(true)
  const [mode, setMode] = useState<Averaging>('daily')
  const [sheet, setSheet] = useState(false)

  const firstDate = useMemo(() => daily.reduce<string | null>((m, p) => (m === null || p.date < m ? p.date : m), null), [daily])
  const w = useMemo(() => chartWindow(period, today, firstDate, offset), [period, today, firstDate, offset])
  const visible = useMemo(() => inWindow(daily, w), [daily, w])
  const shown = useMemo(() => (mode === 'daily' ? visible : average(visible, mode, bar)), [visible, mode, bar])

  const pick = (p: Period) => { setPeriod(p); setOffset(0); setHighlight(true) }
  const pan = (o: number) => { if (o !== offset) { setOffset(o); setHighlight(false) } }
  const chipCls = (on: boolean) => cx('rounded-full px-2.5 py-1.5 text-xs whitespace-nowrap border',
    on ? 'bg-accent text-accent-fg border-accent font-semibold' : 'bg-surface2 text-muted border-line')

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-center" aria-live="polite">{formatRange(w)}</div>
      <Chart w={w} points={shown} bar={bar} fmt={fmt} mode={mode} canPan={period !== 'All'} offset={offset}
        onOffset={pan} today={today} firstDate={firstDate} />
      {stats?.(shown)}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex gap-1.5">
          {PERIODS.map((p) => <button key={p} type="button" className={chipCls(highlight && p === period)} onClick={() => pick(p)}>{p}</button>)}
        </div>
        {showAveraging && (
          <button type="button" aria-label={de.stats.averaging} onClick={() => setSheet(true)}
            className="w-8 h-8 rounded-full border border-line bg-surface2 text-xs font-bold shrink-0">
            {AVG.find((a) => a.value === mode)?.letter}
          </button>
        )}
      </div>
      {below?.(visible, w)}

      <BottomSheet open={sheet} onClose={() => setSheet(false)}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setSheet(false)} aria-label="Schließen" className="text-xl text-muted w-8">✕</button>
          <h2 className="font-bold text-lg">{de.stats.averaging}</h2>
        </div>
        <div className="space-y-2">
          {AVG.map((a) => (
            <button key={a.value} onClick={() => { setMode(a.value); setSheet(false) }}
              className={cx('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left',
                mode === a.value ? 'border-accent bg-accent/10' : 'border-line bg-surface2')}>
              <span className="w-8 h-8 rounded-full bg-surface flex items-center justify-center font-bold">{a.letter}</span>
              <span className="text-sm font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
