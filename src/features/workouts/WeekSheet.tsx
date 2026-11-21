import { BottomSheet, cx } from '../../components/ui'
import { de } from '../../i18n/de'

/** Sheet zum Springen zwischen Programmwochen (0-basierte Woche intern, "Woche N" in der Anzeige). */
export function WeekSheet({ open, onClose, current, maxWeek, counts, onPick }: {
  open: boolean; onClose: () => void; current: number; maxWeek: number
  /** Anzahl geloggter Workouts je Woche (0-basiert) */
  counts: Record<number, number>
  onPick: (week: number) => void
}) {
  // Bis eine Woche nach der höchsten erreichten, plus etwas Luft zum Vorausplanen
  const weeks = Array.from({ length: maxWeek + 3 }, (_, i) => i)
  const header = (
    <div className="flex items-center gap-3 min-h-8 border-b border-line pb-3 -mx-5 px-5">
      <button type="button" onClick={onClose} aria-label="Schließen"
        className="w-8 h-8 shrink-0 rounded-full bg-surface2 text-muted flex items-center justify-center text-sm">✕</button>
      <h2 className="flex-1 text-center font-bold">Go to …</h2>
      <span className="w-8 shrink-0" />
    </div>
  )
  return (
    <BottomSheet open={open} onClose={onClose} header={header} height="58%">
      <ul className="space-y-2" role="listbox" aria-label="Woche wählen">
        {weeks.map((w) => (
          <li key={w}>
            <button type="button" onClick={() => onPick(w)} role="option" aria-selected={w === current}
              className={cx('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left active:opacity-70',
                w === current ? 'border-accent bg-accent/10' : 'border-line bg-surface2')}>
              <span className="flex-1 text-sm font-medium">{de.workouts.week(w + 1)}</span>
              {counts[w] ? <span className="text-xs text-muted">{counts[w]} Workout{counts[w] > 1 ? 's' : ''}</span> : null}
              {w === current && <span className="text-accent font-bold" aria-label="Aktuelle Woche">●</span>}
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}
