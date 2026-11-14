import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MeasureSite } from '../../types'
import { Button, Card, Chip, Page, cx, inputCls } from '../../components/ui'
import { db, parseWeightImport, setWeight, useMeasures, useSettings, useWeights } from '../../db/db'
import { cmToDisplay, displayToCm, displayToKg, kgToDisplay } from '../../utils/units'
import { formatDate, parse, todayStr, fmt as fmtDate } from '../../utils/dates'
import { filterPeriod, type Period } from '../../engine/stats'
import { SeriesChart } from '../stats/StatsView'

export function WeightCalendar({ dates }: { dates: Set<string> }) {
  const [offset, setOffset] = useState(0)
  const base = parse(todayStr())
  base.setMonth(base.getMonth() + offset, 1)
  const first = new Date(base)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => fmtDate(new Date(base.getFullYear(), base.getMonth(), i + 1)))]
  const today = todayStr()
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button className="px-3 text-xl text-accent" onClick={() => setOffset(offset - 1)} aria-label="Vorheriger Monat">‹</button>
        <span className="text-sm font-semibold">{base.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
        <button className="px-3 text-xl text-accent" onClick={() => setOffset(offset + 1)} aria-label="Nächster Monat">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted mb-1">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => d ? (
          <div key={d} className={cx('aspect-square rounded-lg flex items-center justify-center text-xs border',
            dates.has(d) ? 'bg-accent text-slate-900 border-accent font-bold' : d <= today ? 'border-line text-muted' : 'border-transparent text-muted/50')}>
            {Number(d.slice(8))}
          </div>
        ) : <div key={`e${i}`} />)}
      </div>
    </div>
  )
}

export function WeightPage() {
  const nav = useNavigate()
  const weights = useWeights()
  const settings = useSettings()
  const [date, setDate] = useState(todayStr())
  const [value, setValue] = useState('')
  const [period, setPeriod] = useState<Period>('3M')
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const u = settings.weightUnit

  const points = useMemo(() => filterPeriod(weights.map((w) => ({ date: w.date, value: w.kg })), period), [weights, period])
  const dates = useMemo(() => new Set(weights.map((w) => w.date)), [weights])
  const latest = weights.at(-1)

  const save = async () => {
    const n = Number(value.replace(',', '.'))
    if (!n || n <= 0) return
    await setWeight(date, Math.round(displayToKg(n, u) * 10) / 10)
    setValue('')
  }

  const onImport = async (f: File | undefined) => {
    if (!f) return
    const text = await f.text()
    const rows = parseWeightImport(text)
    for (const r of rows) await setWeight(r.date, r.kg, 'import')
    setMsg(rows.length ? `${rows.length} Einträge importiert` : 'Keine Gewichtswerte in der Datei gefunden')
  }

  return (
    <Page title="Körpergewicht" back={() => nav(-1)}>
      <Card className="space-y-3">
        <div className="flex gap-2">
          <input type="date" className={inputCls} value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          <input inputMode="decimal" className={inputCls} placeholder={u} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button className="w-full" onClick={save}>Eintragen</Button>
        {latest && <div className="text-xs text-muted">Zuletzt: {kgToDisplay(latest.kg, u)} {u} am {formatDate(latest.date)}</div>}
      </Card>

      <Card className="space-y-3">
        <SeriesChart points={points} bar={false} daily fmt={(v) => `${kgToDisplay(v, u)}`} />
        <div className="flex gap-1.5 flex-wrap">
          {(['1M', '3M', '6M', '1Y', 'All'] as Period[]).map((p) => <Chip key={p} active={p === period} onClick={() => setPeriod(p)}>{p}</Chip>)}
        </div>
      </Card>

      <Card><WeightCalendar dates={dates} /></Card>

      <Card className="space-y-2">
        <div className="font-semibold text-sm">Import</div>
        <p className="text-xs text-muted">
          Direkter Zugriff auf Apple Health oder Health Connect ist in einer Web-App nicht möglich. Du kannst aber den
          Apple-Health-Export (export.xml) oder eine CSV-Datei (Datum,kg je Zeile) importieren.
        </p>
        <input ref={file} type="file" accept=".xml,.csv,.txt" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
        <Button variant="ghost" onClick={() => file.current?.click()}>Datei wählen</Button>
        {msg && <div className="text-xs text-accent">{msg}</div>}
      </Card>

      {weights.length > 0 && (
        <Card>
          <div className="font-semibold text-sm mb-2">Einträge</div>
          <ul className="divide-y divide-line">
            {[...weights].reverse().slice(0, 30).map((w) => (
              <li key={w.id} className="flex justify-between items-center py-2 text-sm">
                <span>{formatDate(w.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="flex items-center gap-3">
                  <b>{kgToDisplay(w.kg, u)} {u}</b>
                  <button className="text-red-500 text-xs" onClick={() => w.id && db.weights.delete(w.id)}>Löschen</button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  )
}

const SITES: { region: string; items: { id: MeasureSite; label: string }[] }[] = [
  { region: 'Oberkörper', items: [
    { id: 'neck', label: 'Hals' }, { id: 'shoulders', label: 'Schultern' }, { id: 'bust', label: 'Bust' },
    { id: 'chest', label: 'Brust' }, { id: 'waist', label: 'Taille' },
    { id: 'bicepsL', label: 'Bizeps links' }, { id: 'bicepsR', label: 'Bizeps rechts' },
    { id: 'forearmL', label: 'Unterarm links' }, { id: 'forearmR', label: 'Unterarm rechts' },
    { id: 'wristL', label: 'Handgelenk links' }, { id: 'wristR', label: 'Handgelenk rechts' },
  ] },
  { region: 'Unterkörper', items: [
    { id: 'hips', label: 'Hüfte' },
    { id: 'thighL', label: 'Oberschenkel links' }, { id: 'thighR', label: 'Oberschenkel rechts' },
    { id: 'calfL', label: 'Wade links' }, { id: 'calfR', label: 'Wade rechts' },
    { id: 'ankleL', label: 'Knöchel links' }, { id: 'ankleR', label: 'Knöchel rechts' },
  ] },
]

export function MeasuresPage() {
  const nav = useNavigate()
  const measures = useMeasures()
  const settings = useSettings()
  const u = settings.lengthUnit
  const [vals, setVals] = useState<Partial<Record<MeasureSite, string>>>({})
  const [site, setSite] = useState<MeasureSite>('waist')

  const save = async () => {
    const values: Partial<Record<MeasureSite, number>> = {}
    for (const [k, v] of Object.entries(vals)) {
      const n = Number(String(v).replace(',', '.'))
      if (n > 0) values[k as MeasureSite] = Math.round(displayToCm(n, u) * 10) / 10
    }
    if (!Object.keys(values).length) return
    const date = todayStr()
    const existing = await db.measures.where('date').equals(date).first()
    if (existing?.id) await db.measures.update(existing.id, { values: { ...existing.values, ...values } })
    else await db.measures.add({ date, values })
    setVals({})
  }

  const series = measures.filter((m) => m.values[site] != null).map((m) => ({ date: m.date, value: m.values[site]! }))
  const last = (id: MeasureSite) => [...measures].reverse().find((m) => m.values[id] != null)?.values[id]
  const label = SITES.flatMap((s) => s.items).find((i) => i.id === site)?.label

  return (
    <Page title="Körpermaße" back={() => nav(-1)}>
      {SITES.map((g) => (
        <Card key={g.region} className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted">{g.region}</div>
          {g.items.map((i) => (
            <div key={i.id} className="flex items-center gap-3">
              <button className={cx('flex-1 text-left text-sm', site === i.id && 'text-accent font-semibold')} onClick={() => setSite(i.id)}>
                {i.label}
                {last(i.id) != null && <span className="text-xs text-muted ml-2">zuletzt {cmToDisplay(last(i.id)!, u)} {u}</span>}
              </button>
              <input inputMode="decimal" className={`${inputCls} !w-24`} placeholder={u} value={vals[i.id] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [i.id]: e.target.value }))} />
            </div>
          ))}
        </Card>
      ))}
      <Button className="w-full" onClick={save}>Speichern (heute, {formatDate(todayStr())})</Button>

      <Card className="space-y-2">
        <div className="font-semibold text-sm">Verlauf: {label}</div>
        <SeriesChart points={series} bar={false} daily fmt={(v) => `${cmToDisplay(v, u)}`} />
      </Card>
      <p className="text-xs text-muted">Werte werden intern in cm gespeichert.</p>
    </Page>
  )
}
