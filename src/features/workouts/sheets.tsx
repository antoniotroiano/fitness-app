import { useEffect, useState } from 'react'
import type { Equipment, Exercise, Settings, WarmupOverrideMode, WarmupStep, WeightScale } from '../../types'
import { BottomSheet, Button, cx } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import { formatRest } from '../../engine/rest'
import { incrementKg } from '../../engine/progression'
import { isValidScale, normalizeWeights } from '../../engine/weightScale'
import { displayToKg, kgToDisplay } from '../../utils/units'
import { de } from '../../i18n/de'

export const NOTE_MAX = 300

function Stepper({ value, onChange, min, max, step, suffix, label }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix: string; label: string
}) {
  const btn = 'w-8 h-8 rounded-lg bg-surface2 text-base disabled:opacity-40'
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button className={btn} aria-label={`${label} weniger`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span className="w-12 text-center text-sm tabular-nums">{value}{suffix}</span>
      <button className={btn} aria-label={`${label} mehr`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  )
}

/** Bearbeitbare Schema-Tabelle: Prozent vom Arbeitsgewicht und Wiederholungen je Aufwärmsatz. */
export function SchemeTable({ steps, onChange, editable, weights }: {
  steps: WarmupStep[]; onChange?: (s: WarmupStep[]) => void; editable: boolean
  /** Optional: berechnete Gewichte (Anzeige) je Satz */
  weights?: (string | null)[]
}) {
  const set = (i: number, p: Partial<WarmupStep>) => onChange?.(steps.map((s, j) => (j === i ? { ...s, ...p } : s)))
  return (
    <div className={cx(!editable && 'opacity-60')}>
      <div className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 text-xs text-muted pb-2 border-b border-line">
        <span>{de.logger.set}</span><span className="text-center">% Arbeitsgewicht</span><span className="text-center">Wdh.</span>
        <span className="text-right">{weights ? 'Gewicht' : ''}</span>
      </div>
      {steps.length === 0 && <p className="py-4 text-sm text-muted text-center">Keine Aufwärmsätze</p>}
      {steps.map((s, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 items-center py-1.5 border-b border-line/60">
          <span className="text-sm font-semibold text-warn">W{i + 1}</span>
          {editable ? (
            <>
              <Stepper label="Prozent" value={s.pct} min={10} max={95} step={5} suffix="%" onChange={(v) => set(i, { pct: v })} />
              <Stepper label="Wiederholungen" value={s.reps} min={1} max={20} step={1} suffix="" onChange={(v) => set(i, { reps: v })} />
            </>
          ) : (
            <>
              <span className="text-sm text-center tabular-nums">{s.pct ? `${s.pct}%` : '–'}</span>
              <span className="text-sm text-center tabular-nums">{s.reps}</span>
            </>
          )}
          <span className="text-sm text-right tabular-nums text-muted">{weights?.[i] ?? ''}</span>
        </div>
      ))}
      {editable && (
        <div className="flex gap-2 pt-3">
          <Button variant="ghost" className="flex-1 !py-2" disabled={steps.length >= 6}
            onClick={() => onChange?.([...steps, { pct: Math.min(95, (steps.at(-1)?.pct ?? 40) + 10), reps: Math.max(1, (steps.at(-1)?.reps ?? 8) - 2) }])}>+ Satz</Button>
          <Button variant="ghost" className="flex-1 !py-2" disabled={steps.length === 0} onClick={() => onChange?.(steps.slice(0, -1))}>− Satz</Button>
        </div>
      )}
    </div>
  )
}

/** Sheet zum Bearbeiten eines Schemas (Einstellungen und Übungs-Override). */
export function SchemeEditor({ open, onClose, title, steps, onSave, onReset, resetLabel = 'Standard wiederherstellen' }: {
  open: boolean; onClose: () => void; title: string; steps: WarmupStep[]
  onSave: (s: WarmupStep[]) => void; onReset?: () => void; resetLabel?: string
}) {
  const [draft, setDraft] = useState(steps)
  useEffect(() => { if (open) setDraft(steps) }, [open, steps])
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <SchemeTable steps={draft} editable onChange={setDraft} />
      <div className="space-y-2 pt-4">
        <Button className="w-full" onClick={() => { onSave(draft); onClose() }}>Speichern</Button>
        {onReset && <Button variant="ghost" className="w-full" onClick={() => { onReset(); onClose() }}>{resetLabel}</Button>}
      </div>
    </BottomSheet>
  )
}

export const AUTOMATION_OPTIONS: { value: WarmupOverrideMode; label: string; icon: IconName; desc: string }[] = [
  { value: 'default', label: de.warmup.optDefault, icon: 'sliders', desc: de.warmup.descDefault },
  { value: 'smart', label: de.warmup.optSmart, icon: 'sparkles', desc: de.warmup.descSmart },
  { value: 'scheme', label: de.warmup.optScheme, icon: 'blocks', desc: de.warmup.descScheme },
  { value: 'none', label: de.warmup.optNone, icon: 'ban', desc: de.warmup.descNone },
]

export const automationLabel = (m: WarmupOverrideMode | undefined) =>
  AUTOMATION_OPTIONS.find((o) => o.value === (m ?? 'default'))?.label ?? de.warmup.optDefault

/** Auswahl der Aufwärm-Automatik. `appLevel`: ohne "Default" (App-weite Einstellung). */
export function AutomationSheet({ open, onClose, value, onPick, appLevel }: {
  open: boolean; onClose: () => void; value: WarmupOverrideMode | undefined; onPick: (m: WarmupOverrideMode) => void; appLevel?: boolean
}) {
  const cur = value ?? 'default'
  const options = appLevel ? AUTOMATION_OPTIONS.filter((o) => o.value !== 'default') : AUTOMATION_OPTIONS
  return (
    <BottomSheet open={open} onClose={onClose} title={de.warmup.automation}>
      <ul className="space-y-2" role="radiogroup" aria-label={de.warmup.automation}>
        {options.map((o) => (
          <li key={o.value}>
            <button role="radio" aria-checked={cur === o.value} onClick={() => { onPick(o.value); onClose() }}
              className={cx('w-full text-left rounded-xl border px-4 py-3 active:opacity-70', cur === o.value ? 'border-accent bg-accent/10' : 'border-line bg-surface2')}>
              <span className="flex items-center gap-3 text-sm font-semibold">
                <Icon name={o.icon} size={20} /><span className="flex-1">{o.label}</span>{cur === o.value && <Icon name="check" size={18} />}
              </span>
              <span className="block text-xs text-muted mt-1 pl-8">{o.desc}</span>
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  )
}

/** Pause je Übung überschreiben (15-s-Schritte). */
export function RestOverrideSheet({ open, onClose, defaultSec, override, onSave }: {
  open: boolean; onClose: () => void; defaultSec: number; override: number | undefined; onSave: (sec: number | undefined) => void
}) {
  const [v, setV] = useState(override ?? defaultSec)
  useEffect(() => { if (open) setV(override ?? defaultSec) }, [open, override, defaultSec])
  const btn = 'w-11 h-11 rounded-xl bg-surface2 text-xl'
  return (
    <BottomSheet open={open} onClose={onClose} title={de.warmup.restTimer}>
      <p className="text-xs text-muted mb-4">Pause nach Arbeitssätzen dieser Übung. Standard ihrer Gruppe: {formatRest(defaultSec)}.</p>
      <div className="flex items-center justify-center gap-5 mb-5">
        <button className={btn} aria-label="Kürzer" onClick={() => setV(Math.max(15, v - 15))}>−</button>
        <span className="w-24 text-center text-2xl font-bold tabular-nums">{formatRest(v)}</span>
        <button className={btn} aria-label="Länger" onClick={() => setV(Math.min(600, v + 15))}>+</button>
      </div>
      <div className="space-y-2">
        <Button className="w-full" onClick={() => { onSave(v === defaultSec ? undefined : v); onClose() }}>Speichern</Button>
        {override !== undefined && <Button variant="ghost" className="w-full" onClick={() => { onSave(undefined); onClose() }}>Zurück zum Default</Button>}
      </div>
    </BottomSheet>
  )
}

/** Kurzhantel/Kettlebell: Einzelgewichte (Liste), sonst Bereich mit Schrittweite */
export const usesWeightList = (eq: Equipment) => eq === 'dumbbell' || eq === 'kettlebell'

const r3 = (n: number) => Math.round(n * 1000) / 1000

/** Kurzfassung der Gerätegewichte für die Listenzeile */
export function scaleSummary(s: WeightScale | undefined, unit: Settings['weightUnit']): string {
  if (!s) return de.common.default
  const d = (kg: number) => kgToDisplay(kg, unit)
  if (s.kind === 'range') return `${d(s.min)}–${d(s.max)} ${unit} · ${d(s.step)} ${unit}`
  const l = normalizeWeights(s.weights).map(d)
  return l.length > 4 ? `${l.slice(0, 3).join(', ')} … ${l[l.length - 1]} ${unit}` : `${l.join(', ')} ${unit}`
}

function NumField({ label, value, onChange, step, suffix }: { label: string; value: string; onChange: (v: string) => void; step: number; suffix: string }) {
  const btn = 'w-9 h-9 rounded-lg bg-surface2 text-base'
  const bump = (d: number) => onChange(String(Math.max(0, r3((Number(value.replace(',', '.')) || 0) + d))))
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-sm">{label}</span>
      <button className={btn} aria-label={`${label} weniger`} onClick={() => bump(-step)}>−</button>
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" aria-label={label}
        className="w-16 h-9 rounded-lg bg-surface2 border border-line text-center text-sm tabular-nums" />
      <button className={btn} aria-label={`${label} mehr`} onClick={() => bump(step)}>+</button>
      <span className="w-6 text-xs text-muted">{suffix}</span>
    </div>
  )
}

const toNum = (v: string) => Number(v.replace(',', '.'))

/** Gerätegewichte als Bereich (Kabel, Maschine, Smith, Langhantel): Anfang, Ende, Schrittweite. */
export function WeightScaleSheet({ open, onClose, scale, unit, onSave }: {
  open: boolean; onClose: () => void; scale: WeightScale | undefined; unit: Settings['weightUnit']
  onSave: (s: WeightScale | undefined) => void
}) {
  const init = (): [string, string, string] => {
    if (scale?.kind === 'range') return [scale.min, scale.max, scale.step].map((v) => String(kgToDisplay(v, unit))) as [string, string, string]
    return [0, 250, 5].map((v) => String(kgToDisplay(v, unit))) as [string, string, string]
  }
  const [min, setMin] = useState('0'); const [max, setMax] = useState('250'); const [step, setStep] = useState('5')
  useEffect(() => { if (open) { const [a, b, c] = init(); setMin(a); setMax(b); setStep(c) } }, [open, scale, unit]) // eslint-disable-line react-hooks/exhaustive-deps
  const draft: WeightScale = { kind: 'range', min: r3(displayToKg(toNum(min) || 0, unit)), max: r3(displayToKg(toNum(max) || 0, unit)), step: r3(displayToKg(toNum(step) || 0, unit)) }
  const valid = isValidScale(draft)
  const inc = unit === 'lb' ? 5 : 2.5
  return (
    <BottomSheet open={open} onClose={onClose} title={de.exercise.weightScale}>
      <p className="text-xs text-muted mb-4">{de.exercise.scaleRangeIntro}</p>
      <div className="space-y-3 mb-3">
        <NumField label={de.exercise.rangeStart} value={min} onChange={setMin} step={inc} suffix={unit} />
        <NumField label={de.exercise.rangeEnd} value={max} onChange={setMax} step={inc} suffix={unit} />
        <NumField label={de.exercise.rangeStep} value={step} onChange={setStep} step={unit === 'lb' ? 1.25 : 0.5} suffix={unit} />
      </div>
      {!valid && <p className="text-xs text-danger mb-3" role="alert">{de.exercise.scaleInvalid}</p>}
      <div className="space-y-2">
        <Button className="w-full" disabled={!valid} onClick={() => { onSave(draft); onClose() }}>Speichern</Button>
        {scale && <Button variant="ghost" className="w-full" onClick={() => { onSave(undefined); onClose() }}>{de.exercise.resetDefault}</Button>}
      </div>
    </BottomSheet>
  )
}

/** Standard-Kandidaten der Liste: bisherige Schritte des Equipments (bis 40 kg) plus 5-kg-Schritte bis 50 kg */
const listDefaultKg = (equipment: Equipment): number[] => {
  const inc = incrementKg(equipment) || 2
  const own = Array.from({ length: Math.floor(40 / inc) }, (_, i) => (i + 1) * inc)
  const fives = Array.from({ length: 10 }, (_, i) => (i + 1) * 5)
  return [...new Set([...own, ...fives])].sort((a, b) => a - b)
}

/**
 * Gerätegewichte als Liste (Kurzhanteln, Kettlebells): Gewichte per Checkbox an-/abwählen.
 * „+“ oben rechts öffnet ein eigenes Sheet, um ein weiteres Gewicht anzulegen.
 */
export function WeightListSheet({ open, onClose, equipment, scale, unit, onSave }: {
  open: boolean; onClose: () => void; equipment: Equipment; scale: WeightScale | undefined; unit: Settings['weightUnit']
  onSave: (s: WeightScale | undefined) => void
}) {
  const [all, setAll] = useState<number[]>([])
  const [checked, setChecked] = useState<number[]>([])
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  useEffect(() => {
    if (!open) return
    const d = (kg: number) => kgToDisplay(kg, unit)
    const own = scale?.kind === 'list' ? normalizeWeights(scale.weights).map(d) : []
    const base = listDefaultKg(equipment).map(d)
    setAll([...new Set([...base, ...own])].sort((a, b) => a - b))
    setChecked(scale?.kind === 'list' ? own : base)
    setAdding(false); setText('')
  }, [open, scale, unit, equipment])
  const v = toNum(text)
  const canAdd = text.trim() !== '' && Number.isFinite(v) && v > 0
  const add = () => {
    if (!canAdd) return
    const w = r3(v)
    setAll((l) => (l.includes(w) ? l : [...l, w].sort((a, b) => a - b)))
    setChecked((l) => (l.includes(w) ? l : [...l, w]))
    setAdding(false); setText('')
  }
  const toggle = (w: number) => setChecked((l) => (l.includes(w) ? l.filter((x) => x !== w) : [...l, w]))
  const header = (
    <div className="flex items-center gap-3 min-h-8">
      <h2 className="font-bold text-lg flex-1 min-w-0 truncate">{de.exercise.weightScale}</h2>
      <button type="button" onClick={() => setAdding(true)} aria-label={de.exercise.addWeight}
        className="w-8 h-8 shrink-0 rounded-full bg-surface2 flex items-center justify-center text-lg leading-none">+</button>
      <button type="button" onClick={onClose} aria-label="Schließen"
        className="w-8 h-8 shrink-0 rounded-full bg-surface2 text-muted flex items-center justify-center text-sm">✕</button>
    </div>
  )
  return (
    <>
      <BottomSheet open={open} onClose={onClose} tall header={header} title={de.exercise.weightScale}>
        <p className="text-xs text-muted mb-3">{de.exercise.scaleListIntro}</p>
        <ul className="divide-y divide-line mb-4">
          {all.map((w) => (
            <li key={w}>
              <label className="flex items-center gap-3 py-3 cursor-pointer">
                <input type="checkbox" checked={checked.includes(w)} onChange={() => toggle(w)} className="w-5 h-5 accent-[var(--accent)]" />
                <span className="flex-1 text-sm tabular-nums">{w} {unit}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <Button className="w-full" disabled={checked.length === 0}
            onClick={() => { onSave({ kind: 'list', weights: normalizeWeights(checked.map((w) => displayToKg(w, unit))) }); onClose() }}>Speichern</Button>
          {scale && <Button variant="ghost" className="w-full" onClick={() => { onSave(undefined); onClose() }}>{de.exercise.resetDefault}</Button>}
        </div>
      </BottomSheet>
      <BottomSheet open={open && adding} onClose={() => setAdding(false)} title={de.exercise.addWeight}>
        <div className="relative mb-4">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} inputMode="decimal"
            placeholder="Gewicht" aria-label="Gewicht" autoFocus className="w-full h-12 rounded-xl bg-surface2 border border-line pl-4 pr-12 text-base" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted pointer-events-none">{unit.toUpperCase()}</span>
        </div>
        <Button className="w-full" disabled={!canAdd} onClick={add}>Speichern</Button>
      </BottomSheet>
    </>
  )
}

export const schemeSummary = (steps: WarmupStep[]) =>
  steps.length ? steps.map((s) => `${s.pct}% × ${s.reps}`).join(' · ') : 'Keine Aufwärmsätze'

/**
 * Listenzeile mit Icon, Titel, Sub Header und optional Hinweistext. Mit `action` ist nur der
 * Knopf (z. B. "Ändern") bedienbar, sonst die ganze Zeile.
 */
export function ListRow({ icon, label, value, hint, onClick, action }: {
  icon?: IconName; label: string; value?: string; hint?: string; onClick?: () => void; action?: string
}) {
  const body = (
    <>
      {icon && <Icon name={icon} />}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {value && <span className="block text-xs text-muted truncate">{value}</span>}
      </span>
    </>
  )
  return (
    <div>
      {action ? (
        <div className="flex items-center gap-3 py-3.5">
          {body}
          <button onClick={onClick} className="rounded-full bg-surface2 px-3.5 py-1.5 text-xs font-semibold active:opacity-70">{action}</button>
        </div>
      ) : (
        <button onClick={onClick} className="w-full flex items-center gap-3 py-3.5 text-left">{body}<Icon name="chevron" size={18} /></button>
      )}
      {hint && <p className="text-xs text-muted -mt-1.5 pb-3">{hint}</p>}
    </div>
  )
}

export type NoteScope = 'session' | 'exercise' | 'program'
const SCOPE_LABEL: Record<NoteScope, string> = { session: de.notes.session, exercise: de.notes.exercise, program: de.notes.program }
export const scopeLabel = (s: NoteScope) => SCOPE_LABEL[s]

/** Notiz-Sheet mit Geltungsbereich (Einheit, Übung, Programm) und 300-Zeichen-Zähler. */
export function NoteSheet({ open, onClose, ex, scopes, initialScope, values, onSave }: {
  open: boolean; onClose: () => void; ex: Exercise | null
  scopes: NoteScope[]; initialScope: NoteScope; values: Partial<Record<NoteScope, string>>
  onSave: (scope: NoteScope, text: string) => void
}) {
  const [scope, setScope] = useState<NoteScope>(initialScope)
  const [text, setText] = useState('')
  useEffect(() => { if (open) { setScope(initialScope); setText(values[initialScope] ?? '') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (s: NoteScope) => { setScope(s); setText(values[s] ?? '') }
  if (!ex) return null
  return (
    <BottomSheet open={open} onClose={onClose} title={`Notiz · ${ex.name}`}>
      {scopes.length > 1 && (
        <div role="tablist" className="flex gap-1 p-1 rounded-xl bg-surface2 mb-3">
          {scopes.map((s) => (
            <button key={s} role="tab" aria-selected={scope === s} onClick={() => pick(s)}
              className={cx('flex-1 py-2 rounded-lg text-sm', scope === s ? 'bg-surface font-semibold shadow-sm' : 'text-muted')}>{SCOPE_LABEL[s]}</button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted mb-2">
        {scope === 'session' ? 'Gilt nur für dieses Workout und wird mit der Einheit gespeichert.'
          : scope === 'exercise' ? 'Gilt für diese Übung in jedem Workout und Programm.' : 'Gilt für diese Übung nur in diesem Programm.'}
      </p>
      <textarea value={text} maxLength={NOTE_MAX} rows={5} onChange={(e) => setText(e.target.value.slice(0, NOTE_MAX))}
        aria-label="Notiz" placeholder="Notiz eingeben…"
        className="w-full rounded-xl bg-surface2 border border-line px-3 py-2.5 text-sm outline-none focus:border-accent resize-none" />
      <div className="text-right text-xs text-muted tabular-nums mt-1 mb-3">{text.length}/{NOTE_MAX}</div>
      <div className="flex gap-2">
        {(values[scope] ?? '') !== '' && (
          <Button variant="danger" onClick={() => { onSave(scope, ''); onClose() }}>Löschen</Button>
        )}
        <Button className="flex-1" onClick={() => { onSave(scope, text.trim()); onClose() }}>Speichern</Button>
      </div>
    </BottomSheet>
  )
}
