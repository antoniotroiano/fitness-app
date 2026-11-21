import type { PlannedView } from '../../engine/plannedDay'
import type { LoggedSet, Settings } from '../../types'
import { LinkButton, cx } from '../../components/ui'
import { Icon } from '../../components/icons'
import { rirColor } from '../../components/rir'
import { kgToDisplay, kmToDisplay } from '../../utils/units'
import { isPerSide } from '../../engine/stats'
import { SwipeRow } from './SwipeRow'
import type { Row } from './state'
import { de } from '../../i18n/de'

export type PadField = 'weight' | 'reps'

interface Props {
  view: PlannedView
  rows: Row[]
  settings: Settings
  activePad: { rowId: string; field: PadField } | null
  onPatch: (rowId: string, p: Partial<Row>) => void
  onToggleDone: (row: Row) => void
  onToggleAll: () => void
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

const COLS = 'grid-cols-[2rem_1fr_3.5rem_3.5rem_2rem]'

/** Kleines Kästchen: leer, bis der Satz abgehakt ist; `mixed` zeigt einen Strich (Kopfzeile, teilweise erledigt). */
function Check({ state }: { state: boolean | 'mixed' }) {
  return (
    <span className={cx('w-6 h-6 rounded-md border flex items-center justify-center transition-colors',
      state === true ? 'bg-accent border-accent text-accent-fg' : state === 'mixed' ? 'border-accent text-accent' : 'border-line')}>
      {state === true ? <Icon name="check" size={16} /> : state === 'mixed' ? <span className="text-sm leading-none">–</span> : null}
    </span>
  )
}

/** Satztabelle: Satz | Zuletzt | kg | Wdh. (RIR unten rechts im Feld) | Haken */
export function SetTable({ view, rows, settings, activePad, onPatch, onToggleDone, onToggleAll, onAdd, onDelete, onType, onPad }: Props) {
  const cardio = !!view.ex.cardio
  const side = !cardio && isPerSide(view.ex)
  const doneN = rows.filter((r) => r.done).length
  const allDone = rows.length > 0 && doneN === rows.length
  let warmIdx = -1
  let workIdx = -1
  const cell = 'h-9 rounded-md bg-surface2 text-center text-sm tabular-nums flex items-center justify-center'

  return (
    <div className="-mx-1">
      <div className={cx('grid gap-1.5 px-1 pb-1.5 items-center text-2xs text-muted text-center border-b border-line', COLS)}>
        <span>{de.logger.set}</span><span>{de.logger.previous}</span>
        <span>{cardio ? 'min' : side ? de.logger.perSide(settings.weightUnit) : settings.weightUnit}</span>
        <span>{cardio ? settings.distanceUnit : side ? de.logger.repsPerSide : view.ex.metric === 'time' ? de.common.seconds : de.common.reps}</span>
        <button onClick={onToggleAll} disabled={rows.length === 0} role="checkbox" aria-checked={allDone ? true : doneN > 0 ? 'mixed' : false}
          aria-label="Alle Sätze abhaken"
          className="h-8 flex items-center justify-center disabled:opacity-40">
          <Check state={allDone ? true : doneN > 0 ? 'mixed' : false} />
        </button>
      </div>
      {rows.map((r) => {
        const warm = r.type === 'warmup'
        if (warm) warmIdx++; else workIdx++
        const prev = warm ? view.previous.warmups[warmIdx] : view.previous.work[workIdx]
        const rirN = r.rir === '' ? null : Number(r.rir)
        const padOn = (f: PadField) => activePad?.rowId === r.id && activePad.field === f
        return (
          <SwipeRow key={r.id} onDelete={() => onDelete(r.id)}>
            <div data-row-id={r.id} className={cx('grid gap-1.5 px-1 py-1 items-center border-b border-line/60 transition-colors', COLS, r.done && 'bg-surface2/60')}>
              <button onClick={() => onType(r.id)} aria-label="Satztyp ändern"
                className={cx('justify-self-center w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center active:opacity-70',
                  warm ? 'bg-warn/15 text-warn' : 'bg-surface2 text-fg', r.done && 'opacity-40')}>
                {warm ? 'W' : workIdx + 1}
              </button>
              <span className={cx('text-xs text-muted text-center truncate', r.done && 'opacity-50')}>{previousText(prev, cardio, settings)}</span>
              {cardio ? (
                <>
                  <input inputMode="decimal" className={cx(cell, 'w-full outline-none', r.done && 'opacity-40')} value={r.minutes}
                    onChange={(e) => onPatch(r.id, { minutes: e.target.value.replace(',', '.') })} placeholder="min" />
                  <input inputMode="decimal" className={cx(cell, 'w-full outline-none', r.done && 'opacity-40')} value={r.km}
                    onChange={(e) => onPatch(r.id, { km: e.target.value.replace(',', '.') })} placeholder={settings.distanceUnit} />
                </>
              ) : (
                <>
                  <button onClick={() => onPad(r.id, 'weight')} className={cx(cell, r.done && 'opacity-40', padOn('weight') && 'ring-2 ring-accent !opacity-100')}>{r.weight || '–'}</button>
                  <button onClick={() => onPad(r.id, 'reps')} aria-label={rirN !== null && !warm ? `${r.reps || '–'}${r.failure ? ' oder mehr, bis zum Versagen' : ''}, Ziel-RIR ${rirN}` : undefined}
                    className={cx(cell, 'relative', r.done && 'opacity-40', padOn('reps') && 'ring-2 ring-accent !opacity-100')}>
                    {r.reps || '–'}{r.failure && !warm && r.reps ? '+' : ''}
                    {rirN !== null && !warm && (
                      <span className="absolute bottom-0.5 right-1.5 text-[10px] font-bold leading-none" style={{ color: rirColor(rirN) }}>{rirN}</span>
                    )}
                  </button>
                </>
              )}
              <button role="checkbox" aria-checked={r.done} aria-label="Satz abhaken" onClick={() => onToggleDone(r)}
                className="h-9 flex items-center justify-center active:opacity-70">
                <Check state={r.done} />
              </button>
            </div>
          </SwipeRow>
        )
      })}
      <LinkButton onClick={onAdd} className="w-full px-2 py-2.5">
        <span className="text-lg leading-none">+</span> {de.logger.addSet}
      </LinkButton>
    </div>
  )
}
