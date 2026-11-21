import { useEffect, useState } from 'react'
import { BottomSheet, cx } from '../../components/ui'
import { Icon } from '../../components/icons'

export interface RestState { endsAt: number; total: number }

const PRESETS = [30, 60, 90, 120, 180]

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

/** Restsekunden eines laufenden Pausen-Timers (zeitstempelbasiert), meldet das Ende einmal. */
function useRemaining(rest: RestState | null, onDone?: () => void): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!rest) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [rest])
  const left = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0
  useEffect(() => {
    if (!rest || !onDone || rest.endsAt > now) return
    try { navigator.vibrate?.([200, 100, 200]) } catch { /* nicht verfügbar */ }
    onDone()
  }, [rest, now, onDone])
  return left
}

/**
 * Pausen-Uhr in der Kopfzeile: läuft ein Timer, zeigt sie die Restzeit mit Fortschrittsring,
 * sonst nur das Uhr-Symbol. Antippen öffnet das Timer-Menü.
 */
export function RestChip({ rest, onDone, onOpen }: { rest: RestState | null; onDone: () => void; onOpen: () => void }) {
  const left = useRemaining(rest, onDone)
  const r = 9
  const circ = 2 * Math.PI * r
  const frac = rest ? Math.min(1, left / Math.max(1, rest.total)) : 0
  return (
    <button onClick={onOpen} aria-haspopup="dialog" aria-label={rest ? `Pausen-Timer, noch ${mmss(left)}` : 'Pausen-Timer'}
      className={cx('h-9 rounded-full flex items-center gap-1.5 active:opacity-70', rest ? 'bg-accent/15 text-fg pl-1.5 pr-3' : 'w-9 justify-center bg-surface2 text-fg')}>
      {rest ? (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="-rotate-90">
            <circle cx="12" cy="12" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
            <circle cx="12" cy="12" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} className="transition-[stroke-dashoffset] duration-200" />
          </svg>
          <span role="timer" className="text-sm font-semibold tabular-nums">{mmss(left)}</span>
        </>
      ) : <Icon name="timer" size={20} />}
    </button>
  )
}

/** Timer-Menü: laufenden Timer verlängern/verkürzen/stoppen oder einen eigenen Timer starten. */
export function RestSheet({ open, onClose, rest, onAdjust, onStop, onStart }: {
  open: boolean; onClose: () => void; rest: RestState | null
  onAdjust: (deltaSec: number) => void; onStop: () => void; onStart: (sec: number) => void
}) {
  const left = useRemaining(open ? rest : null)
  const btn = 'flex-1 h-11 rounded-xl bg-surface2 text-sm font-medium active:opacity-70'
  return (
    <BottomSheet open={open} onClose={onClose} title="Pausen-Timer">
      <div className="space-y-4">
        {rest ? (
          <>
            <div className="text-center text-4xl font-semibold tabular-nums">{mmss(left)}</div>
            <div className="flex gap-2">
              <button className={btn} onClick={() => onAdjust(-15)}>−15 s</button>
              <button className={btn} onClick={() => onAdjust(15)}>+15 s</button>
              <button className={cx(btn, 'text-danger')} onClick={() => { onStop(); onClose() }}>Stoppen</button>
            </div>
          </>
        ) : <p className="text-sm text-muted">Kein Timer aktiv. Nach jedem abgehakten Satz startet die Pause automatisch.</p>}
        <div>
          <div className="text-xs text-muted mb-2">{rest ? 'Neu starten mit' : 'Timer starten'}</div>
          <div className="flex gap-2">
            {PRESETS.map((sec) => (
              <button key={sec} className={btn} onClick={() => { onStart(sec); onClose() }}>{mmss(sec)}</button>
            ))}
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
