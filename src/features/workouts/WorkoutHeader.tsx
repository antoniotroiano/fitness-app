import { useEffect, useState } from 'react'
import { elapsedMs, formatClock, type ClockState } from '../../engine/workoutClock'
import { Icon } from '../../components/icons'

/** Kopfzeile: Zurück, kleiner Timer (HH:MM:SS), Menü (Pause, Minimieren, Beenden, Verwerfen). */
export function WorkoutHeader({ clock, onBack, onMenu }: { clock: ClockState; onBack: () => void; onMenu: () => void }) {
  const [now, setNow] = useState(Date.now())
  const paused = clock.pausedAt != null
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [paused])
  const sec = elapsedMs(clock, paused ? (clock.pausedAt as number) : now) / 1000

  return (
    <div className="flex items-center justify-between gap-2 h-9">
      <button onClick={onBack} aria-label="Zurück" className="text-2xl text-muted w-9 text-left">‹</button>
      <div className="text-center">
        <div role="timer" aria-label="Workout-Dauer" className="text-base font-semibold tabular-nums leading-none">{formatClock(sec)}</div>
        {paused && <div className="text-[11px] text-warn mt-0.5">Pausiert</div>}
      </div>
      <button onClick={onMenu} aria-label="Workout-Menü" aria-haspopup="dialog"
        className="w-9 h-9 rounded-full bg-surface2 flex items-center justify-center text-fg active:opacity-70"><Icon name="menu" size={20} /></button>
    </div>
  )
}
