import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Equipment, Exercise, MuscleId, Settings } from '../../types'
import { Button, Card, Page, Segmented, cx, inputCls } from '../../components/ui'
import { DEFAULT_SETTINGS, exportAll, importAll, parseWeightImport, saveSettings, setWeight, useAllExercises, useSettings } from '../../db/db'
import { EQUIPMENT_LABEL } from '../../data/exercises'
import { MUSCLES, muscleLabel } from '../../data/muscles'
import { formatHeight } from '../../utils/units'
import { ExerciseInfoSheet } from '../workouts/ExerciseInfoSheet'
import { ExerciseThumb } from '../../components/ExerciseThumb'
import { MuscleThumb } from '../../components/MuscleFigure'
import { GROUP_PREVIEW, groupExercises, type LibraryGroup } from '../../engine/library'
import { DEFAULT_REST, REST_CATEGORIES, REST_LABEL, formatRest } from '../../engine/rest'

export const APP_VERSION = '0.1.0'

function Row({ label, desc, to }: { label: string; desc?: string; to: string }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav(to, { state: { fromMore: true } })} className="w-full flex items-center justify-between py-3.5 text-left">
      <span><span className="block text-sm font-medium">{label}</span>{desc && <span className="block text-xs text-muted">{desc}</span>}</span>
      <span className="text-muted">›</span>
    </button>
  )
}

export default function More() {
  return (
    <Page title="More">
      <Card className="divide-y divide-line !py-1">
        <Row label="Einstellungen" desc="Design, Einheiten, Zeitformat" to="/more/settings" />
        <Row label="Profil" desc="Name, Geburtstag, Geschlecht, Größe" to="/more/profile" />
        <Row label="Körpergewicht" to="/weight" />
        <Row label="Körpermaße" to="/measures" />
        <Row label="Alle Übungen" desc="Übungsbibliothek durchsuchen" to="/more/library" />
        <Row label="Daten" desc="Backup, Export, Import" to="/more/data" />
        <Row label="Hilfe" to="/more/help" />
        <Row label="About" to="/more/about" />
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

export function SettingsPage() {
  const nav = useNavigate()
  const { s, update } = useSettingsForm()
  const group = (title: string, el: React.ReactNode) => (
    <Card className="space-y-3"><div className="text-xs uppercase tracking-wide text-muted">{title}</div>{el}</Card>
  )
  return (
    <Page title="Einstellungen" back={() => nav('/more')}>
      {group('Design', <Segmented value={s.theme} onChange={(v) => update({ theme: v })}
        options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Hell' }, { value: 'dark', label: 'Dunkel' }]} />)}
      {group('Gewicht', <Segmented value={s.weightUnit} onChange={(v) => update({ weightUnit: v })}
        options={[{ value: 'kg', label: 'Kilogramm' }, { value: 'lb', label: 'Pounds' }]} />)}
      {group('Länge', <Segmented value={s.lengthUnit} onChange={(v) => update({ lengthUnit: v })}
        options={[{ value: 'cm', label: 'Zentimeter' }, { value: 'in', label: 'Inch / Feet' }]} />)}
      {group('Distanz', <Segmented value={s.distanceUnit} onChange={(v) => update({ distanceUnit: v })}
        options={[{ value: 'km', label: 'km / m' }, { value: 'mi', label: 'Meilen / Yards' }]} />)}
      {group('Zeitformat', <Segmented value={s.clock} onChange={(v) => update({ clock: v })}
        options={[{ value: '24h', label: '24 h' }, { value: '12h', label: '12 h' }]} />)}
      {group('Aufwärmen', (
        <div className="space-y-2">
          <Segmented value={s.warmupsEnabled ? 'on' : 'off'} onChange={(v) => update({ warmupsEnabled: v === 'on' })}
            options={[{ value: 'on', label: 'Vorschlagen' }, { value: 'off', label: 'Aus' }]} />
          <p className="text-xs text-muted">Aufwärmsätze werden aus dem Arbeitsgewicht berechnet: bei der ersten Verbundübung einer Muskelgruppe 3 Sätze, sonst weniger oder keine. Das ist eine praxisnahe Heuristik, die Studienlage zur Satzzahl ist dünn.</p>
        </div>
      ))}
      {group('Pausen', (
        <div className="space-y-3">
          {REST_CATEGORIES.map((c) => (
            <Stepper key={c} label={REST_LABEL[c]} value={s.restSeconds[c]} onChange={(v) => update({ restSeconds: { ...s.restSeconds, [c]: v } })} />
          ))}
          <Stepper label="Nach Aufwärmsatz (Verbund)" value={s.warmupRestCompound} onChange={(v) => update({ warmupRestCompound: v })} />
          <Stepper label="Nach Aufwärmsatz (sonst)" value={s.warmupRestOther} onChange={(v) => update({ warmupRestOther: v })} />
          <p className="text-xs text-muted">Richtwerte aus der Studienlage: Verbundübungen 2-3 min, Isolation 1-2 min. Längere Pausen halten bei schweren Übungen Leistung und Volumen.</p>
          <Button variant="ghost" onClick={() => update({ restSeconds: DEFAULT_REST, warmupRestCompound: 90, warmupRestOther: 45 })}>Standard wiederherstellen</Button>
        </div>
      ))}
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
                        <ExerciseThumb ex={e} size={44} />
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
        style={{ bottom: 'calc(5.75rem + env(safe-area-inset-bottom))', transform: barHidden ? 'translateY(160%)' : 'none', opacity: barHidden ? 0 : 1, pointerEvents: barHidden ? 'none' : 'auto' }}>
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
