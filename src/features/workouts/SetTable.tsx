import { distanceUnitOf, isRepless, metricColumn } from '../../engine/metric'
import { useState } from 'react'
import type { PlannedView } from '../../engine/plannedDay'
import type { Exercise, LoggedSet, PlannedExercise, Settings } from '../../types'
import { LinkButton, cx } from '../../components/ui'
import { Icon } from '../../components/icons'
import { rirColor } from '../../components/rir'
import { kgToDisplay, kmToDisplay } from '../../utils/units'
import { isPerSide } from '../../engine/stats'
import { collapsedWarmups } from '../../engine/warmup'
import { SwipeRow } from './SwipeRow'
import { isSegment, type Row } from './state'
import { SET_BADGE } from './SetTypeSheet'
import { de } from '../../i18n/de'

export type PadField = 'weight' | 'reps'
/** Seite eines links/rechts getrennten Satzes (Felder der rechten Seite: `Row.right`) */
export type Side = 'l' | 'r'

/** Was die Tabelle von einer Übung braucht (der Logger gibt eine `PlannedView`, die Verlauf-Bearbeitung ein Minimum). */
export interface SetTableView {
  ex: Exercise
  pe: Pick<PlannedExercise, 'exerciseId'>
  previous: PlannedView['previous']
}

interface Props {
  view: SetTableView
  /** Bearbeiten einer geloggten Einheit: keine Haken (alle Sätze zählen) */
  plain?: boolean
  rows: Row[]
  settings: Settings
  activePad: { rowId: string; field: PadField; side?: Side; partial?: boolean } | null
  onPatch: (rowId: string, p: Partial<Row>) => void
  onToggleDone: (row: Row, side?: Side) => void
  onToggleAll: () => void
  onAdd: () => void
  onDelete: (rowId: string) => void
  onType: (rowId: string) => void
  onPad: (rowId: string, field: PadField, side?: Side) => void
}

function previousText(s: Pick<LoggedSet, 'weight' | 'reps' | 'partial' | 'minutes' | 'km'> | undefined, cardio: boolean, settings: Settings): string {
  if (!s) return '–'
  if (cardio) return `${s.minutes ?? 0} min${s.km ? ` · ${kmToDisplay(s.km, settings.distanceUnit)} ${settings.distanceUnit}` : ''}`
  return `${kgToDisplay(s.weight, settings.weightUnit)} ${settings.weightUnit} × ${s.reps}${s.partial ? ` +${s.partial}T` : ''}`
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
export function SetTable({ view, plain, rows, settings, activePad, onPatch, onToggleDone, onToggleAll, onAdd, onDelete, onType, onPad }: Props) {
  const cardio = !!view.ex.cardio
  const side = !cardio && isPerSide(view.ex)
  const doneN = rows.filter((r) => r.done).length
  const allDone = rows.length > 0 && doneN === rows.length
  // Abgehakte Aufwärmsätze einklappen (Einstellung), Sammelzeile klappt sie für diese Übung wieder auf
  const [openFor, setOpenFor] = useState<string | null>(null)
  const exId = view.pe.exerciseId
  const { hidden, summaryAt } = collapsedWarmups(rows, settings.hideDoneWarmups && openFor !== exId, activePad?.rowId)
  let warmIdx = -1
  let workIdx = -1
  const cell = 'h-9 rounded-md bg-surface2 text-center text-sm tabular-nums flex items-center justify-center'

  return (
    <div className="-mx-1">
      <div className={cx('grid gap-1.5 px-1 pb-1.5 items-center text-2xs text-muted text-center border-b border-line', COLS)}>
        <span>{de.logger.set}</span><span>{de.logger.previous}</span>
        <span>{cardio ? 'min' : side ? de.logger.perSide(settings.weightUnit) : settings.weightUnit}</span>
        <span>{cardio ? settings.distanceUnit : isRepless(view.ex.metric) || !side ? metricColumn(view.ex.metric, distanceUnitOf(view.ex)) : de.logger.repsPerSide}</span>
        {plain ? <span aria-hidden /> : <button onClick={onToggleAll} disabled={rows.length === 0} role="checkbox" aria-checked={allDone ? true : doneN > 0 ? 'mixed' : false}
          aria-label="Alle Sätze abhaken"
          className="h-8 flex items-center justify-center disabled:opacity-40">
          <Check state={allDone ? true : doneN > 0 ? 'mixed' : false} />
        </button>}
      </div>
      {rows.map((r, i) => {
        const warm = r.type === 'warmup'
        const seg = isSegment(r)
        if (warm) warmIdx++; else if (!seg) workIdx++
        if (hidden.has(i)) {
          if (i !== summaryAt) return null
          const n = hidden.size
          return (
            <button key={`warm-sum-${r.id}`} onClick={() => setOpenFor(exId)} aria-label={`${n} erledigte Aufwärmsätze anzeigen`}
              className={cx('grid gap-1.5 px-1 py-1.5 w-full items-center border-b border-line/60 bg-surface2/60 text-left active:opacity-70', COLS)}>
              <span className="justify-self-center w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center bg-warn/15 text-warn opacity-40">{SET_BADGE.warmup}</span>
              <span className="col-span-3 text-xs text-muted">{n} {n === 1 ? 'Aufwärmsatz' : 'Aufwärmsätze'} erledigt · anzeigen</span>
              <span className="flex items-center justify-center"><Check state={true} /></span>
            </button>
          )
        }
        const prev = warm ? view.previous.warmups[warmIdx] : seg ? undefined : view.previous.work[workIdx]
        const badge = warm ? SET_BADGE.warmup : seg ? SET_BADGE[r.type as 'drop' | 'myo'] : r.failure ? SET_BADGE.failure : workIdx + 1
        /** Eine Zeile: ganzer Satz oder eine Seite (`side`) eines links/rechts getrennten Satzes */
        const line = (side?: Side) => {
          const v = side === 'r' && r.right ? r.right : r
          const done = side === 'l' ? !!r.leftDone : side === 'r' ? !!r.right?.done : r.done
          const partial = Number(v.partial) || 0
          const rirN = v.rir === '' ? null : Number(v.rir)
          const padOn = (f: PadField) => activePad?.rowId === r.id && activePad.field === f && (activePad.side === 'r') === (side === 'r')
          const splitOn = partial > 0 || (padOn('reps') && !!activePad?.partial)
          const prevSide = side && prev?.sides ? prev.sides[side] : prev
          const sideLabel = side === 'l' ? 'Links' : side === 'r' ? 'Rechts' : ''
          return (
            <div data-row-id={side === 'r' ? `${r.id}-r` : r.id} className={cx('grid gap-1.5 px-1 py-1 items-center transition-colors', COLS,
              side === 'l' ? 'border-b border-line/30' : 'border-b border-line/60', done && 'bg-surface2/60')}>
              {side === 'r' ? <span aria-hidden /> : (
                <button onClick={() => onType(r.id)} aria-label={seg ? `${r.type === 'drop' ? 'Drop' : 'Myo'}-Segment, Optionen` : 'Satztyp ändern'}
                  className={cx('justify-self-center rounded-full text-xs font-semibold flex items-center justify-center active:opacity-70',
                    seg ? 'w-6 h-6 ml-2 bg-accent/15 text-accent' : 'w-7 h-7',
                    warm ? 'bg-warn/15 text-warn' : seg ? '' : r.failure ? 'bg-danger/15 text-danger' : 'bg-surface2 text-fg', r.done && 'opacity-40')}>
                  {badge}
                </button>
              )}
              <span className={cx('text-xs text-muted text-center truncate', done && 'opacity-50')}>
                {side && <span className="font-semibold text-fg mr-1">{side === 'l' ? 'L' : 'R'}</span>}
                {seg ? (r.type === 'drop' ? '↳ Drop' : '↳ Myo') : previousText(prevSide, cardio, settings)}
              </span>
              {cardio ? (
                <>
                  <input inputMode="decimal" className={cx(cell, 'w-full outline-none', r.done && 'opacity-40')} value={r.minutes}
                    onChange={(e) => onPatch(r.id, { minutes: e.target.value.replace(',', '.') })} placeholder="min" />
                  <input inputMode="decimal" className={cx(cell, 'w-full outline-none', r.done && 'opacity-40')} value={r.km}
                    onChange={(e) => onPatch(r.id, { km: e.target.value.replace(',', '.') })} placeholder={settings.distanceUnit} />
                </>
              ) : (
                <>
                  <button onClick={() => onPad(r.id, 'weight', side === 'r' ? 'r' : undefined)} aria-label={sideLabel ? `Gewicht ${sideLabel}` : undefined}
                    className={cx(cell, done && 'opacity-40', padOn('weight') && 'ring-2 ring-accent !opacity-100')}>{v.weight || '–'}</button>
                  <button onClick={() => onPad(r.id, 'reps', side === 'r' ? 'r' : undefined)}
                    aria-label={rirN !== null && !warm ? `${sideLabel ? `${sideLabel}: ` : ''}${v.reps || '–'}${r.failure ? ' oder mehr, bis zum Versagen' : ''}, Ziel-RIR ${rirN}` : sideLabel ? `Wiederholungen ${sideLabel}` : undefined}
                    className={cx(cell, 'relative', done && 'opacity-40', padOn('reps') && 'ring-2 ring-accent !opacity-100')}>
                    {splitOn ? (
                      <span className="flex w-full items-stretch" aria-label={`${v.reps || '–'} volle, ${partial || '–'} Teilwiederholungen`}>
                        <span className={cx('flex-1 flex items-center justify-center rounded-l-lg', padOn('reps') && !activePad?.partial && 'bg-surface')}>{v.reps || '–'}{r.failure && !warm && v.reps ? '+' : ''}</span>
                        <span className="w-px my-1.5 bg-muted/70" aria-hidden />
                        <span className={cx('flex-1 flex items-center justify-center rounded-r-lg', padOn('reps') && activePad?.partial && 'bg-surface')}>{partial || '–'}</span>
                      </span>
                    ) : <>{v.reps || '–'}{r.failure && !warm && v.reps ? '+' : ''}</>}
                    {rirN !== null && !warm && (
                      <span className="absolute bottom-0.5 right-1.5 text-[10px] font-bold leading-none" style={{ color: rirColor(rirN) }}>{rirN}</span>
                    )}
                  </button>
                </>
              )}
              {plain ? <span aria-hidden /> : (
                <button role="checkbox" aria-checked={done} aria-label={sideLabel ? `Seite ${sideLabel} abhaken` : 'Satz abhaken'}
                  onClick={() => { if (warm && !r.done) setOpenFor(null); onToggleDone(r, side) }}
                  className="h-9 flex items-center justify-center active:opacity-70">
                  <Check state={done} />
                </button>
              )}
            </div>
          )
        }
        return (
          <SwipeRow key={r.id} onDelete={() => onDelete(r.id)}>
            {r.right ? <div>{line('l')}{line('r')}</div> : line()}
          </SwipeRow>
        )
      })}
      <LinkButton onClick={onAdd} className="w-full px-2 py-2.5">
        <span className="text-lg leading-none">+</span> {de.logger.addSet}
      </LinkButton>
    </div>
  )
}
