import { useEffect, useState, type ReactNode } from 'react'
import type { Exercise } from '../../types'
import { Button, Card } from '../../components/ui'
import { SlideOver } from '../../components/SlideOver'
import { deleteCustomExercise, saveExerciseOverride, useAllExercises, useExerciseOverrides, useSettings } from '../../db/db'
import { draftOf, duplicateDraft, type ExerciseDraft } from '../../engine/customExercise'
import { ExerciseFormSheet } from './ExerciseForm'
import { REST_LABEL, formatRest, restCategory } from '../../engine/rest'
import { ExerciseInfoSheet } from '../workouts/ExerciseInfoSheet'
import { AutomationSheet, ListRow, NoteSheet, RestOverrideSheet, SchemeEditor, SchemeTable, WeightListSheet, WeightScaleSheet, automationLabel, scaleSummary, schemeSummary, usesWeightList } from '../workouts/sheets'
import { de } from '../../i18n/de'
import { t, lc } from '../../i18n'

function SubPage({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(t)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 260)
    return () => clearTimeout(t)
  }, [open])
  if (!mounted) return null
  return (
    <div className="absolute inset-0 z-20 bg-bg flex flex-col transition-transform duration-250 ease-out"
      style={{ transform: shown ? 'translateX(0)' : 'translateX(100%)' }}>
      <header className="safe-top shrink-0 bg-bg border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={onClose} aria-label={t('Zurück')} className="text-accent text-xl -ml-1">‹</button>
          <h1 className="font-bold text-lg flex-1 truncate">{title}</h1>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 safe-bottom">{children}</div>
    </div>
  )
}

/** Übungsseite: General (Info, Notiz) und Exercise Overrides (Warm-Up Scheme, Warm-Up Automation). */
export function ExerciseDetail({ ex, onClose }: { ex: Exercise | null; onClose: () => void }) {
  const settings = useSettings()
  const overrides = useExerciseOverrides()
  const [info, setInfo] = useState(false)
  const [note, setNote] = useState(false)
  const [sub, setSub] = useState(false)
  const [editScheme, setEditScheme] = useState(false)
  const [auto, setAuto] = useState(false)
  const [restEdit, setRestEdit] = useState(false)
  const [scaleEdit, setScaleEdit] = useState(false)
  const all = useAllExercises()
  const [form, setForm] = useState<{ draft: ExerciseDraft; editId?: string } | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [blocked, setBlocked] = useState('')
  // Beim Wechsel der Übung Unterseiten zurücksetzen
  const [last, setLast] = useState<Exercise | null>(ex)
  if (ex && ex !== last) setLast(ex)
  const base = ex ?? last
  const cur = (base && all.find((e) => e.id === base.id)) || base
  useEffect(() => { if (!ex) { setSub(false); setInfo(false); setNote(false); setEditScheme(false); setAuto(false); setRestEdit(false); setScaleEdit(false); setFormOpen(false); setBlocked('') } }, [ex])
  if (!cur) return null

  const ov = overrides[cur.id]
  const cat = restCategory(cur)
  const defaultScheme = settings.warmupSchemes[cat]
  const scheme = ov?.warmupScheme ?? defaultScheme
  const noWarm = !!cur.cardio
  const defaultRest = settings.restSeconds[cat]
  const openForm = (draft: ExerciseDraft, editId?: string) => { setForm({ draft, editId }); setFormOpen(true) }
  const remove = async () => {
    if (!confirm(t('„{0}“ wirklich löschen?', cur.name))) return
    let usage = await deleteCustomExercise(cur.id)
    if (!usage) { onClose(); return }
    // Nur in Programmen geplant (kein Verlauf): auf Wunsch dort entfernen und löschen
    if (usage.sessions === 0 && usage.programs.length) {
      if (!confirm(t('„{0}“ ist im Programm {1} geplant. Dort entfernen und die Übung löschen?', cur.name, usage.programs.join(', ')))) return
      usage = await deleteCustomExercise(cur.id, true)
      if (!usage) { onClose(); return }
      if (usage.emptied?.length) {
        setBlocked(t('Löschen nicht möglich: In {0} ist sie die einzige Übung. Ergänze dort zuerst eine andere (Tauschen in der Vorschau).', usage.emptied.join('; ')))
        return
      }
    }
    const parts = [
      usage.sessions ? t('in {0} {1} geloggt', usage.sessions, lc(usage.sessions === 1 ? t('Einheit') : t('Einheiten'))) : '',
      usage.programs.length ? t('im Programm {0}', usage.programs.join(', ')) : '',
    ].filter(Boolean).join(t(' und '))
    setBlocked(t('Löschen nicht möglich: Die Übung ist {0}. Geloggte Einheiten lassen sich nur im Verlauf bearbeiten (Übung dort entfernen).', parts))
  }

  return (
    <SlideOver open={ex !== null} onClose={onClose} title={cur.name}>
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-muted px-1">{de.common.general}</h2>
        <Card className="divide-y divide-line !py-1">
          <ListRow icon="guide" label="Info" value={de.exercise.infoValue} onClick={() => setInfo(true)} />
          <ListRow icon="note" label={de.exercise.note} value={ov?.note || t('Keine Notiz')} onClick={() => setNote(true)} />
        </Card>
      </section>

      {(!cur.cardio || cur.custom) && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted px-1">{cur.custom ? t('Eigene Übung') : t('Als Vorlage')}</h2>
          <Card className="divide-y divide-line !py-1">
            {cur.custom && <ListRow icon="note" label={t('Bearbeiten')} value={t('Name, Muskeln, Gerät …')} onClick={() => openForm(draftOf(cur), cur.id)} />}
            <ListRow icon="blocks" label={t('Duplizieren')} value={t('Als neue eigene Übung')} onClick={() => openForm(duplicateDraft(cur, all))} />
            {cur.custom && <ListRow icon="note" label={t('Löschen')} value={blocked || t('Nur ohne Verlauf')} onClick={() => void remove()} />}
          </Card>
          {blocked && <p role="alert" className="text-xs text-danger px-1">{blocked}</p>}
        </section>
      )}

      {!noWarm && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted px-1">{de.exercise.overrides}</h2>
          <Card className="divide-y divide-line !py-1">
            <ListRow icon="blocks" label={de.warmup.scheme} value={ov?.warmupScheme ? `${de.warmup.custom} · ${schemeSummary(scheme)}` : de.common.default}
              onClick={() => setSub(true)} />
            <ListRow icon="automation" label={de.warmup.automation} value={automationLabel(ov?.warmupMode)} action={de.common.change} onClick={() => setAuto(true)}
              hint={!ov?.warmupMode || ov.warmupMode === 'default' ? de.warmup.hintAppLevel
                : ov.warmupMode === 'none' ? de.warmup.hintNone : undefined} />
            <ListRow icon="timer" label={de.warmup.restTimer} value={ov?.restSeconds ? formatRest(ov.restSeconds) : de.common.default} action={de.common.change} onClick={() => setRestEdit(true)}
              hint={ov?.restSeconds ? undefined : de.warmup.hintRest(formatRest(defaultRest))} />
            <ListRow icon="scale" label={de.exercise.weightScale} value={scaleSummary(ov?.weightScale, settings.weightUnit)} action={de.common.change} onClick={() => setScaleEdit(true)} />
          </Card>
        </section>
      )}

      <SubPage open={sub} onClose={() => setSub(false)} title={de.warmup.scheme}>
        <Card className="space-y-1">
          <div className="text-sm font-semibold">{ov?.warmupScheme ? de.warmup.custom : de.common.default}</div>
          <div className="text-xs text-muted">{ov?.warmupScheme ? de.warmup.customOnly : t('Standardschema: {0}', REST_LABEL[cat])}</div>
        </Card>
        <Card><SchemeTable steps={scheme} editable={false} /></Card>
        <Button className="w-full" onClick={() => setEditScheme(true)}>{de.warmup.custom} {t('bearbeiten')}</Button>
        {ov?.warmupScheme && (
          <Button variant="ghost" className="w-full" onClick={() => void saveExerciseOverride(cur.id, { warmupScheme: undefined })}>{t('Zurück zum Default')}</Button>
        )}
      </SubPage>

      <ExerciseFormSheet open={formOpen} onClose={() => setFormOpen(false)} initial={form?.draft ?? null} editId={form?.editId}
        onSaved={() => { if (!form?.editId) onClose() }} />
      <ExerciseInfoSheet ex={cur} open={info} onClose={() => setInfo(false)} />
      <NoteSheet open={note} onClose={() => setNote(false)} ex={cur} scopes={['exercise']} initialScope="exercise"
        values={{ exercise: ov?.note }} onSave={(_, t) => void saveExerciseOverride(cur.id, { note: t || undefined })} />
      <SchemeEditor open={editScheme} onClose={() => setEditScheme(false)} title={de.warmup.scheme} steps={scheme}
        onSave={(steps) => void saveExerciseOverride(cur.id, { warmupScheme: steps })}
        onReset={ov?.warmupScheme ? () => void saveExerciseOverride(cur.id, { warmupScheme: undefined }) : undefined} resetLabel={t('Zurück zum Default')} />
      <RestOverrideSheet open={restEdit} onClose={() => setRestEdit(false)} defaultSec={defaultRest} override={ov?.restSeconds}
        onSave={(sec) => void saveExerciseOverride(cur.id, { restSeconds: sec })} />
      {usesWeightList(cur.equipment)
        ? <WeightListSheet open={scaleEdit} onClose={() => setScaleEdit(false)} equipment={cur.equipment} scale={ov?.weightScale} unit={settings.weightUnit}
            onSave={(s) => void saveExerciseOverride(cur.id, { weightScale: s })} />
        : <WeightScaleSheet open={scaleEdit} onClose={() => setScaleEdit(false)} scale={ov?.weightScale} unit={settings.weightUnit}
            onSave={(s) => void saveExerciseOverride(cur.id, { weightScale: s })} />}
      <AutomationSheet open={auto} onClose={() => setAuto(false)} value={ov?.warmupMode}
        onPick={(m) => void saveExerciseOverride(cur.id, { warmupMode: m === 'default' ? undefined : m })} />
    </SlideOver>
  )
}
