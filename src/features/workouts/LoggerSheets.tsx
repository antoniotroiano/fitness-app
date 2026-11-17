import { useMemo, useState, type ReactNode } from 'react'
import type { MuscleId } from '../../types'
import { BottomSheet, Button, cx } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import { MuscleDetail } from '../../components/MuscleFigure'

function MenuItem({ icon, label, onClick, danger }: { icon: IconName; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={cx('w-full flex items-center gap-3 rounded-xl bg-surface2 px-4 py-3.5 text-left text-sm font-medium active:opacity-70', danger && 'text-red-500')}>
      <Icon name={icon} size={20} />{label}
    </button>
  )
}

/** Workout-Menü: Pausieren, Minimieren, Beenden, Verwerfen. */
export function WorkoutMenuSheet({ open, onClose, paused, onPause, onMinimize, onFinish, onDiscard }: {
  open: boolean; onClose: () => void; paused: boolean
  onPause: () => void; onMinimize: () => void; onFinish: () => void; onDiscard: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const close = () => { setConfirm(false); onClose() }
  return (
    <BottomSheet open={open} onClose={close} title="Workout">
      <div className="space-y-2">
        <MenuItem icon={paused ? 'play' : 'pause'} label={paused ? 'Resume Workout' : 'Pause Workout'} onClick={() => { onPause(); close() }} />
        <MenuItem icon="minimize" label="Minimize Workout" onClick={() => { close(); onMinimize() }} />
        <MenuItem icon="flag" label="Finish Workout" onClick={() => { close(); onFinish() }} />
        <MenuItem icon="trash" danger label={confirm ? 'Wirklich verwerfen? Nichts wird gespeichert' : 'Discard Workout'}
          onClick={() => (confirm ? (close(), onDiscard()) : setConfirm(true))} />
      </div>
    </BottomSheet>
  )
}

/** Abfrage beim Beenden: nur erledigte Sätze oder alle Sätze loggen. */
export function FinishChoiceSheet({ open, onClose, doneCount, openCount, onChoose }: {
  open: boolean; onClose: () => void; doneCount: number; openCount: number
  onChoose: (mode: 'completed' | 'all') => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Workout beenden">
      <p className="text-sm text-muted mb-4">{doneCount} Sätze abgehakt, {openCount} offen. Was soll gespeichert werden?</p>
      <div className="space-y-2">
        <Button className="w-full" onClick={() => onChoose('completed')}>Log only Completed Sets</Button>
        <Button variant="ghost" className="w-full" disabled={openCount === 0} onClick={() => onChoose('all')}>Log All Sets</Button>
        <p className="text-xs text-muted px-1">„All“ übernimmt auch nicht abgehakte Sätze mit den eingetragenen Werten.</p>
        <Button variant="ghost" className="w-full" onClick={onClose}>Zurück zum Workout</Button>
      </div>
    </BottomSheet>
  )
}

const CONFETTI_COLORS = ['#f97316', '#22c55e', '#38bdf8', '#a78bfa', '#f472b6', '#facc15']

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: (i * 37) % 100, delay: ((i * 53) % 100) / 100 * 0.9, dur: 1.8 + ((i * 29) % 10) / 10,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], rot: (i * 47) % 360, size: 6 + (i % 3) * 2,
  })), [])
  return (
    <div className="confetti pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{
          left: `${p.left}%`, width: p.size, height: p.size * 1.6, background: p.color,
          animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)`,
        }} />
      ))}
    </div>
  )
}

/** Abschluss-Sheet: erscheint automatisch, wenn alle Übungen fertig sind. */
export function CompleteSheet({ open, onClose, primary, secondary, stats, onSave }: {
  open: boolean; onClose: () => void; primary: MuscleId[]; secondary: MuscleId[]
  stats: { label: string; value: string }[]; onSave: () => void
}): ReactNode {
  return (
    <BottomSheet open={open} onClose={onClose} title="Complete Workout">
      <div className="relative">
        {open && <Confetti />}
        <p className="text-sm text-muted text-center mb-3">Stark! Alle Übungen sind abgeschlossen.</p>
        <MuscleDetail primary={primary} secondary={secondary} />
        <div className="flex gap-2 my-4">
          {stats.map((s) => (
            <div key={s.label} className="flex-1 rounded-xl bg-surface2 p-3 text-center">
              <div className="text-[11px] uppercase tracking-wide text-muted">{s.label}</div>
              <div className="text-base font-bold mt-0.5 tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Button className="w-full" onClick={onSave}>Abschließen und speichern</Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>Weiter trainieren</Button>
        </div>
      </div>
    </BottomSheet>
  )
}
