import { useEffect, useState } from 'react'
import { elapsedMs, formatClock, type ClockState } from '../../engine/workoutClock'
import { Button } from '../../components/ui'

/** Kopfzeile: Zurück, Timer (HH:MM:SS), Pause/Fortsetzen, Beenden. */
export function WorkoutHeader({ clock, onBack, onTogglePause, onFinish }: {
  clock: ClockState; onBack: () => void; onTogglePause: () => void; onFinish: () => void
}) {
  const [now, setNow] = useState(Date.now())
  const paused = clock.pausedAt != null
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [paused])
  const sec = elapsedMs(clock, paused ? (clock.pausedAt as number) : now) / 1000

  return (
    <div className="flex items-center justify-between gap-2">
      <button onClick={onBack} aria-label="Zurück" className="text-2xl text-muted w-9">‹</button>
      <div className="text-center">
        <div role="timer" aria-label="Workout-Dauer" className="text-3xl font-bold tabular-nums leading-none">{formatClock(sec)}</div>
        {paused && <div className="text-xs text-amber-500 mt-1">Pausiert</div>}
      </div>
      <div className="flex gap-1.5">
        <Button variant="ghost" className="!px-3 !py-2" onClick={onTogglePause} aria-label={paused ? 'Fortsetzen' : 'Pausieren'}>{paused ? '▶' : '⏸'}</Button>
        <Button className="!px-3 !py-2" onClick={onFinish}>Beenden</Button>
      </div>
    </div>
  )
}
