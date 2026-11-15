import type { PlannedView } from '../../engine/plannedDay'
import type { LoggedSet, Settings } from '../../types'
import { cx } from '../../components/ui'
import { rirColor } from '../../components/rir'
import { kgToDisplay, kmToDisplay } from '../../utils/units'
import { SwipeRow } from './SwipeRow'
import type { Row } from './state'

export type PadField = 'weight' | 'reps'

interface Props {
  view: PlannedView
  rows: Row[]
  settings: Settings
  activePad: { rowId: string; field: PadField } | null
  onPatch: (rowId: string, p: Partial<Row>) => void
  onToggleDone: (row: Row) => void
  onAdd: () => void
  onDelete: (rowId: string) => void
  onType: (rowId: string) => void
  onPad: (rowId: string, field: PadField) => void
}

function previousText(s: LoggedSet | undefined, cardio: boolean, settings: Settings): string {
  if (!s) return '–'
  if (cardio) return `${s.minutes ?? 0} min${s.km ? ` · ${kmToDisplay(s.km, settings.distanceUnit)} ${settings.distanceUnit}` : ''}`
  return `${kgToDisplay(s.weight, settings.weightUnit)} ${settings.weightUnit} × ${s.reps}`
}

const COLS = 'grid-cols-[2.75rem_1fr_4.5rem_4.5rem_2.75rem]'

/** Satztabelle: Set | Previous | kg | Reps | Haken */
export function SetTable({ view, rows, settings, activePad, onPatch, onToggleDone, onAdd, onDelete, onType, onPad }: Props) {
  const cardio = !!view.ex.cardio
  let warmIdx = -1
  let workIdx = -1
  const cell = 'h-10 rounded-lg bg-surface2 text-center text-sm tabular-nums flex items-center justify-center'

  return (
    <div className="rounded-2xl border border-line overflow-hidden bg-surface">
      <div className={cx('grid gap-2 px-2 py-2 text-xs text-muted text-center border-b border-line', COLS)}>
        <span>Set</span><span>Previous</span>
        <span>{cardio ? 'min' : settings.weightUnit}</span><span>{cardio ? settings.distanceUnit : 'Reps'}</span><span />
      </div>
      {rows.map((r) => {
        const warm = r.type === 'warmup'
        if (warm) warmIdx++; else workIdx++
        const prev = warm ? view.previous.warmups[warmIdx] : view.previous.work[workIdx]
        const rirN = r.rir === '' ? null : Number(r.rir)
        const padOn = (f: PadField) => activePad?.rowId === r.id && activePad.field === f
        return (
          <SwipeRow key={r.id} onDelete={() => onDelete(r.id)}>
            <div className={cx('grid gap-2 px-2 py-1.5 items-center', COLS, r.done && 'bg-accent/10')}>
              <button onClick={() => onType(r.id)} aria-label="Satztyp ändern"
                className={cx('h-10 rounded-lg text-sm font-semibold', warm ? 'text-amber-500' : 'text-fg')}>
                {warm ? 'W' : workIdx + 1}
              </button>
              <span className="text-xs text-muted text-center truncate">{previousText(prev, cardio, settings)}</span>
              {cardio ? (
                <>
                  <input inputMode="decimal" className={cx(cell, 'w-full outline-none')} value={r.minutes}
                    onChange={(e) => onPatch(r.id, { minutes: e.target.value.replace(',', '.') })} placeholder="min" />
                  <input inputMode="decimal" className={cx(cell, 'w-full outline-none')} value={r.km}
                    onChange={(e) => onPatch(r.id, { km: e.target.value.replace(',', '.') })} placeholder={settings.distanceUnit} />
                </>
              ) : (
                <>
                  <button onClick={() => onPad(r.id, 'weight')} className={cx(cell, padOn('weight') && 'ring-2 ring-accent')}>{r.weight || '–'}</button>
                  <button onClick={() => onPad(r.id, 'reps')} className={cx(cell, 'relative', padOn('reps') && 'ring-2 ring-accent')}>
                    {r.reps || '–'}
                    {rirN !== null && !warm && (
                      <span className="absolute bottom-0.5 right-1.5 text-[10px] font-bold leading-none" style={{ color: rirColor(rirN) }}>{rirN}</span>
                    )}
                  </button>
                </>
              )}
              <button aria-label="Satz abhaken" onClick={() => onToggleDone(r)}
                className={cx('h-10 rounded-lg border', r.done ? 'bg-accent text-slate-900 border-accent' : 'border-line text-transparent')}>✓</button>
            </div>
          </SwipeRow>
        )
      })}
      <div className={cx('grid gap-2 px-2 py-1.5 items-center', COLS)}>
        <button onClick={onAdd} aria-label="Satz hinzufügen" className="h-10 rounded-lg bg-surface2 text-accent text-xl">+</button>
        <span className="text-xs text-muted col-span-4">Satz hinzufügen</span>
      </div>
    </div>
  )
}
