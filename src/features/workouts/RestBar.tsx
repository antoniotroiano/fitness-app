import { useEffect, useState } from 'react'

export interface RestState { endsAt: number; total: number }

/** Pausen-Countdown (Zeitstempel-basiert) mit ±15 s und Überspringen. */
export function RestBar({ rest, onAdjust, onDone }: { rest: RestState; onAdjust: (deltaSec: number) => void; onDone: () => void }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  const left = Math.max(0, Math.ceil((rest.endsAt - now) / 1000))
  useEffect(() => {
    if (left > 0) return
    try { navigator.vibrate?.([200, 100, 200]) } catch { /* nicht verfügbar */ }
    onDone()
  }, [left, onDone])

  const pct = Math.min(100, Math.max(0, (left / Math.max(1, rest.total)) * 100))
  const btn = 'px-3 py-1.5 rounded-lg bg-surface2 border border-line text-xs'
  return (
    <div className="border-t border-line">
      <div className="h-1 bg-surface2"><div className="h-1 bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} /></div>
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-muted">Pause <span className="text-fg font-semibold tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span></span>
        <div className="flex gap-1.5">
          <button className={btn} onClick={() => onAdjust(-15)}>−15 s</button>
          <button className={btn} onClick={() => onAdjust(15)}>+15 s</button>
          <button className={btn} onClick={onDone}>Überspringen</button>
        </div>
      </div>
    </div>
  )
}
