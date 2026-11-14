import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Equipment, Settings } from '../../types'
import { Button, Card, Chip, Page, Segmented, inputCls } from '../../components/ui'
import { DEFAULT_SETTINGS, exportAll, importAll, parseWeightImport, saveSettings, setWeight, useAllExercises, useSettings } from '../../db/db'
import { EQUIPMENT_LABEL } from '../../data/exercises'
import { MUSCLES, muscleLabel } from '../../data/muscles'
import { formatHeight } from '../../utils/units'

export const APP_VERSION = '0.1.0'

function Row({ label, desc, to }: { label: string; desc?: string; to: string }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav(to)} className="w-full flex items-center justify-between py-3.5 text-left">
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
  const all = useAllExercises()
  const [q, setQ] = useState('')
  const [m, setM] = useState('all')
  const list = all.filter((e) => e.name.toLowerCase().includes(q.toLowerCase())
    && (m === 'all' || (m === 'cardio' ? e.cardio : e.primary.includes(m as never))))
  return (
    <Page title="Übungen">
      <input className={inputCls} placeholder="Suchen…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <Chip active={m === 'all'} onClick={() => setM('all')}>Alle</Chip>
        <Chip active={m === 'cardio'} onClick={() => setM('cardio')}>Cardio</Chip>
        {MUSCLES.map((x) => <Chip key={x.id} active={m === x.id} onClick={() => setM(x.id)}>{x.label}</Chip>)}
      </div>
      <Card className="!py-1">
        <ul className="divide-y divide-line">
          {list.map((e) => (
            <li key={e.id} className="py-3">
              <div className="text-sm font-medium">{e.name}</div>
              <div className="text-xs text-muted">
                {e.cardio ? 'Cardio' : [...e.primary.map(muscleLabel), ...e.secondary.map((s) => `(${muscleLabel(s)})`)].join(' · ')}
                {' · '}{EQUIPMENT_LABEL[e.equipment as Equipment]}
              </div>
            </li>
          ))}
        </ul>
      </Card>
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
