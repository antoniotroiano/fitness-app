import type { PlannedView } from '../../engine/plannedDay'
import type { LoggedSet, Settings } from '../../types'
import { LinkButton, cx } from '../../components/ui'
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

const COLS = 'grid-cols-[2.25rem_1fr_3.5rem_3.5rem_2.5rem_2.75rem]'

/** Satztabelle: Satz | Zuletzt | kg | Wdh. | RIR | Haken */
export function SetTable({ view, rows, settings, activePad, onPatch, onToggleDone, onToggleAll, onAdd, onDelete, onType, onPad }: Props) {
  const cardio = !!view.ex.cardio
  const side = !cardio && isPerSide(view.ex)
  const doneN = rows.filter((r) => r.done).length
  const allDone = rows.length > 0 && doneN === rows.length
  let warmIdx = -1
  let workIdx = -1
  const cell = 'h-11 rounded-lg bg-surface2 text-center text-sm tabular-nums flex items-center justify-center'

  return (
    <div className="-mx-1">
      <div className={cx('grid gap-1.5 px-1 pb-2 items-center text-[11px] text-muted text-center border-b border-line', COLS)}>
        <span>{de.logger.set}</span><span>{de.logger.previous}</span>
        <span>{cardio ? 'min' : side ? de.logger.perSide(settings.weightUnit) : settings.weightUnit}</span>
        <span>{cardio ? settings.distanceUnit : side ? de.logger.repsPerSide : view.ex.metric === 'time' ? de.common.seconds : de.common.reps}</span>
        <span>{cardio ? '' : 'RIR'}</span>
        <button onClick={onToggleAll} disabled={rows.length === 0} role="checkbox" aria-checked={allDone ? true : doneN > 0 ? 'mixed' : false}
          aria-label="Alle Sätze abhaken"
          className={cx('h-11 rounded-lg border bg-transparent text-sm leading-none', allDone ? 'bg-accent text-accent-fg border-accent' : doneN > 0 ? 'border-accent text-accent' : 'border-line text-muted/40')}>
          {allDone ? '✓' : doneN > 0 ? '–' : '✓'}
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
            <div className={cx('grid gap-1.5 px-1 py-1.5 items-center border-b border-line/60', COLS, r.done && 'bg-accent/10')}>
              <button onClick={() => onType(r.id)} aria-label="Satztyp ändern"
                className={cx('h-11 rounded-lg text-sm font-semibold', warm ? 'text-warn' : 'text-fg')}>
                {warm ? 'W' : workIdx + 1}
              </button>
              <span className="text-xs text-muted text-center truncate">{previousText(prev, cardio, settings)}</span>
              {cardio ? (
                <>
                  <input inputMode="decimal" className={cx(cell, 'w-full outline-none')} value={r.minutes}
                    onChange={(e) => onPatch(r.id, { minutes: e.target.value.replace(',', '.') })} placeholder="min" />
                  <input inputMode="decimal" className={cx(cell, 'w-full outline-none')} value={r.km}
                    onChange={(e) => onPatch(r.id, { km: e.target.value.replace(',', '.') })} placeholder={settings.distanceUnit} />
                  <span />
                </>
              ) : (
                <>
                  <button onClick={() => onPad(r.id, 'weight')} className={cx(cell, padOn('weight') && 'ring-2 ring-accent')}>{r.weight || '–'}</button>
                  <button onClick={() => onPad(r.id, 'reps')} className={cx(cell, padOn('reps') && 'ring-2 ring-accent')}>{r.reps || '–'}</button>
                  {rirN !== null && !warm ? (
                    <button onClick={() => onPad(r.id, 'reps')} aria-label={`Ziel-RIR ${rirN}`}
                      className="h-8 rounded-full text-xs font-bold tabular-nums bg-surface2 border active:opacity-70"
                      style={{ color: rirColor(rirN), borderColor: rirColor(rirN) }}>{rirN}</button>
                  ) : <span />}
                </>
              )}
              <button aria-label="Satz abhaken" onClick={() => onToggleDone(r)}
                className={cx('h-11 rounded-lg border bg-transparent', r.done ? 'bg-accent text-accent-fg border-accent' : 'border-line text-muted/40')}>✓</button>
            </div>
          </SwipeRow>
        )
      })}
      <LinkButton onClick={onAdd} className="w-full px-2 py-3">
        <span className="text-lg leading-none">+</span> {de.logger.addSet}
      </LinkButton>
    </div>
  )
}
