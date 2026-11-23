import { useEffect, useRef, useState } from 'react'
import type { SetTarget, WeekTarget } from '../../types'
import { BottomSheet, Button, cx, inputCls } from '../../components/ui'
import { Icon } from '../../components/icons'
import { rirColor } from '../../components/rir'
import { SwipeRow } from './SwipeRow'
import { t } from '../../i18n'

export interface WeekScope { key: string; label: string }

/** Berechnete Werte der Woche (Vorbelegung und Vergleich: gleiche Werte werden nicht als eigenes Ziel gespeichert) */
export interface WeekValues { sets: number; repMin: number; repMax: number; rir: number; perSet?: SetTarget[] }

type Row = { id: number; repMin: string; repMax: string; rir: string }

/**
 * Ziele einer Übung für eine Woche bearbeiten: je Satz Wdh.-Bereich und RIR (Satz hinzufügen, nach links wischen =
 * entfernen), dazu „Auslassen“ und „Für alle Übungen des Tages“ unter „Weitere Optionen“.
 * `scopes`: wofür das Ziel gilt (z. B. nur diese Woche / jeden Block); das erste ist vorausgewählt.
 */
export function WeekTargetSheet({ open, title: titleIn, unit = t('Wdh'), computed: computedIn, current, scopes: scopesIn, dayWide, onSave, onClose }: {
  open: boolean; title: string; unit?: string
  computed: WeekValues
  /** Bestehende eigene Ziele je Scope-Schlüssel */
  current: (key: string) => WeekTarget | undefined
  scopes: WeekScope[]
  /** Schalter „Auf alle Übungen des Tages anwenden“ anbieten */
  dayWide?: boolean
  /** `day`: gilt für alle Übungen des Tages; `raw` = Ziele ungefiltert (undefined beim Zurücksetzen) */
  onSave: (key: string, target: WeekTarget | undefined, day?: { raw?: WeekTarget }) => void
  onClose: () => void
}) {
  // Beim Schließen (Animation) die letzten Werte weiter zeigen, auch wenn der Aufrufer schon zurückgesetzt hat
  const last = useRef({ title: titleIn, computed: computedIn, scopes: scopesIn })
  if (open) last.current = { title: titleIn, computed: computedIn, scopes: scopesIn }
  const { title, computed, scopes } = last.current
  const nextId = useRef(1)
  const [scope, setScope] = useState(scopes[0]?.key ?? '')
  const [rows, setRows] = useState<Row[]>([])
  const [skip, setSkip] = useState(false)
  const [wide, setWide] = useState(false)
  const base = (): SetTarget[] => computed.perSet?.length === computed.sets && computed.sets > 0
    ? computed.perSet
    : Array.from({ length: Math.max(1, computed.sets) }, () => ({ repMin: computed.repMin, repMax: computed.repMax, rir: computed.rir }))
  const toRow = (x: SetTarget): Row => ({ id: nextId.current++, repMin: String(x.repMin), repMax: String(x.repMax), rir: String(x.rir) })
  const load = (key: string) => {
    const c = current(key)
    let list: SetTarget[]
    if (c?.setTargets?.length) list = c.setTargets
    else {
      // Frühere Ziele ohne Satzangaben: Satzanzahl, Bereich und RIR gelten für alle Sätze
      const b = base()
      const n = c?.sets ?? b.length
      list = Array.from({ length: n }, (_, i) => {
        const x = b[Math.min(i, b.length - 1)]
        const repMin = c?.repMin ?? x.repMin
        return { repMin, repMax: Math.max(repMin, c?.repMax ?? x.repMax), rir: c?.rir ?? x.rir }
      })
    }
    setRows(list.map(toRow))
    setSkip(!!c?.skip)
  }
  useEffect(() => {
    if (!open) return
    const first = scopes.find((s) => current(s.key))?.key ?? scopes[0]?.key ?? ''
    setScope(first)
    load(first)
    setWide(false)
  }, [open])

  const upd = (id: number, k: 'repMin' | 'repMax' | 'rir', v: string) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v.replace(/\D/g, '') } : r)))
  const add = () => setRows((rs) => {
    const l = rs[rs.length - 1]
    return [...rs, l ? { ...l, id: nextId.current++ } : toRow(base()[0] ?? { repMin: 8, repMax: 12, rir: 2 })]
  })
  const parsed = (): SetTarget[] => rows.map((r) => {
    const b = base()[0]
    const repMin = Math.max(1, Math.round(Number(r.repMin)) || b.repMin)
    return { repMin, repMax: Math.max(repMin, Math.round(Number(r.repMax)) || b.repMax), rir: r.rir === '' ? b.rir : Math.max(0, Math.round(Number(r.rir))) }
  })
  const save = () => {
    const list = parsed()
    const b = base()
    const same = list.length === b.length && list.every((x, i) => x.repMin === b[i].repMin && x.repMax === b[i].repMax && x.rir === b[i].rir)
    onSave(scope, { setTargets: same ? undefined : list, skip: skip || undefined }, wide ? { raw: { setTargets: list, skip: skip || undefined } } : undefined)
    onClose()
  }
  const has = !!current(scope)

  const numCls = cx(inputCls, '!py-2.5 text-center')
  return (
    <BottomSheet open={open} onClose={onClose} help="programm-wochenziele" title={title}>
      <div className="space-y-4">
        {scopes.length > 1 && (
          <div role="radiogroup" aria-label={t('Gilt für')} className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1">
            {scopes.map((s) => (
              <button key={s.key} role="radio" aria-checked={scope === s.key} onClick={() => { setScope(s.key); load(s.key) }}
                className={cx('rounded-lg py-2 text-xs font-medium', scope === s.key ? 'bg-surface shadow text-fg' : 'text-muted')}>{s.label}</button>
            ))}
          </div>
        )}
        <div className={cx(skip && 'opacity-40 pointer-events-none')}>
          <div className="grid grid-cols-[2.25rem_1fr_1fr_3.25rem] gap-x-2 px-0 pb-2 text-xs text-muted items-end">
            <span>{t('Satz')}</span><span className="col-span-2 text-center">{unit}-{t('Ziel')}</span><span className="text-center">RIR</span>
          </div>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <SwipeRow key={r.id} onDelete={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : rs))}>
                <div className="grid grid-cols-[2.25rem_1fr_1fr_3.25rem] gap-x-2 items-center py-0.5">
                  <span className="w-9 h-9 rounded-full bg-surface2 flex items-center justify-center text-sm font-medium">{i + 1}</span>
                  <input type="text" inputMode="numeric" aria-label={t('Satz {0}', i + 1) + ' ' + unit + ' ' + t('von')} className={numCls} value={r.repMin} onChange={(e) => upd(r.id, 'repMin', e.target.value)} />
                  <input type="text" inputMode="numeric" aria-label={t('Satz {0}', i + 1) + ' ' + unit + ' ' + t('bis')} className={numCls} value={r.repMax} onChange={(e) => upd(r.id, 'repMax', e.target.value)} />
                  <input type="text" inputMode="numeric" aria-label={t('Satz {0}', i + 1) + ' RIR'} className={cx(numCls, 'font-bold')} style={{ color: rirColor(Number(r.rir) || 0) }} value={r.rir} onChange={(e) => upd(r.id, 'rir', e.target.value)} />
                </div>
              </SwipeRow>
            ))}
          </div>
          <button onClick={add} aria-label={t('Satz hinzufügen')} className="mt-3 w-9 h-9 rounded-full bg-surface2 flex items-center justify-center active:opacity-70"><Icon name="plus" size={18} /></button>
          {rows.length > 1 && <p className="text-xs text-muted mt-2">{t('Zum Entfernen einen Satz nach links wischen.')}</p>}
        </div>
        <details className="group" open={skip || wide}>
          <summary className="cursor-pointer list-none text-sm text-muted flex items-center gap-1 py-1">
            <span className="transition-transform group-open:rotate-90">›</span>{t('Weitere Optionen')}
          </summary>
          <div className="space-y-4 pt-3">
            <label className="flex items-center gap-3">
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{t('In dieser Woche auslassen')}</span>
                <span className="block text-xs text-muted">{t('Die Übung erscheint nicht im Training und zählt nicht zum Wochenfortschritt.')}</span>
              </span>
              <button role="switch" aria-checked={skip} aria-label={t('In dieser Woche auslassen')} onClick={() => setSkip((x) => !x)}
                className={cx('relative w-12 h-7 rounded-full shrink-0 transition-colors', skip ? 'bg-accent' : 'bg-line')}>
                <span className={cx('absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow transition-transform', skip ? 'translate-x-5 bg-accent-fg' : 'bg-surface')} />
              </button>
            </label>
            {dayWide && (
              <label className="flex items-center gap-3">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{t('Auf alle Übungen des Tages anwenden')}</span>
                  <span className="block text-xs text-muted">{t('Überträgt diese Satzziele. Zurücksetzen entfernt das Ziel bei allen Übungen des Tages.')}</span>
                </span>
                <button role="switch" aria-checked={wide} aria-label={t('Auf alle Übungen des Tages anwenden')} onClick={() => setWide((x) => !x)}
                  className={cx('relative w-12 h-7 rounded-full shrink-0 transition-colors', wide ? 'bg-accent' : 'bg-line')}>
                  <span className={cx('absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow transition-transform', wide ? 'translate-x-5 bg-accent-fg' : 'bg-surface')} />
                </button>
              </label>
            )}
          </div>
        </details>
        <div className="flex gap-2">
          {(has || wide) && <Button variant="ghost" className="flex-1" onClick={() => { onSave(scope, undefined, wide ? {} : undefined); onClose() }}>{t('Zurücksetzen')}</Button>}
          <Button className="flex-1" onClick={save}>{t('Speichern')}</Button>
        </div>
      </div>
    </BottomSheet>
  )
}
