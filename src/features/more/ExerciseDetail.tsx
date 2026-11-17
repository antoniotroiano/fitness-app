import { useEffect, useState, type ReactNode } from 'react'
import type { Exercise } from '../../types'
import { Button, Card } from '../../components/ui'
import { SlideOver } from '../../components/SlideOver'
import { saveExerciseOverride, useExerciseOverrides, useSettings } from '../../db/db'
import { REST_LABEL, formatRest, restCategory } from '../../engine/rest'
import { ExerciseInfoSheet } from '../workouts/ExerciseInfoSheet'
import { AutomationSheet, ListRow, NoteSheet, RestOverrideSheet, SchemeEditor, SchemeTable, automationLabel, schemeSummary } from '../workouts/sheets'

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
          <button onClick={onClose} aria-label="Zurück" className="text-accent text-xl -ml-1">‹</button>
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
  // Beim Wechsel der Übung Unterseiten zurücksetzen
  const [last, setLast] = useState<Exercise | null>(ex)
  if (ex && ex !== last) setLast(ex)
  const cur = ex ?? last
  useEffect(() => { if (!ex) { setSub(false); setInfo(false); setNote(false); setEditScheme(false); setAuto(false); setRestEdit(false) } }, [ex])
  if (!cur) return null

  const ov = overrides[cur.id]
  const cat = restCategory(cur)
  const defaultScheme = settings.warmupSchemes[cat]
  const scheme = ov?.warmupScheme ?? defaultScheme
  const noWarm = !!cur.cardio
  const defaultRest = settings.restSeconds[cat]

  return (
    <SlideOver open={ex !== null} onClose={onClose} title={cur.name}>
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-muted px-1">General</h2>
        <Card className="divide-y divide-line !py-1">
          <ListRow icon="guide" label="Info" value="Instructions, Details, History" onClick={() => setInfo(true)} />
          <ListRow icon="note" label="Exercise Note" value={ov?.note || 'Keine Notiz'} onClick={() => setNote(true)} />
        </Card>
      </section>

      {!noWarm && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted px-1">Exercise Overrides</h2>
          <Card className="divide-y divide-line !py-1">
            <ListRow icon="blocks" label="Warm-Up Scheme" value={ov?.warmupScheme ? `Override · ${schemeSummary(scheme)}` : 'Default'}
              onClick={() => setSub(true)} />
            <ListRow icon="automation" label="Warm-Up Automation" value={automationLabel(ov?.warmupMode)} action="Edit" onClick={() => setAuto(true)}
              hint={!ov?.warmupMode || ov.warmupMode === 'default' ? 'Warm-Up Automation will default to app level Settings.'
                : ov.warmupMode === 'none' ? 'Warm-ups will not be automatically added to your workout.' : undefined} />
            <ListRow icon="timer" label="Rest Timer" value={ov?.restSeconds ? formatRest(ov.restSeconds) : 'Default'} action="Edit" onClick={() => setRestEdit(true)}
              hint={ov?.restSeconds ? undefined : `Rest Timer will default to the setting of this exercise group (${formatRest(defaultRest)}).`} />
          </Card>
        </section>
      )}

      <SubPage open={sub} onClose={() => setSub(false)} title="Warm-Up Scheme">
        <Card className="space-y-1">
          <div className="text-sm font-semibold">{ov?.warmupScheme ? 'Override' : 'Default'}</div>
          <div className="text-xs text-muted">{ov?.warmupScheme ? 'Eigenes Schema nur für diese Übung.' : `Standardschema: ${REST_LABEL[cat]}`}</div>
        </Card>
        <Card><SchemeTable steps={scheme} editable={false} /></Card>
        <Button className="w-full" onClick={() => setEditScheme(true)}>Override</Button>
        {ov?.warmupScheme && (
          <Button variant="ghost" className="w-full" onClick={() => void saveExerciseOverride(cur.id, { warmupScheme: undefined })}>Zurück zum Default</Button>
        )}
      </SubPage>

      <ExerciseInfoSheet ex={cur} open={info} onClose={() => setInfo(false)} />
      <NoteSheet open={note} onClose={() => setNote(false)} ex={cur} scopes={['exercise']} initialScope="exercise"
        values={{ exercise: ov?.note }} onSave={(_, t) => void saveExerciseOverride(cur.id, { note: t || undefined })} />
      <SchemeEditor open={editScheme} onClose={() => setEditScheme(false)} title="Warm-Up Scheme" steps={scheme}
        onSave={(steps) => void saveExerciseOverride(cur.id, { warmupScheme: steps })}
        onReset={ov?.warmupScheme ? () => void saveExerciseOverride(cur.id, { warmupScheme: undefined }) : undefined} resetLabel="Zurück zum Default" />
      <RestOverrideSheet open={restEdit} onClose={() => setRestEdit(false)} defaultSec={defaultRest} override={ov?.restSeconds}
        onSave={(sec) => void saveExerciseOverride(cur.id, { restSeconds: sec })} />
      <AutomationSheet open={auto} onClose={() => setAuto(false)} value={ov?.warmupMode}
        onPick={(m) => void saveExerciseOverride(cur.id, { warmupMode: m === 'default' ? undefined : m })} />
    </SlideOver>
  )
}
