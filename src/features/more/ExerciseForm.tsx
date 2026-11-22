import { useEffect, useRef, useState } from 'react'
import type { Exercise, MuscleId } from '../../types'
import { BottomSheet, Button, Chip, Segmented, cx, inputCls } from '../../components/ui'
import { MUSCLES } from '../../data/muscles'
import { EQUIPMENT_LABEL } from '../../data/exercises'
import {
  CUSTOM_EQUIPMENT, CUSTOM_PATTERNS, DESCRIPTION_MAX, EMPTY_DRAFT, NAME_MAX, PATTERN_LABEL, buildExercise, newCustomId, validateDraft, type ExerciseDraft,
} from '../../engine/customExercise'
import { isRepless } from '../../engine/metric'
import { saveCustomExercise, useAllExercises } from '../../db/db'
import { shrinkImage } from '../../utils/image'

/** Muskel durchschalten: nicht beteiligt → Haupt- → Nebenmuskel → nicht beteiligt. */
function cycleMuscle(d: ExerciseDraft, m: MuscleId): ExerciseDraft {
  if (d.primary.includes(m)) return { ...d, primary: d.primary.filter((x) => x !== m), secondary: [...d.secondary, m] }
  if (d.secondary.includes(m)) return { ...d, secondary: d.secondary.filter((x) => x !== m) }
  return { ...d, primary: [...d.primary, m] }
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted">{label}</div>
      {children}
      {hint && <p className="text-2xs text-muted">{hint}</p>}
    </div>
  )
}

function Toggle({ label, desc, on, onChange }: { label: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="w-full flex items-center gap-3 text-left py-1">
      <span className="flex-1 min-w-0">
        <span className="block text-sm">{label}</span>
        {desc && <span className="block text-2xs text-muted">{desc}</span>}
      </span>
      <span className={cx('shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors', on ? 'bg-accent' : 'bg-surface2 border border-line')}>
        <span className={cx('block w-5 h-5 rounded-full bg-white transition-transform', on && 'translate-x-4')} />
      </span>
    </button>
  )
}

/**
 * Formular für eigene Übungen. `initial` = Entwurf (neu, Duplikat oder bestehende Übung), `editId` = ID beim Bearbeiten
 * (fehlt: neue Übung mit neuer ID). `onSaved` bekommt die gespeicherte Übung.
 */
export function ExerciseFormSheet({ open, onClose, initial, editId, onSaved }: {
  open: boolean; onClose: () => void; initial: ExerciseDraft | null; editId?: string; onSaved?: (ex: Exercise) => void
}) {
  const all = useAllExercises()
  const [d, setD] = useState<ExerciseDraft>(initial ?? EMPTY_DRAFT)
  const [shown, setShown] = useState(false)
  const [imgErr, setImgErr] = useState('')
  const file = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) { setD(initial ?? EMPTY_DRAFT); setShown(false); setImgErr('') } }, [open, initial])

  const error = validateDraft(d, all, editId)
  const set = (p: Partial<ExerciseDraft>) => setD((x) => ({ ...x, ...p }))
  const bw = d.equipment === 'bodyweight'
  const cardio = d.equipment === 'cardio'
  const dbKb = d.equipment === 'dumbbell' || d.equipment === 'kettlebell'

  const pick = async (f?: File) => {
    if (!f) return
    try { set({ image: await shrinkImage(f) }); setImgErr('') } catch (e) { setImgErr(e instanceof Error ? e.message : 'Das Bild konnte nicht geladen werden.') }
    if (file.current) file.current.value = ''
  }

  const save = async () => {
    setShown(true)
    if (error) return
    const ex = buildExercise(d, editId ?? newCustomId(d.name, all.map((e) => e.id)))
    await saveCustomExercise(ex)
    onSaved?.(ex)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editId ? 'Übung bearbeiten' : 'Eigene Übung'} tall>
      <div className="px-4 space-y-5 pb-2">
        <Field label="Name">
          <input className={inputCls} value={d.name} maxLength={NAME_MAX} placeholder="z. B. Kabel-Pullover" aria-label="Name der Übung"
            onChange={(e) => set({ name: e.target.value })} />
        </Field>

        <Field label="Gerät">
          <div className="flex flex-wrap gap-2">
            {CUSTOM_EQUIPMENT.map((q) => <Chip key={q} active={d.equipment === q} onClick={() => set({ equipment: q })}>{EQUIPMENT_LABEL[q]}</Chip>)}
          </div>
        </Field>

        {!cardio && (
          <>
        <Field label="Muskeln" hint="Antippen: Hauptmuskel, nochmal: Nebenmuskel (zählt halb), nochmal: nicht beteiligt.">
          <div className="flex flex-wrap gap-2">
            {MUSCLES.map((m) => {
              const p = d.primary.includes(m.id)
              const s = d.secondary.includes(m.id)
              return (
                <button key={m.id} type="button" aria-label={`${m.label}: ${p ? 'Hauptmuskel' : s ? 'Nebenmuskel' : 'nicht beteiligt'}`}
                  onClick={() => setD((x) => cycleMuscle(x, m.id))}
                  className={cx('rounded-full px-3 py-1.5 text-xs whitespace-nowrap border',
                    p ? 'bg-accent text-accent-fg border-accent font-semibold' : s ? 'border-accent text-fg bg-surface2' : 'bg-surface2 text-muted border-line')}>
                  {m.label}{s ? ' (neben)' : ''}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Bewegungsmuster">
          <div className="flex flex-wrap gap-2">
            {CUSTOM_PATTERNS.map((p) => <Chip key={p} active={d.pattern === p} onClick={() => set({ pattern: p })}>{PATTERN_LABEL[p]}</Chip>)}
          </div>
        </Field>

        <Field label="Messgröße" hint={d.metric === 'distance' ? 'Strecke in Metern (z. B. Farmer\'s Walk, Schlitten): Ziel 20–40 m, +5 m je Einheit. Zusatzgewicht bleibt möglich, 1RM und Volumen gibt es nicht.'
          : d.metric === 'time' ? 'Dauer in Sekunden (z. B. Plank): Ziel 30–60 s, +5 s je Einheit, kein 1RM und kein Volumen.' : undefined}>
          <Segmented value={d.metric} onChange={(v) => set({ metric: v })}
            options={[{ value: 'reps', label: 'Wiederholungen' }, { value: 'time', label: 'Zeit (Sekunden)' }, { value: 'distance', label: 'Distanz (Meter)' }]} />
        </Field>

        {dbKb && (
          <Field label="Gewicht" hint="Je Seite: du hältst ein Gerät pro Hand, das Volumen zählt doppelt.">
            <Segmented value={d.load} onChange={(v) => set({ load: v })}
              options={[{ value: 'perSide', label: 'Je Seite' }, { value: 'single', label: 'Ein Gerät' }]} />
          </Field>
        )}

        {bw && (
          <Field label={`Körpergewichtsanteil: ${Math.round(d.bodyweight * 100)} %`}
            hint="Anteil deines Körpergewichts, der bewegt wird (Liegestütz ≈ 64 %, Klimmzug ≈ 95 %). 0 % = nur Zusatzgewicht zählt.">
            <input type="range" min={0} max={100} step={5} value={Math.round(d.bodyweight * 100)} className="w-full accent-[var(--accent)]"
              aria-label="Körpergewichtsanteil" onChange={(e) => set({ bodyweight: Number(e.target.value) / 100 })} />
          </Field>
        )}

        <Field label="Art" hint="Verbund: mehrere Gelenke, längere Pausen, Reserve bleibt ≥ 1. Isolation: ein Gelenk.">
          <Segmented value={d.compound ? 'compound' : 'isolation'} onChange={(v) => set({ compound: v === 'compound' })}
            options={[{ value: 'compound', label: 'Verbundübung' }, { value: 'isolation', label: 'Isolationsübung' }]} />
        </Field>

        <div className="space-y-1 divide-y divide-line">
          <Toggle label="Einseitig" desc="Links und rechts werden getrennt erfasst." on={d.unilateral} onChange={(v) => set({ unilateral: v })} />
          {!isRepless(d.metric) && (
            <Toggle label="Assistiert" desc="Das Gewicht ist die Unterstützung (weniger = schwerer)." on={d.assisted} onChange={(v) => set({ assisted: v })} />
          )}
        </div>

          </>
        )}

        <Field label="Beschreibung (optional)" hint="Eine Zeile pro Schritt, erscheint als Anleitung in der Übung.">
          <textarea className={`${inputCls} min-h-24`} rows={4} maxLength={DESCRIPTION_MAX} value={d.description} aria-label="Beschreibung"
            placeholder={'Ausgangsposition einnehmen\nGewicht kontrolliert bewegen'} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <Field label="Bild (optional)" hint="Wird automatisch verkleinert und nur auf dem Gerät gespeichert.">
          <div className="flex items-center gap-3">
            {d.image && <img src={d.image} alt="Vorschau" className="w-20 h-20 rounded-xl object-cover border border-line" />}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" className="!py-2" onClick={() => file.current?.click()}>{d.image ? 'Bild ersetzen' : 'Bild wählen'}</Button>
              {d.image && <Button variant="ghost" className="!py-2" onClick={() => set({ image: '' })}>Entfernen</Button>}
            </div>
            <input ref={file} type="file" accept="image/*" className="hidden" aria-label="Bilddatei" onChange={(e) => void pick(e.target.files?.[0])} />
          </div>
          {imgErr && <p role="alert" className="text-sm text-danger">{imgErr}</p>}
        </Field>

        {shown && error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button className="w-full" disabled={shown && !!error} onClick={() => void save()}>{editId ? 'Speichern' : 'Übung anlegen'}</Button>
      </div>
    </BottomSheet>
  )
}
