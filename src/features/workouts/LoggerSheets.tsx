import { useMemo, useState, type ReactNode } from 'react'
import type { MuscleId } from '../../types'
import { BottomSheet, Button, cx } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import { MuscleDetail } from '../../components/MuscleFigure'
import { de } from '../../i18n/de'

function MenuItem({ icon, label, onClick, danger, disabled }: { icon: IconName; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cx('w-full flex items-center gap-3 rounded-xl bg-surface2 px-4 py-3.5 text-left text-sm font-medium active:opacity-70 disabled:opacity-40', danger && 'text-danger')}>
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
        <MenuItem icon={paused ? 'play' : 'pause'} label={paused ? de.logger.resume : de.logger.pause} onClick={() => { onPause(); close() }} />
        <MenuItem icon="minimize" label={de.logger.minimize} onClick={() => { close(); onMinimize() }} />
        <MenuItem icon="flag" label={de.logger.finish} onClick={() => { close(); onFinish() }} />
        <MenuItem icon="trash" danger label={confirm ? 'Wirklich verwerfen? Nichts wird gespeichert' : de.logger.discard}
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
        <Button className="w-full" onClick={() => onChoose('completed')}>{de.logger.logCompleted}</Button>
        <Button variant="ghost" className="w-full" disabled={openCount === 0} onClick={() => onChoose('all')}>{de.logger.logAll}</Button>
        <p className="text-xs text-muted px-1">{de.logger.logAllHint}</p>
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
    <BottomSheet open={open} onClose={onClose} title={de.logger.complete}>
      <div className="relative">
        {open && <Confetti />}
        <p className="text-sm text-muted text-center mb-3">Stark! Alle Übungen sind abgeschlossen.</p>
        <MuscleDetail primary={primary} secondary={secondary} />
        <div className="flex gap-2 my-4">
          {stats.map((s) => (
            <div key={s.label} className="flex-1 rounded-xl bg-surface2 p-3 text-center">
              <div className="text-2xs uppercase tracking-wide text-muted">{s.label}</div>
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

/** Supersatz: aktuelle Übung mit der vorherigen oder nächsten verbinden oder lösen. Gilt auch für das Programm. */
export function SupersetSheet({ open, onClose, prev, next, inSuperset, onPick }: {
  open: boolean; onClose: () => void; prev?: string; next?: string; inSuperset: boolean
  onPick: (action: 'prev' | 'next' | 'none') => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Supersatz">
      <div className="space-y-2">
        <p className="text-xs text-muted px-1">Die Übungen wechseln sich Satz für Satz ab, die Pause startet erst nach der Runde. Gilt auch für künftige Einheiten dieses Trainingstags.</p>
        {prev && <MenuItem icon="link" label={`Mit vorheriger verbinden: ${prev}`} onClick={() => onPick('prev')} />}
        {next && <MenuItem icon="link" label={`Mit nächster verbinden: ${next}`} onClick={() => onPick('next')} />}
        {inSuperset && <MenuItem icon="ban" label="Aus Supersatz lösen" onClick={() => onPick('none')} />}
      </div>
    </BottomSheet>
  )
}

/** Übung tauschen oder entfernen, wahlweise nur für heute oder dauerhaft im Trainingstag. */
export function ExerciseActionsSheet({ open, onClose, name, persist, onPersist, canRemove, hasDone, onSwap, onRemove }: {
  open: boolean; onClose: () => void; name: string
  persist?: boolean; onPersist?: (v: boolean) => void
  canRemove: boolean; hasDone: boolean
  onSwap: () => void; onRemove: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const close = () => { setConfirm(false); onClose() }
  return (
    <BottomSheet open={open} onClose={close} title={name}>
      <div className="space-y-2">
        {onPersist && <button role="switch" aria-checked={persist} onClick={() => onPersist(!persist)}
          className="w-full flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-left active:opacity-70">
          <span>
            <span className="block text-sm font-medium">Im Programm übernehmen</span>
            <span className="block text-xs text-muted">{persist ? 'Gilt auch für künftige Einheiten dieses Trainingstags.' : 'Gilt nur für diese Einheit, das Programm bleibt unverändert.'}</span>
          </span>
          <span className={cx('h-6 w-10 shrink-0 rounded-full p-0.5 transition-colors', persist ? 'bg-accent' : 'bg-surface2')}>
            <span className={cx('block h-5 w-5 rounded-full bg-white transition-transform', persist && 'translate-x-4')} />
          </span>
        </button>}
        {hasDone && <p className="text-xs text-warn px-1">Die abgehakten Sätze dieser Übung gehen verloren.</p>}
        <MenuItem icon="automation" label="Übung tauschen" onClick={() => { close(); onSwap() }} />
        <MenuItem icon="trash" danger disabled={!canRemove}
          label={!canRemove ? 'Entfernen nicht möglich: letzte Übung' : confirm ? 'Wirklich entfernen?' : 'Übung entfernen'}
          onClick={() => (confirm ? (close(), onRemove()) : setConfirm(true))} />
      </div>
    </BottomSheet>
  )
}

/** Begründung des Progressionsvorschlags (Tipp auf die Vorschlagszeile im Logger). */
export function SuggestionSheet({ open, onClose, info, warn }: {
  open: boolean; onClose: () => void; info: { title: string; text: string } | null; warn: boolean
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={info?.title ?? 'Vorschlag'}>
      <p className={cx('text-sm', warn && 'text-warn')}>{info?.text}</p>
    </BottomSheet>
  )
}
