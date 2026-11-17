import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RestCategory, Settings, WarmupOverrideMode } from '../../types'
import { Card, Page } from '../../components/ui'
import { SlideOver } from '../../components/SlideOver'
import { saveSettings, useSettings } from '../../db/db'
import { REST_CATEGORIES, REST_LABEL } from '../../engine/rest'
import { DEFAULT_WARMUP_SCHEMES, cloneSchemes } from '../../engine/warmup'
import { AutomationSheet, ListRow, SchemeEditor, automationLabel } from '../workouts/sheets'

const MODE_TO_OVERRIDE: Record<Settings['warmupMode'], WarmupOverrideMode> = { smart: 'smart', scheme: 'scheme', off: 'none' }

/** Einstellungen › Workouts › Aufwärmen: Warm-Up Automation und Warm-Up Scheme (Unterseite mit den fünf Gruppen). */
export function WarmupSettingsPage() {
  const nav = useNavigate()
  const s = useSettings()
  const [auto, setAuto] = useState(false)
  const [scheme, setScheme] = useState(false)
  const [edit, setEdit] = useState<RestCategory | null>(null)
  const update = (p: Partial<Settings>) => saveSettings({ ...s, ...p })
  const changed = REST_CATEGORIES.some((c) => JSON.stringify(s.warmupSchemes[c]) !== JSON.stringify(DEFAULT_WARMUP_SCHEMES[c]))

  return (
    <Page title="Aufwärmen" back={() => nav('/more/workouts')}>
      <Card className="divide-y divide-line !py-1">
        <ListRow icon="automation" label="Warm-Up Automation" value={automationLabel(MODE_TO_OVERRIDE[s.warmupMode])} action="Edit" onClick={() => setAuto(true)}
          hint={s.warmupMode === 'smart' ? 'Warm-ups are added automatically depending on how fresh your muscles are and how heavy the weight is.'
            : s.warmupMode === 'scheme' ? 'Warm-ups follow the scheme of each exercise group.' : 'Warm-ups will not be automatically added to your workouts.'} />
        <ListRow icon="blocks" label="Warm-Up Scheme" value="Standard je Übungsgruppe" onClick={() => setScheme(true)} />
      </Card>

      <p className="text-xs text-muted px-1">
        Hinweis zur Studienlage: Ein spezifisches Aufwärmen mit leichteren Sätzen derselben Übung hilft teils leicht, teils gar nicht
        (Systematic Review Ribeiro et al., Motricidade 2021), am ehesten bei Lasten nahe am Maximum. Für Satzzahl und Prozentwerte gibt
        es keinen Konsens und keine belegte Formel: Smart und die Standard-Schemata sind Praxis-Heuristiken.
      </p>

      <AutomationSheet appLevel open={auto} onClose={() => setAuto(false)} value={MODE_TO_OVERRIDE[s.warmupMode]}
        onPick={(m) => update({ warmupMode: m === 'none' ? 'off' : m === 'smart' ? 'smart' : 'scheme' })} />

      <SlideOver open={scheme} onClose={() => setScheme(false)} title="Scheme">
        <Card className="!p-0">
          {REST_CATEGORIES.map((c, i) => (
            <div key={c}>
              {i > 0 && <div className="mx-4 border-t border-line" />}
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{REST_LABEL[c]}</div>
                  <div className="mt-1 space-y-0.5 text-xs text-muted">
                    {s.warmupSchemes[c].length === 0 && <div>Keine Aufwärmsätze</div>}
                    {s.warmupSchemes[c].map((st, j) => <div key={j}>{st.pct}% target weight × {st.reps} reps</div>)}
                  </div>
                </div>
                <button onClick={() => setEdit(c)} aria-label={`${REST_LABEL[c]} bearbeiten`}
                  className="rounded-full bg-surface2 px-3.5 py-1.5 text-xs font-semibold active:opacity-70">Edit</button>
              </div>
            </div>
          ))}
        </Card>
        <button disabled={!changed} onClick={() => update({ warmupSchemes: cloneSchemes(DEFAULT_WARMUP_SCHEMES) })}
          className="w-full rounded-xl bg-surface2 py-3 text-sm font-semibold text-red-500 active:opacity-70 disabled:opacity-40">Reset Scheme</button>

        <SchemeEditor open={edit !== null} onClose={() => setEdit(null)} title={edit ? REST_LABEL[edit] : ''}
          steps={edit ? s.warmupSchemes[edit] : []}
          onSave={(steps) => edit && update({ warmupSchemes: { ...s.warmupSchemes, [edit]: steps } })}
          onReset={edit ? () => update({ warmupSchemes: { ...s.warmupSchemes, [edit]: DEFAULT_WARMUP_SCHEMES[edit] } }) : undefined} />
      </SlideOver>
    </Page>
  )
}
