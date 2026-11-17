import { useEffect, useState } from 'react'
import type { Exercise, WarmupOverrideMode, WarmupStep } from '../../types'
import { BottomSheet, Button, cx } from '../../components/ui'
import { Icon, type IconName } from '../../components/icons'
import { formatRest } from '../../engine/rest'

export const NOTE_MAX = 300

function Stepper({ value, onChange, min, max, step, suffix, label }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix: string; label: string
}) {
  const btn = 'w-8 h-8 rounded-lg bg-surface2 border border-line text-base disabled:opacity-40'
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
        <span>Set</span><span className="text-center">% Arbeitsgewicht</span><span className="text-center">Wdh.</span>
        <span className="text-right">{weights ? 'Gewicht' : ''}</span>
      </div>
      {steps.length === 0 && <p className="py-4 text-sm text-muted text-center">Keine Aufwärmsätze</p>}
      {steps.map((s, i) => (
        <div key={i} className="grid grid-cols-[2rem_1fr_1fr_3.5rem] gap-2 items-center py-1.5 border-b border-line/60">
          <span className="text-sm font-semibold text-amber-500">W{i + 1}</span>
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
  { value: 'default', label: 'Default', icon: 'sliders', desc: 'Warm-Up Automation folgt der App-Einstellung (More › Workouts › Aufwärmen).' },
  { value: 'smart', label: 'Smart Warm-Up', icon: 'sparkles', desc: 'Warm-ups werden automatisch passend zur Frische der Muskeln und zur Schwere des Gewichts hinzugefügt.' },
  { value: 'scheme', label: 'Scheme Warm-Up', icon: 'blocks', desc: 'Warm-ups folgen einem festen Schema aus Prozent und Wiederholungen (Standard der Kategorie oder eigener Override).' },
  { value: 'none', label: 'None', icon: 'ban', desc: 'Warm-ups werden nicht automatisch zu deinem Workout hinzugefügt.' },
]

export const automationLabel = (m: WarmupOverrideMode | undefined) =>
  AUTOMATION_OPTIONS.find((o) => o.value === (m ?? 'default'))?.label ?? 'Default'

/** Auswahl der Warm-Up Automation. `appLevel`: ohne "Default" (App-weite Einstellung). */
export function AutomationSheet({ open, onClose, value, onPick, appLevel }: {
  open: boolean; onClose: () => void; value: WarmupOverrideMode | undefined; onPick: (m: WarmupOverrideMode) => void; appLevel?: boolean
}) {
  const cur = value ?? 'default'
  const options = appLevel ? AUTOMATION_OPTIONS.filter((o) => o.value !== 'default') : AUTOMATION_OPTIONS
  return (
    <BottomSheet open={open} onClose={onClose} title="Warm-Up Automation">
      <ul className="space-y-2" role="radiogroup" aria-label="Warm-Up Automation">
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
  const btn = 'w-11 h-11 rounded-xl bg-surface2 border border-line text-xl'
  return (
    <BottomSheet open={open} onClose={onClose} title="Rest Timer">
      <p className="text-xs text-muted mb-4">Pause nach Arbeitssätzen dieser Übung. Default ihrer Gruppe: {formatRest(defaultSec)}.</p>
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

export const schemeSummary = (steps: WarmupStep[]) =>
  steps.length ? steps.map((s) => `${s.pct}% × ${s.reps}`).join(' · ') : 'Keine Aufwärmsätze'

/**
 * Listenzeile mit Icon, Titel, Sub Header und optional Hinweistext. Mit `action` ist nur der
 * Knopf (z. B. "Edit") bedienbar, sonst die ganze Zeile.
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
const SCOPE_LABEL: Record<NoteScope, string> = { session: 'Session', exercise: 'Exercise', program: 'Programm' }
export const scopeLabel = (s: NoteScope) => SCOPE_LABEL[s]

/** Notiz-Sheet mit Geltungsbereich (Session, Exercise, Programm) und 300-Zeichen-Zähler. */
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
