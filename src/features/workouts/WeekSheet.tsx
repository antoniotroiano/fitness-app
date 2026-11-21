import { BottomSheet, cx } from '../../components/ui'
import type { WeekOption } from '../../engine/weekCycle'

/** Sheet zum Springen zwischen den Wochen der Programmblöcke (0-basierte Woche intern, "Woche N"/"Deload" in der Anzeige). */
export function WeekSheet({ open, onClose, current, options, counts, onPick }: {
  open: boolean; onClose: () => void; current: number
  /** Wochen der Programmblöcke (siehe `weekOptions`) */
  options: WeekOption[]
  /** Anzahl geloggter Workouts je Woche (0-basiert) */
  counts: Record<number, number>
  onPick: (week: number) => void
}) {
  const blocks = [...new Set(options.map((o) => o.block))]
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
      <div className="space-y-4">
        {blocks.map((b) => (
          <section key={b}>
            {blocks.length > 1 && <h3 className="text-xs uppercase tracking-wide text-muted mb-2">Block {b + 1}</h3>}
            <ul className="space-y-2" role="listbox" aria-label={blocks.length > 1 ? `Woche wählen, Block ${b + 1}` : 'Woche wählen'}>
              {options.filter((o) => o.block === b).map(({ week: w, label }) => (
                <li key={w}>
                  <button type="button" onClick={() => onPick(w)} role="option" aria-selected={w === current}
                    className={cx('w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left active:opacity-70',
                      w === current ? 'border-accent bg-accent/10' : 'border-line bg-surface2')}>
                    <span className="flex-1 text-sm font-medium">{label}</span>
                    {counts[w] ? <span className="text-xs text-muted">{counts[w]} Workout{counts[w] > 1 ? 's' : ''}</span> : null}
                    {w === current && <span className="text-accent font-bold" aria-label="Aktuelle Woche">●</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </BottomSheet>
  )
}
