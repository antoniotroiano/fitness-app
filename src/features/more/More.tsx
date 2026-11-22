import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Equipment, Exercise, MuscleId, Settings } from '../../types'
import { BottomSheet, Button, Card, Chip, LinkButton, Page, Segmented, cx, inputCls } from '../../components/ui'
import { PLATE_OPTIONS } from '../../engine/plates'
import { kgToDisplay } from '../../utils/units'
import { downloadText } from '../../utils/download'
import { ExercisePicker } from '../wizard/shared'
import { TrainingImportCard } from './TrainingImport'
import { DEFAULT_SETTINGS, exportAll, exportSessionsCsv, importAll, importProgramJson, parseWeightFile, patchSettings, resetAllData, resetSettings, setWeight, useAllExercises, useLayoutPrefs, useSettings } from '../../db/db'
import { LayoutEditor } from '../dashboard/LayoutSheet'
import { EQUIPMENT_LABEL, searchText } from '../../data/exercises'
import { MUSCLES, muscleLabel } from '../../data/muscles'
import { formatHeight } from '../../utils/units'
import { ExerciseDetail } from './ExerciseDetail'
import { ExerciseFormSheet } from './ExerciseForm'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import { Icon, type IconName } from '../../components/icons'
import { MuscleThumb } from '../../components/MuscleFigure'
import { GROUP_PREVIEW, groupExercises, type LibraryGroup } from '../../engine/library'
import { DEFAULT_REST, DEFAULT_WARMUP_REST_BETWEEN, DEFAULT_WARMUP_REST_LAST, REST_CATEGORIES, REST_LABEL, formatRest } from '../../engine/rest'
import { de } from '../../i18n/de'

export { WarmupSettingsPage } from './WarmupSettings'

export const APP_VERSION = '0.1.0'

function Row({ label, desc, to, icon }: { label: string; desc?: string; to: string; icon?: IconName }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav(to, { state: { fromMore: true } })} className="w-full flex items-center gap-3 py-3.5 text-left">
      {icon && <Icon name={icon} />}
      <span className="flex-1 min-w-0"><span className="block text-sm font-medium">{label}</span>{desc && <span className="block text-xs text-muted">{desc}</span>}</span>
      <span className="text-muted">›</span>
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-muted px-1">{title}</h2>
      <Card className="divide-y divide-line !py-1">{children}</Card>
    </section>
  )
}

function Option<T extends string>({ label, value, options, onChange, icon }: {
  icon?: IconName; label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-3 text-sm font-medium">{icon && <Icon name={icon} />}{label}</span>
      <div className="flex gap-1.5">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={o.value === value}
            className={cx('rounded-full px-3 py-1.5 text-xs whitespace-nowrap border',
              o.value === value ? 'bg-accent text-accent-fg border-accent font-semibold' : 'bg-surface2 text-muted border-line')}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

const THEME_TILES: { value: Settings['theme']; label: string; bg: string }[] = [
  { value: 'system', label: de.more.themeSystem, bg: 'linear-gradient(135deg, #f5f6f8 50%, #0e0f11 50%)' },
  { value: 'light', label: de.more.themeLight, bg: '#f5f6f8' },
  { value: 'dark', label: de.more.themeDark, bg: '#0e0f11' },
]

function ThemePicker({ value, onChange }: { value: Settings['theme']; onChange: (v: Settings['theme']) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-3" role="radiogroup" aria-label={de.more.theme}>
      {THEME_TILES.map((t) => (
        <button key={t.value} role="radio" aria-checked={value === t.value} aria-label={t.label} title={t.label} onClick={() => onChange(t.value)}
          className={cx('relative h-20 rounded-2xl border-2 overflow-hidden', value === t.value ? 'border-accent' : 'border-line')}
          style={{ background: t.bg }}>
          {/* Mini-Vorschau: Karte und Akzent */}
          <span className="absolute left-3 right-3 top-4 h-3 rounded-full" style={{ background: t.value === 'dark' ? '#1c2540' : t.value === 'light' ? '#fff' : 'linear-gradient(90deg, #fff 50%, #1c2540 50%)' }} />
          <span className="absolute left-3 w-8 bottom-4 h-3 rounded-full" style={{ background: 'var(--accent)' }} />
          {value === t.value && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent text-accent-fg text-xs flex items-center justify-center">✓</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function More() {
  const { s, update } = useSettingsForm()
  return (
    <Page title={de.more.title}>
      <Section title={de.more.general}>
        <Row icon="profile" label="Profil" desc="Name, Geburtstag, Geschlecht, Größe" to="/more/profile" />
        <Row icon="units" label={de.more.units} desc={`${s.weightUnit}, ${s.lengthUnit === 'in' ? 'in / ft' : 'cm'}, ${s.distanceUnit}, ${s.clock === '12h' ? '12 h' : '24 h'}`} to="/more/units" />
        <Option icon="language" label={de.more.language} value={s.language} onChange={(v) => update({ language: v })}
          options={[{ value: 'de', label: 'DE' }, { value: 'en', label: 'EN' }]} />
        {s.language === 'en' && <p className="py-2 text-xs text-muted">English ist noch nicht verfügbar, die App bleibt vorerst auf Deutsch.</p>}
      </Section>

      <Section title={de.more.features}>
        <Row icon="dashboard" label="Dashboard" desc="Bereiche und Plus-Menü anpassen" to="/more/dashboard" />
        <Row icon="workouts" label="Workouts" desc="Pause, Aufwärmen, Progression" to="/more/workouts" />
        <Row icon="calendar" label="Verlauf" desc="Einheiten ansehen, korrigieren, nachtragen" to="/history" />
        <Row icon="library" label="Übungen" desc="Übungsbibliothek durchsuchen" to="/more/library" />
      </Section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-muted px-1">{de.more.theme}</h2>
        <Card className="!py-1"><ThemePicker value={s.theme} onChange={(v) => update({ theme: v })} /></Card>
      </section>

      <Section title={de.more.data}>
        <Row icon="weight" label="Körpergewicht" to="/weight" />
        <Row icon="measures" label="Körpermaße" to="/measures" />
        <Row icon="data" label="Daten" desc="Backup, Import, Zurücksetzen" to="/more/data" />
      </Section>

      <Section title={de.more.other}>
        <Row icon="help" label="Hilfe" to="/more/help" />
        <Row icon="about" label={de.more.about} to="/more/about" />
      </Section>
    </Page>
  )
}

/** Funktionseinstellungen → Dashboard (PLAN-6 B17) */
export function DashboardSettingsPage() {
  const nav = useNavigate()
  const prefs = useLayoutPrefs()
  return (
    <Page title="Dashboard" back={() => nav('/more')}>
      <LayoutEditor prefs={prefs} />
    </Page>
  )
}

/** General → Units */
export function UnitsPage() {
  const nav = useNavigate()
  const { s, update } = useSettingsForm()
  return (
    <Page title={de.more.units} back={() => nav('/more')}>
      <Card className="divide-y divide-line !py-1">
        <Option label="Gewicht" value={s.weightUnit} onChange={(v) => update({ weightUnit: v })}
          options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} />
        <Option label="Länge" value={s.lengthUnit} onChange={(v) => update({ lengthUnit: v })}
          options={[{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in / ft' }]} />
        <Option label="Distanz" value={s.distanceUnit} onChange={(v) => update({ distanceUnit: v })}
          options={[{ value: 'km', label: 'km' }, { value: 'mi', label: 'mi' }]} />
        <Option label="Zeitformat" value={s.clock} onChange={(v) => update({ clock: v })}
          options={[{ value: '24h', label: '24 h' }, { value: '12h', label: '12 h' }]} />
      </Card>
    </Page>
  )
}

function useSettingsForm() {
  const s = useSettings()
  const update = (p: Partial<Settings>) => patchSettings(p)
  return { s, update }
}

function Stepper({ label, value, onChange, min = 15, step = 15 }: { label: string; value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  const btn = 'w-9 h-9 rounded-lg bg-surface2 text-lg'
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button className={btn} aria-label={`${label} kürzer`} onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <span className="w-16 text-center text-sm tabular-nums">{value === 0 ? 'aus' : formatRest(value)}</span>
        <button className={btn} aria-label={`${label} länger`} onClick={() => onChange(Math.min(600, value + step))}>+</button>
      </div>
    </div>
  )
}

function SwitchRow({ icon, label, desc, checked, onChange }: { icon: IconName; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <Icon name={icon} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{desc}</span>
      </span>
      <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={cx('relative w-12 h-7 rounded-full shrink-0 transition-colors', checked ? 'bg-accent' : 'bg-line')}>
        <span className={cx('absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow transition-transform', checked ? 'translate-x-5 bg-accent-fg' : 'bg-surface')} />
      </button>
    </div>
  )
}

/** Einstellungen › Workouts: General (Pause, Aufwärmen) und Display (Display aktiv halten). */
/** Gewicht in der Anzeigeeinheit (Einstellungen speichern kg) */
const fmtKgIn = (kg: number, unit: 'kg' | 'lb') => `${(unit === 'kg' ? kg : kgToDisplay(kg, unit)).toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${unit}`

export function WorkoutSettingsPage() {
  const nav = useNavigate()
  const { s, update } = useSettingsForm()
  return (
    <Page title="Workouts" back={() => nav('/more')}>
      <Section title={de.more.general}>
        <Row icon="timer" label="Pause" desc="Rest-Timer je Übungstyp" to="/more/workouts/rest" />
        <Row icon="warmup" label="Aufwärmen" desc="Smart-Aufwärmen und Schemata" to="/more/workouts/warmup" />
      </Section>
      <Section title="Progression">
        <div className="py-3.5 space-y-2">
          <span className="block text-sm font-medium">Zielwert nach einer Steigerung</span>
          <div role="radiogroup" aria-label="Zielwert" className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1">
            {([['mid', 'Mitte des Bereichs'], ['min', 'Untergrenze']] as const).map(([v, label]) => (
              <button key={v} role="radio" aria-checked={s.progressionTarget === v} onClick={() => update({ progressionTarget: v })}
                className={cx('rounded-lg py-2 text-sm font-medium', s.progressionTarget === v ? 'bg-surface shadow text-fg' : 'text-muted')}>{label}</button>
            ))}
          </div>
          <span className="block text-xs text-muted">
            {s.progressionTarget === 'mid'
              ? 'Gewicht und Wdh. werden so gewählt, dass du nach einer Steigerung um die Mitte des Bereichs landest (bei 6–10 um 8). Kleinere Sprünge.'
              : 'Klassische Double Progression: Wdh. bis zur Obergrenze, dann mehr Gewicht und zurück an die Untergrenze.'}
          </span>
        </div>
        <div className="py-3.5 space-y-2">
          <span className="block text-sm font-medium">Sätze im Workout vorbelegen mit</span>
          <div role="radiogroup" aria-label="Vorbelegung" className="grid grid-cols-2 gap-1 rounded-xl bg-surface2 p-1">
            {([['suggestion', 'Vorschlag'], ['last', 'Letzten Werten']] as const).map(([v, label]) => (
              <button key={v} role="radio" aria-checked={s.prefillMode === v} onClick={() => update({ prefillMode: v })}
                className={cx('rounded-lg py-2 text-sm font-medium', s.prefillMode === v ? 'bg-surface shadow text-fg' : 'text-muted')}>{label}</button>
            ))}
          </div>
          <span className="block text-xs text-muted">
            {s.prefillMode === 'last'
              ? 'Gewicht und Wdh. wie in der letzten Einheit, Satz für Satz. Der Progressionsvorschlag steht über der Tabelle.'
              : 'Gewicht und Wdh. aus der Progression: so steigerst du dich Schritt für Schritt.'}
          </span>
        </div>
        {s.progressionTarget === 'mid' && (
          <SwitchRow icon="dumbbell" label="Weight Match" desc="Gewicht halten, solange die Wdh. damit im Bereich bleiben. Aus: das Gewicht passt sich öfter an, die Wdh. bleiben nahe der Mitte."
            checked={s.weightMatch} onChange={(v) => update({ weightMatch: v })} />
        )}
        <SwitchRow icon="target" label="Harter Satz zuerst" desc="Der erste Arbeitssatz geht 1 RIR näher ans Versagen und dient als Anker fürs RIR-Gefühl, die übrigen Sätze mit Ziel-RIR. In der letzten Blockwoche geht der erste Satz bis zum Versagen."
          checked={s.hardSetFirst} onChange={(v) => update({ hardSetFirst: v })} />
        <SwitchRow icon="repLinear" label="Bereich erweitern" desc="Ist die nächste Gewichtsstufe zu groß, steigen erst die Wdh. über die Obergrenze, statt mit zu wenig Wdh. zu springen."
          checked={s.expandRange} onChange={(v) => update({ expandRange: v })} />
      </Section>
      <Section title="Langhantel">
        <div className="py-3.5 space-y-2">
          <span className="block text-sm font-medium">Stange</span>
          <div className="flex gap-2 flex-wrap">
            {[10, 15, 20].map((b) => <Chip key={b} active={s.barWeight === b} onClick={() => update({ barWeight: b })}>{fmtKgIn(b, s.weightUnit)}</Chip>)}
          </div>
        </div>
        <div className="py-3.5 space-y-2">
          <span className="block text-sm font-medium">Verfügbare Scheiben</span>
          <div className="flex gap-2 flex-wrap">
            {PLATE_OPTIONS.map((p) => {
              const on = s.plates.includes(p)
              return <Chip key={p} active={on} onClick={() => update({ plates: on ? s.plates.filter((x) => x !== p) : [...s.plates, p].sort((a, b) => b - a) })}>{fmtKgIn(p, s.weightUnit)}</Chip>
            })}
          </div>
          <span className="block text-xs text-muted">Beim Eintragen des Gewichts einer Langhantelübung zeigt das Zahlenfeld, welche Scheiben pro Seite auf die Stange gehören.</span>
        </div>
      </Section>
      <Section title={de.common.display}>
        <SwitchRow icon="workouts" label="Automatisch zur nächsten Übung" desc="Nach dem letzten Satz einer Übung springt das Workout zur nächsten offenen. Supersätze wechseln immer."
          checked={s.autoAdvance} onChange={(v) => update({ autoAdvance: v })} />
        <SwitchRow icon="timer" label="Ton am Ende der Pause" desc="Zwei kurze Signaltöne, wenn der Pausen-Timer abläuft (zusätzlich zur Vibration, die iOS nicht unterstützt). Der Ton kommt nur bei geöffneter App und nicht im Stumm-Modus."
          checked={s.restSound} onChange={(v) => update({ restSound: v })} />
        <SwitchRow icon="phone" label={de.more.keepAlive} desc={de.more.keepAliveDesc} checked={s.keepAlive} onChange={(v) => update({ keepAlive: v })} />
        <SwitchRow icon="warmup" label="Erledigte Aufwärmsätze ausblenden" desc="Abgehakte Aufwärmsätze werden im Workout zu einer Zeile zusammengefasst, ein Tipp darauf zeigt sie wieder."
          checked={s.hideDoneWarmups} onChange={(v) => update({ hideDoneWarmups: v })} />
      </Section>
    </Page>
  )
}

export function RestSettingsPage() {
  const nav = useNavigate()
  const { s, update } = useSettingsForm()
  return (
    <Page title="Pause" back={() => nav('/more/workouts')}>
      <Card className="space-y-3">
        {REST_CATEGORIES.map((c) => (
          <Stepper key={c} label={REST_LABEL[c]} value={s.restSeconds[c]} onChange={(v) => update({ restSeconds: { ...s.restSeconds, [c]: v } })} />
        ))}
        <Stepper label="Zwischen Aufwärmsätzen" value={s.warmupRestBetween} onChange={(v) => update({ warmupRestBetween: v })} />
        <Stepper label="Nach letztem Aufwärmsatz" value={s.warmupRestLast} onChange={(v) => update({ warmupRestLast: v })} />
        <Stepper label="Zwischen den Seiten" min={0} step={5} value={s.sideRest} onChange={(v) => update({ sideRest: v })} />
        <p className="text-xs text-muted">Richtwerte aus der Studienlage: Verbundübungen 2-3 min, Isolation 1-2 min. Längere Pausen halten bei schweren Übungen Leistung und Volumen.</p>
        <Button variant="ghost" onClick={() => update({ restSeconds: DEFAULT_REST, warmupRestBetween: DEFAULT_WARMUP_REST_BETWEEN, warmupRestLast: DEFAULT_WARMUP_REST_LAST, sideRest: DEFAULT_SETTINGS.sideRest })}>Standard wiederherstellen</Button>
      </Card>
    </Page>
  )
}

export function ProfilePage() {
  const nav = useNavigate()
  const { s, update } = useSettingsForm()
  const [h, setH] = useState('')
  return (
    <Page title="Profil" back={() => nav('/more')}>
      <Card className="space-y-4">
        <label className="block text-xs text-muted">Name
          <input className={`${inputCls} mt-1`} value={s.name} onChange={(e) => update({ name: e.target.value })} /></label>
        <label className="block text-xs text-muted">Geburtstag
          <input type="date" className={`${inputCls} mt-1`} value={s.birthday} onChange={(e) => update({ birthday: e.target.value })} /></label>
        <div>
          <div className="text-xs text-muted mb-1">Geschlecht</div>
          <Segmented value={s.sex || 'x'} onChange={(v) => update({ sex: v })}
            options={[{ value: 'm', label: 'Männlich' }, { value: 'f', label: 'Weiblich' }, { value: 'x', label: 'Divers / k. A.' }]} />
        </div>
        <label className="block text-xs text-muted">Größe in cm {s.heightCm ? `(${formatHeight(s.heightCm, s.lengthUnit)})` : ''}
          <input inputMode="decimal" className={`${inputCls} mt-1`} value={h || (s.heightCm ?? '')}
            onChange={(e) => { setH(e.target.value); const n = Number(e.target.value.replace(',', '.')); update({ heightCm: n > 0 ? n : null }) }} /></label>
      </Card>
    </Page>
  )
}

export function LibraryPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const all = useAllExercises()
  const [q, setQ] = useState('')
  const [m, setM] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Partial<Record<LibraryGroup, boolean>>>({})
  const [info, setInfo] = useState<Exercise | null>(null)
  const [creating, setCreating] = useState(false)
  const [barHidden, setBarHidden] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const fromMore = (loc.state as { fromMore?: boolean } | null)?.fromMore === true

  // Suchfeld unten: beim Runterscrollen ausblenden, beim leichten Hochscrollen wieder einblenden
  useEffect(() => {
    const sc = root.current?.closest('.overflow-y-auto') as HTMLElement | null
    if (!sc) return
    let last = sc.scrollTop
    const onScroll = () => {
      const y = sc.scrollTop
      if (y > last + 6 && y > 80) setBarHidden(true)
      else if (y < last - 4) setBarHidden(false)
      last = y
    }
    sc.addEventListener('scroll', onScroll, { passive: true })
    return () => sc.removeEventListener('scroll', onScroll)
  }, [])

  const filtered = all.filter((e) => searchText(e).includes(q.trim().toLowerCase())
    && (m === null || (m === 'cardio' ? e.cardio : e.primary.includes(m as MuscleId))))
  const groups = groupExercises(filtered)

  return (
    <Page title="Übungen" back={fromMore ? () => nav('/more') : undefined}
      right={<button onClick={() => setCreating(true)} aria-label="Eigene Übung anlegen" className="text-accent text-2xl leading-none px-1">+</button>}>
      <div ref={root} className="space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4" role="group" aria-label="Muskelgruppen filtern">
          {MUSCLES.map((x) => (
            <button key={x.id} onClick={() => setM(m === x.id ? null : x.id)} title={x.label} aria-label={x.label} aria-pressed={m === x.id}
              className="shrink-0 w-[60px] flex flex-col items-center gap-1">
              <span className={cx('rounded-2xl p-0.5 border-2', m === x.id ? 'border-accent' : 'border-transparent opacity-80')}>
                <MuscleThumb primary={[x.id]} secondary={[]} size={46} />
              </span>
              <span className={cx('text-2xs leading-tight w-full text-center truncate', m === x.id ? 'text-fg font-semibold' : 'text-muted')}>{x.label}</span>
            </button>
          ))}
          <button onClick={() => setM(m === 'cardio' ? null : 'cardio')} title="Cardio" aria-label="Cardio" aria-pressed={m === 'cardio'}
            className="shrink-0 w-[60px] flex flex-col items-center gap-1">
            <span className={cx('rounded-2xl p-0.5 border-2', m === 'cardio' ? 'border-accent' : 'border-transparent opacity-80')}>
              <span className="rounded-xl bg-surface border border-line flex items-center justify-center text-2xl" style={{ width: 46, height: 46 }}>🏃</span>
            </span>
            <span className={cx('text-2xs leading-tight w-full text-center truncate', m === 'cardio' ? 'text-fg font-semibold' : 'text-muted')}>Cardio</span>
          </button>
        </div>

        {groups.map((g) => {
          const open = expanded[g.id] === true
          const shown = open ? g.items : g.items.slice(0, GROUP_PREVIEW)
          const rest = g.items.length - GROUP_PREVIEW
          return (
            <section key={g.id} className="space-y-1">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{g.label}</h2>
                {rest > 0 && (
                  <LinkButton onClick={() => setExpanded((x) => ({ ...x, [g.id]: !open }))} aria-expanded={open}>
                    {open ? de.more.seeLess : de.more.seeMore(rest)}
                  </LinkButton>
                )}
              </div>
              <Card className="!py-1">
                <ul className="divide-y divide-line">
                  {shown.map((e) => (
                    <li key={e.id}>
                      <button className="w-full py-3 flex items-center gap-3 text-left" onClick={() => setInfo(e)}>
                        <ExercisePhoto ex={e} size={44} />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{e.name}</span>
                          <span className="block text-xs text-muted">
                            {e.cardio ? 'Cardio' : [...e.primary.map(muscleLabel), ...e.secondary.map((s) => `(${muscleLabel(s)})`)].join(' · ')}
                            {' · '}{EQUIPMENT_LABEL[e.equipment as Equipment]}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )
        })}
        {groups.length === 0 && <p className="text-sm text-muted text-center py-8">Keine Übungen gefunden</p>}
        <div className="h-16" aria-hidden />
      </div>

      <div className="fixed inset-x-0 z-30 px-4 transition-all duration-200"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom) * 0.45)', transform: barHidden ? 'translateY(160%)' : 'none', opacity: barHidden ? 0 : 1, pointerEvents: barHidden ? 'none' : 'auto' }}>
        <div className="max-w-2xl mx-auto">
          <input className={`${inputCls} shadow-lg !rounded-full !px-4`} placeholder="Übung suchen…" value={q} aria-label="Übung suchen"
            onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <ExerciseDetail ex={info} onClose={() => setInfo(null)} />
      <ExerciseFormSheet open={creating} onClose={() => setCreating(false)} initial={null} />
    </Page>
  )
}

export function DataPage() {
  const nav = useNavigate()
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const hFile = useRef<HTMLInputElement>(null)
  const pFile = useRef<HTMLInputElement>(null)
  const [resetOpen, setResetOpen] = useState(false)

  const doExport = async () => {
    downloadText(`liftlab-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportAll(), 'application/json')
    setMsg('Backup exportiert')
  }
  const [csvFrom, setCsvFrom] = useState('')
  const [csvTo, setCsvTo] = useState('')
  const [csvEx, setCsvEx] = useState<Exercise | null>(null)
  const [csvPick, setCsvPick] = useState(false)
  const allEx = useAllExercises()
  const csvExport = async () => {
    if (csvFrom && csvTo && csvFrom > csvTo) { setMsg('Fehler: „Von“ liegt nach „Bis“.'); return }
    const csv = await exportSessionsCsv({ from: csvFrom || undefined, to: csvTo || undefined, exerciseIds: csvEx ? [csvEx.id] : undefined })
    if (csv.trim().split('\n').length < 2) { setMsg('Keine Einheiten im gewählten Zeitraum bzw. mit dieser Übung.'); return }
    downloadText(`liftlab-einheiten-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv')
    setMsg('Einheiten als CSV exportiert')
  }
  const doProgramImport = async (f?: File) => {
    if (!f) return
    try {
      const r = await importProgramJson(await f.text())
      setMsg(`Programm importiert (inaktiv)${r.added ? `, ${r.added} eigene Übung${r.added > 1 ? 'en' : ''} angelegt` : ''}`)
      nav(`/program/${r.id}`)
    } catch (e) { setMsg(`Fehler: ${(e as Error).message}`) }
  }
  const doImport = async (f?: File) => {
    if (!f) return
    if (!confirm('Alle aktuellen Daten werden durch das Backup ersetzt. Fortfahren?')) return
    try { await importAll(await f.text()); setMsg('Backup importiert') } catch (e) { setMsg(`Fehler: ${(e as Error).message}`) }
  }
  const doHealth = async (f?: File) => {
    if (!f) return
    const rows = await parseWeightFile(f)
    for (const r of rows) await setWeight(r.date, r.kg, 'import')
    setMsg(`${rows.length} Gewichtswerte importiert`)
  }
  return (
    <Page title="Daten" back={() => nav('/more')}>
      <Card className="space-y-3">
        <p className="text-sm text-muted">Alle Daten liegen nur lokal auf diesem Gerät. Erstelle regelmäßig ein Backup.</p>
        <Button className="w-full" onClick={doExport}>Backup exportieren (JSON)</Button>
        <input ref={file} type="file" accept=".json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
        <Button variant="ghost" className="w-full" onClick={() => file.current?.click()}>Backup importieren</Button>
      </Card>
      <Card className="space-y-3">
        <p className="text-sm text-muted">Einheiten als CSV (eine Zeile pro Satz) exportieren, z. B. für Tabellen, wahlweise nur ein Zeitraum oder eine Übung. Das Format passt zum Trainingsimport unten.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted">Von
            <input type="date" className={`${inputCls} mt-1`} value={csvFrom} onChange={(e) => setCsvFrom(e.target.value)} />
          </label>
          <label className="block text-xs text-muted">Bis
            <input type="date" className={`${inputCls} mt-1`} value={csvTo} onChange={(e) => setCsvTo(e.target.value)} />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setCsvPick(true)}>{csvEx ? csvEx.name : 'Alle Übungen'}</Button>
          {csvEx && <button onClick={() => setCsvEx(null)} aria-label="Übungsfilter entfernen" className="text-muted p-2">✕</button>}
        </div>
        <ExercisePicker open={csvPick} onClose={() => setCsvPick(false)} exercises={allEx} title="Nur eine Übung exportieren" onPick={(e) => { setCsvEx(e); setCsvPick(false) }} />
        <Button variant="ghost" className="w-full" onClick={csvExport}>Einheiten exportieren (CSV)</Button>
      </Card>
      <Card className="space-y-3">
        <p className="text-sm text-muted">Ein einzelnes Programm aus einer Datei importieren (Export über das Menü der Programm-Seite). Es wird als inaktives Programm angelegt.</p>
        <input ref={pFile} type="file" accept=".json" className="hidden" onChange={(e) => { void doProgramImport(e.target.files?.[0]); e.target.value = '' }} />
        <Button variant="ghost" className="w-full" onClick={() => pFile.current?.click()}>Programm importieren</Button>
      </Card>
      <Card className="space-y-3">
        <TrainingImportCard onDone={setMsg} />
      </Card>
      <Card className="space-y-3">
        <p className="text-sm text-muted">Gewicht aus Apple-Health-Export (export.xml) oder CSV importieren.</p>
        <input ref={hFile} type="file" accept=".xml,.csv,.txt" className="hidden" onChange={(e) => doHealth(e.target.files?.[0])} />
        <Button variant="ghost" className="w-full" onClick={() => hFile.current?.click()}>Gewichtsdaten importieren</Button>
      </Card>
      {msg && <div className="text-sm text-accent">{msg}</div>}
      <Card className="space-y-3">
        <p className="text-sm text-muted">Löscht alle Daten von diesem Gerät. Erstelle vorher ein Backup.</p>
        <Button variant="danger" className="w-full" onClick={() => setResetOpen(true)}>Alle Daten zurücksetzen</Button>
      </Card>

      <BottomSheet open={resetOpen} onClose={() => setResetOpen(false)} title="Alle Daten zurücksetzen?">
        <p className="text-sm text-muted mb-4">
          Programme, Workouts, Körpergewicht, Maße, eigene Übungen und Einstellungen werden dauerhaft von diesem Gerät gelöscht.
          Das lässt sich nicht rückgängig machen.
        </p>
        <div className="space-y-2">
          <Button variant="ghost" className="w-full" onClick={() => { setResetOpen(false); doExport() }}>Erst ein Backup erstellen</Button>
          <Button variant="danger" className="w-full" onClick={async () => { await resetAllData(); setResetOpen(false); nav('/', { replace: true }) }}>Endgültig löschen</Button>
          <Button variant="ghost" className="w-full" onClick={() => setResetOpen(false)}>Abbrechen</Button>
        </div>
      </BottomSheet>
    </Page>
  )
}

export function AboutPage() {
  const nav = useNavigate()
  return (
    <Page title="About" back={() => nav('/more')}>
      <Card className="space-y-2 text-sm">
        <div className="text-lg font-bold">Lift Lab</div>
        <div className="text-muted">Version {APP_VERSION}</div>
        <p>Eigenständige Trainings-App mit regelbasierter Progression (Double Progression, e1RM, RIR). Alle Daten bleiben auf deinem Gerät.</p>
        <p className="text-muted text-xs">Die Vorschläge sind allgemeine Trainingsheuristiken und ersetzen keine individuelle Beratung durch Trainer:innen oder Ärzt:innen.</p>
      </Card>
      <Card className="space-y-2 text-sm">
        <div className="font-semibold">Quellen</div>
        <p className="text-muted text-xs">Übungsbilder (und ausgewählte Texte) stammen aus dem Projekt „free-exercise-db-with-videos“ (MIT-Lizenz, © 2026 Arham Wani). Muskelfiguren und Anleitungen sind eigene Arbeit.</p>
      </Card>
      <Button variant="danger" className="w-full" onClick={() => { void resetSettings() }}>Einstellungen zurücksetzen</Button>
    </Page>
  )
}

export function HelpPage() {
  const nav = useNavigate()
  const items: [string, string][] = [
    ['Was ist RIR?', 'Reps in Reserve: Wie viele Wiederholungen du am Satzende noch geschafft hättest. RIR 2 heißt: noch zwei saubere Wiederholungen möglich.'],
    ['Wie berechnet die App den nächsten Vorschlag?', 'Double Progression: Erreichst du in allen Sätzen das obere Ende des Wiederholungsbereichs, steigt das Gewicht und die Wiederholungen starten wieder unten. Sonst wird eine Wiederholung mehr vorgeschlagen. Trägst du etwas anderes ein, wird aus deinem geschätzten 1RM (Epley) neu gerechnet.'],
    ['Was ist ein Deload?', 'Eine Entlastungswoche mit etwa halbem Satzvolumen und mehr Reserve, damit sich der Körper erholt. Kommt nach jeweils 4–6 Trainingswochen (im Wizard wählbar). Der Deload ist optional (im Programm abschaltbar): die Studienlage dafür ist schwach, eine Woche Pause brachte in einer Studie (Coleman et al. 2024) keinen Vorteil bei der Muskelgröße.'],
    ['Rep-Range-Verlauf', 'Static: gleich. Linear: Wiederholungen sinken, Gewichte steigen. Reverse Linear: umgekehrt. Undulating: wöchentlicher Wechsel zwischen schwer und leicht. Wechselnde Bereiche: enge Bereiche (3 Wdh.), die jede Übung wöchentlich wechselt; in der letzten Blockwoche geht der letzte Satz bis zum Versagen.'],
    ['Wochenzyklus', 'Hake Workouts durch Beenden und Ruhetage selbst ab. Sind alle 7 Tage erledigt, startet eine neue Woche bei Workout A mit neu berechneten Zielen.'],
    ['Apple Health / Health Connect', 'Direkter Zugriff ist in einer Web-App technisch nicht möglich. Importiere stattdessen den Health-Export (export.xml) oder eine CSV-Datei.'],
  ]
  return (
    <Page title="Hilfe" back={() => nav('/more')}>
      {items.map(([q, a]) => <Card key={q}><div className="font-semibold text-sm mb-1">{q}</div><p className="text-sm text-muted">{a}</p></Card>)}
    </Page>
  )
}
