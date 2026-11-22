import { useEffect, useState, type ReactNode } from 'react'
import { elapsedMs, formatClock, type ClockState } from '../../engine/workoutClock'
import { Icon } from '../../components/icons'
import { t } from '../../i18n'

/** Kopfzeile: Zurück, Workout-Dauer (HH:MM:SS, linksbündig), rechts Pausen-Uhr (`timer`) und Menü. */
export function WorkoutHeader({ clock, onBack, onMenu, timer }: { clock: ClockState; onBack: () => void; onMenu: () => void; timer?: ReactNode }) {
  const [now, setNow] = useState(Date.now())
  const paused = clock.pausedAt != null
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [paused])
  const sec = elapsedMs(clock, paused ? (clock.pausedAt as number) : now) / 1000

  return (
    <div className="flex items-center gap-2 h-9">
      <button onClick={onBack} aria-label={t('Zurück')} className="text-2xl text-muted w-7 text-left">‹</button>
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <div role="timer" aria-label={t('Workout-Dauer')} className="text-base font-semibold tabular-nums leading-none">{formatClock(sec)}</div>
        {paused && <div className="text-2xs text-warn">{t('Pausiert')}</div>}
      </div>
      {timer}
      <button onClick={onMenu} aria-label={t('Workout-Menü')} aria-haspopup="dialog"
        className="w-9 h-9 rounded-full bg-surface2 flex items-center justify-center text-fg active:opacity-70"><Icon name="menu" size={20} /></button>
    </div>
  )
}
