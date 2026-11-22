import { useEffect, useRef, useState } from 'react'
import type { WeekTarget } from '../../types'
import { BottomSheet, Button, cx, inputCls } from '../../components/ui'
import { t } from '../../i18n'

export interface WeekScope { key: string; label: string }

/** Berechnete Werte der Woche (Platzhalter und Vergleich: gleiche Werte werden nicht als eigenes Ziel gespeichert) */
export interface WeekValues { sets: number; repMin: number; repMax: number; rir: number }

/**
 * Ziele einer Übung für eine Woche bearbeiten: Sätze, Wdh.-Bereich, RIR, auslassen. Leere Felder = berechneter Wert.
 * `scopes`: wofür das Ziel gilt (z. B. nur diese Woche / jeden Block); das erste ist vorausgewählt.
 */
export function WeekTargetSheet({ open, title: titleIn, unit = t('Wdh'), computed: computedIn, current, scopes: scopesIn, dayWide, onSave, onClose }: {
  open: boolean; title: string; unit?: string
  computed: WeekValues
  /** Bestehende eigene Ziele je Scope-Schlüssel */
  current: (key: string) => WeekTarget | undefined
  scopes: WeekScope[]
  /** Schalter „Auf alle Übungen des Tages anwenden“ anbieten (Beschriftung der Anzahl) */
  dayWide?: boolean
  /** `day`: gilt für alle Übungen des Tages; `raw` = alle eingetragenen Felder ungefiltert (undefined beim Zurücksetzen) */
  onSave: (key: string, target: WeekTarget | undefined, day?: { raw?: WeekTarget }) => void
  onClose: () => void
}) {
  // Beim Schließen (Animation) die letzten Werte weiter zeigen, auch wenn der Aufrufer schon zurückgesetzt hat
  const last = useRef({ title: titleIn, computed: computedIn, scopes: scopesIn })
  if (open) last.current = { title: titleIn, computed: computedIn, scopes: scopesIn }
  const { title, computed, scopes } = last.current
  const [scope, setScope] = useState(scopes[0]?.key ?? '')
  const [f, setF] = useState({ sets: '', repMin: '', repMax: '', rir: '', skip: false })
  const [wide, setWide] = useState(false)
  const load = (key: string) => {
    const t = current(key)
    const str = (n: number | undefined) => (n == null ? '' : String(n))
    setF({ sets: str(t?.sets), repMin: str(t?.repMin), repMax: str(t?.repMax), rir: str(t?.rir), skip: !!t?.skip })
  }
  useEffect(() => {
    if (!open) return
    const first = scopes.find((s) => current(s.key))?.key ?? scopes[0]?.key ?? ''
    setScope(first)
    load(first)
    setWide(false)
  }, [open])

  const num = (v: string, min: number, base: number) => {
    const n = Math.round(Number(v))
    return v.trim() === '' || !Number.isFinite(n) || n < min || n === base ? undefined : n
  }
  const save = () => {
    const repMin = num(f.repMin, 1, computed.repMin)
    const repMax = num(f.repMax, 1, computed.repMax)
    const target = {
      sets: num(f.sets, 1, computed.sets), repMin, repMax: repMax != null && repMin != null && repMax < repMin ? repMin : repMax,
      rir: num(f.rir, 0, computed.rir), skip: f.skip || undefined,
    }
    const raw = wide ? {
      sets: num(f.sets, 1, -1), repMin: num(f.repMin, 1, -1), repMax: num(f.repMax, 1, -1), rir: num(f.rir, 0, -1), skip: f.skip || undefined,
    } : undefined
    onSave(scope, target, raw ? { raw } : undefined)
    onClose()
  }
  const has = !!current(scope)
  const field = (k: 'sets' | 'repMin' | 'repMax' | 'rir', label: string, base: number) => (
    <label className="flex-1 min-w-0 text-xs text-muted space-y-1">
      <span className="block">{label}</span>
      <input type="number" inputMode="numeric" className={cx(inputCls, '!py-2 text-center')} placeholder={String(base)} value={f[k]}
        disabled={f.skip} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} />
    </label>
  )

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
        <div className="flex gap-2">
          {field('sets', t('Sätze'), computed.sets)}
          {field('repMin', `${unit} von`, computed.repMin)}
          {field('repMax', 'bis', computed.repMax)}
          {field('rir', 'RIR', computed.rir)}
        </div>
        <p className="text-xs text-muted">{t('Leere Felder übernehmen den Wert aus dem Wochenplan.')}</p>
        <label className="flex items-center gap-3">
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium">{t('In dieser Woche auslassen')}</span>
            <span className="block text-xs text-muted">{t('Die Übung erscheint nicht im Training und zählt nicht zum Wochenfortschritt.')}</span>
          </span>
          <button role="switch" aria-checked={f.skip} aria-label={t('In dieser Woche auslassen')} onClick={() => setF((x) => ({ ...x, skip: !x.skip }))}
            className={cx('relative w-12 h-7 rounded-full shrink-0 transition-colors', f.skip ? 'bg-accent' : 'bg-line')}>
            <span className={cx('absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow transition-transform', f.skip ? 'translate-x-5 bg-accent-fg' : 'bg-surface')} />
          </button>
        </label>
        {dayWide && (
          <label className="flex items-center gap-3">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">{t('Auf alle Übungen des Tages anwenden')}</span>
              <span className="block text-xs text-muted">{t('Nur die ausgefüllten Felder. Zurücksetzen entfernt das Ziel bei allen Übungen des Tages.')}</span>
            </span>
            <button role="switch" aria-checked={wide} aria-label={t('Auf alle Übungen des Tages anwenden')} onClick={() => setWide((x) => !x)}
              className={cx('relative w-12 h-7 rounded-full shrink-0 transition-colors', wide ? 'bg-accent' : 'bg-line')}>
              <span className={cx('absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow transition-transform', wide ? 'translate-x-5 bg-accent-fg' : 'bg-surface')} />
            </button>
          </label>
        )}
        <div className="flex gap-2">
          {(has || wide) && <Button variant="ghost" className="flex-1" onClick={() => { onSave(scope, undefined, wide ? {} : undefined); onClose() }}>{t('Zurücksetzen')}</Button>}
          <Button className="flex-1" onClick={save}>{t('Speichern')}</Button>
        </div>
      </div>
    </BottomSheet>
  )
}
