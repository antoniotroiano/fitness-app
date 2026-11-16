import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Equipment, Exercise, MuscleId, Settings } from '../../types'
import { BottomSheet, Button, Card, Page, Segmented, cx, inputCls } from '../../components/ui'
import { DEFAULT_SETTINGS, exportAll, importAll, parseWeightImport, resetAllData, saveSettings, setWeight, useAllExercises, useSettings } from '../../db/db'
import { EQUIPMENT_LABEL } from '../../data/exercises'
import { MUSCLES, muscleLabel } from '../../data/muscles'
import { formatHeight } from '../../utils/units'
import { ExerciseInfoSheet } from '../workouts/ExerciseInfoSheet'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import { Icon, type IconName } from '../../components/icons'
import { MuscleThumb } from '../../components/MuscleFigure'
import { GROUP_PREVIEW, groupExercises, type LibraryGroup } from '../../engine/library'
import { DEFAULT_REST, REST_CATEGORIES, REST_LABEL, formatRest } from '../../engine/rest'

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
  { value: 'system', label: 'System Default', bg: 'linear-gradient(135deg, #f5f6f8 50%, #0b1020 50%)' },
  { value: 'light', label: 'Light', bg: '#f5f6f8' },
  { value: 'dark', label: 'Dark', bg: '#0b1020' },
]

function ThemePicker({ value, onChange }: { value: Settings['theme']; onChange: (v: Settings['theme']) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-3" role="radiogroup" aria-label="Theme">
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
    <Page title="More">
      <Section title="General">
        <Row icon="profile" label="Profil" desc="Name, Geburtstag, Geschlecht, Größe" to="/more/profile" />
        <Row icon="units" label="Units" desc={`${s.weightUnit}, ${s.lengthUnit === 'in' ? 'in / ft' : 'cm'}, ${s.distanceUnit}, ${s.clock === '12h' ? '12 h' : '24 h'}`} to="/more/units" />
        <Option icon="language" label="Language" value={s.language} onChange={(v) => update({ language: v })}
          options={[{ value: 'de', label: 'DE' }, { value: 'en', label: 'EN' }]} />
        {s.language === 'en' && <p className="py-2 text-xs text-muted">English ist noch nicht verfügbar, die App bleibt vorerst auf Deutsch.</p>}
      </Section>

      <Section title="Feature Settings">
        <Row icon="workouts" label="Workouts" desc="Pause, Aufwärmen" to="/more/workouts" />
        <Row icon="library" label="Übungen" desc="Übungsbibliothek durchsuchen" to="/more/library" />
      </Section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-muted px-1">Theme</h2>
        <Card className="!py-1"><ThemePicker value={s.theme} onChange={(v) => update({ theme: v })} /></Card>
      </section>

      <Section title="Data Management">
        <Row icon="weight" label="Körpergewicht" to="/weight" />
        <Row icon="measures" label="Körpermaße" to="/measures" />
        <Row icon="data" label="Daten" desc="Backup, Import, Zurücksetzen" to="/more/data" />
      </Section>

      <Section title="Other">
        <Row icon="help" label="Hilfe" to="/more/help" />
        <Row icon="about" label="About" to="/more/about" />
      </Section>
    </Page>
  )
}

/** General → Units */
export function UnitsPage() {
  const nav = useNavigate()
  const { s, update } = useSettingsForm()
  return (
    <Page title="Units" back={() => nav('/more')}>
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
  const update = (p: Partial<Settings>) => saveSettings({ ...s, ...p })
  return { s, update }
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const btn = 'w-9 h-9 rounded-lg bg-surface2 border border-line text-lg'
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button className={btn} aria-label={`${label} kürzer`} onClick={() => onChange(Math.max(15, value - 15))}>−</button>
        <span className="w-16 text-center text-sm tabular-nums">{formatRest(value)}</span>
        <button className={btn} aria-label={`${label} länger`} onClick={() => onChange(Math.min(600, value + 15))}>+</button>
      </div>
    </div>
  )
}

/** Feature Settings → Workouts: Untermenü */
export function WorkoutSettingsPage() {
  const nav = useNavigate()
  return (
    <Page title="Workouts" back={() => nav('/more')}>
      <Card className="divide-y divide-line !py-1">
        <Row icon="timer" label="Pause" desc="Rest-Timer je Übungstyp" to="/more/workouts/rest" />
        <Row icon="warmup" label="Aufwärmen" desc="Aufwärmsätze vorschlagen" to="/more/workouts/warmup" />
      </Card>
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
        <Stepper label="Nach Aufwärmsatz (Verbund)" value={s.warmupRestCompound} onChange={(v) => update({ warmupRestCompound: v })} />
        <Stepper label="Nach Aufwärmsatz (sonst)" value={s.warmupRestOther} onChange={(v) => update({ warmupRestOther: v })} />
        <p className="text-xs text-muted">Richtwerte aus der Studienlage: Verbundübungen 2-3 min, Isolation 1-2 min. Längere Pausen halten bei schweren Übungen Leistung und Volumen.</p>
        <Button variant="ghost" onClick={() => update({ restSeconds: DEFAULT_REST, warmupRestCompound: 90, warmupRestOther: 45 })}>Standard wiederherstellen</Button>
      </Card>
    </Page>
  )
}

export function WarmupSettingsPage() {
  const nav = useNavigate()
  const { s, update } = useSettingsForm()
  return (
    <Page title="Aufwärmen" back={() => nav('/more/workouts')}>
      <Card className="space-y-2">
        <Segmented value={s.warmupsEnabled ? 'on' : 'off'} onChange={(v) => update({ warmupsEnabled: v === 'on' })}
          options={[{ value: 'on', label: 'Vorschlagen' }, { value: 'off', label: 'Aus' }]} />
        <p className="text-xs text-muted">Aufwärmsätze werden aus dem Arbeitsgewicht berechnet: bei der ersten Verbundübung einer Muskelgruppe 3 Sätze, sonst weniger oder keine. Das ist eine praxisnahe Heuristik, die Studienlage zur Satzzahl ist dünn.</p>
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

  const filtered = all.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase())
    && (m === null || (m === 'cardio' ? e.cardio : e.primary.includes(m as MuscleId))))
  const groups = groupExercises(filtered)

  return (
    <Page title="Übungen" back={fromMore ? () => nav('/more') : undefined}>
      <div ref={root} className="space-y-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4" role="group" aria-label="Muskelgruppen filtern">
          {MUSCLES.map((x) => (
            <button key={x.id} onClick={() => setM(m === x.id ? null : x.id)} title={x.label} aria-label={x.label} aria-pressed={m === x.id}
              className={cx('shrink-0 rounded-2xl p-0.5 border-2', m === x.id ? 'border-accent' : 'border-transparent opacity-80')}>
              <MuscleThumb primary={[x.id]} secondary={[]} size={46} />
            </button>
          ))}
          <button onClick={() => setM(m === 'cardio' ? null : 'cardio')} title="Cardio" aria-label="Cardio" aria-pressed={m === 'cardio'}
            className={cx('shrink-0 rounded-2xl p-0.5 border-2', m === 'cardio' ? 'border-accent' : 'border-transparent opacity-80')}>
            <span className="rounded-xl bg-surface border border-line flex items-center justify-center text-2xl" style={{ width: 46, height: 46 }}>🏃</span>
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
                  <button onClick={() => setExpanded((x) => ({ ...x, [g.id]: !open }))} className="text-sm text-accent" aria-expanded={open}>
                    {open ? 'See Less' : `See ${rest} More`}
                  </button>
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
      <ExerciseInfoSheet ex={info} open={info !== null} onClose={() => setInfo(null)} />
    </Page>
  )
}

export function DataPage() {
  const nav = useNavigate()
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const hFile = useRef<HTMLInputElement>(null)
  const [resetOpen, setResetOpen] = useState(false)

  const doExport = async () => {
    const blob = new Blob([await exportAll()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `liftlab-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMsg('Backup exportiert')
  }
  const doImport = async (f?: File) => {
    if (!f) return
    if (!confirm('Alle aktuellen Daten werden durch das Backup ersetzt. Fortfahren?')) return
    try { await importAll(await f.text()); setMsg('Backup importiert') } catch (e) { setMsg(`Fehler: ${(e as Error).message}`) }
  }
  const doHealth = async (f?: File) => {
    if (!f) return
    const rows = parseWeightImport(await f.text())
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
      <Button variant="danger" className="w-full" onClick={() => { saveSettings(DEFAULT_SETTINGS) }}>Einstellungen zurücksetzen</Button>
    </Page>
  )
}

export function HelpPage() {
  const nav = useNavigate()
  const items: [string, string][] = [
    ['Was ist RIR?', 'Reps in Reserve: Wie viele Wiederholungen du am Satzende noch geschafft hättest. RIR 2 heißt: noch zwei saubere Wiederholungen möglich.'],
    ['Wie berechnet die App den nächsten Vorschlag?', 'Double Progression: Erreichst du in allen Sätzen das obere Ende des Wiederholungsbereichs, steigt das Gewicht und die Wiederholungen starten wieder unten. Sonst wird eine Wiederholung mehr vorgeschlagen. Trägst du etwas anderes ein, wird aus deinem geschätzten 1RM (Epley) neu gerechnet.'],
    ['Was ist ein Deload?', 'Eine Entlastungswoche mit etwa halbem Satzvolumen und mehr Reserve, damit sich der Körper erholt. Kommt nach jeweils 4 Trainingswochen.'],
    ['Rep-Range-Verlauf', 'Static: gleich. Linear: Wiederholungen sinken, Gewichte steigen. Reverse Linear: umgekehrt. Undulating: wöchentlicher Wechsel zwischen schwer und leicht.'],
    ['Wochenzyklus', 'Hake Workouts durch Beenden und Ruhetage selbst ab. Sind alle 7 Tage erledigt, startet eine neue Woche bei Workout A mit neu berechneten Zielen.'],
    ['Apple Health / Health Connect', 'Direkter Zugriff ist in einer Web-App technisch nicht möglich. Importiere stattdessen den Health-Export (export.xml) oder eine CSV-Datei.'],
  ]
  return (
    <Page title="Hilfe" back={() => nav('/more')}>
      {items.map(([q, a]) => <Card key={q}><div className="font-semibold text-sm mb-1">{q}</div><p className="text-sm text-muted">{a}</p></Card>)}
    </Page>
  )
}
