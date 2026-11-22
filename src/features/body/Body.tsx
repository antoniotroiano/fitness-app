import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MeasureSite } from '../../types'
import { Button, Card, Page, cx, inputCls } from '../../components/ui'
import { db, parseWeightFile, saveBodyEntry, setWeight, useMeasures, useSettings, useWeights } from '../../db/db'
import { EntrySheet } from './EntrySheet'
import { cmToDisplay, displayToCm, displayToKg, kgToDisplay } from '../../utils/units'
import { formatDate, todayStr } from '../../utils/dates'
import { trendSeries } from '../../engine/body'
import { streakDays } from '../../engine/habits'
import { CalendarLegend, MonthCalendar } from '../dashboard/widgets'
import { TimeSeries } from '../stats/TimeSeries'
import { de } from '../../i18n/de'

export function WeightPage() {
  const nav = useNavigate()
  const weights = useWeights()
  const settings = useSettings()
  const [date, setDate] = useState(todayStr())
  const [value, setValue] = useState('')
  const [msg, setMsg] = useState('')
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const u = settings.weightUnit

  const points = useMemo(() => weights.map((w) => ({ date: w.date, value: w.kg })), [weights])
  const trend = useMemo(() => trendSeries(points), [points])
  const dates = useMemo(() => new Set(weights.map((w) => w.date)), [weights])
  const latest = weights.at(-1)
  const todayW = weights.find((w) => w.date === todayStr())

  const save = async () => {
    const n = Number(value.replace(',', '.'))
    if (!n || n <= 0) return
    await saveBodyEntry(date, { kg: Math.round(displayToKg(n, u) * 10) / 10 })
    setValue('')
  }

  const onImport = async (f: File | undefined) => {
    if (!f) return
    const rows = await parseWeightFile(f)
    for (const r of rows) await setWeight(r.date, r.kg, 'import')
    setMsg(rows.length ? `${rows.length} Einträge importiert` : 'Keine Gewichtswerte in der Datei gefunden')
  }

  return (
    <Page title="Körpergewicht" back={() => nav(-1)}>
      <Card className="flex items-center justify-between">
        <div><div className="text-xs text-muted">Heute</div><div className="text-lg font-bold">{todayW ? `${kgToDisplay(todayW.kg, u)} ${u}` : `-- ${u}`}</div></div>
        <div className="text-right"><div className="text-xs text-muted">{de.common.streak}</div><div className="text-lg font-bold">{streakDays(dates, todayStr())} Tage</div></div>
      </Card>
      <Card className="space-y-3">
        <div className="flex gap-2">
          <input type="date" className={inputCls} value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          <input inputMode="decimal" className={inputCls} placeholder={u} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button className="w-full" onClick={save}>Eintragen</Button>
        {latest && <div className="text-xs text-muted">Zuletzt: {kgToDisplay(latest.kg, u)} {u} am {formatDate(latest.date)}{trend.length > 1 && <> · Trend {kgToDisplay(trend.at(-1)!.value, u)} {u}</>}</div>}
      </Card>

      <Card><MonthCalendar tracked={dates} today={todayStr()} color="var(--habit-weight)" onSelect={setSheetDate} /><CalendarLegend color="var(--habit-weight)" /></Card>
      <EntrySheet date={sheetDate} today={todayStr()} entry={weights.find((w) => w.date === sheetDate)} unit={u} onClose={() => setSheetDate(null)} />

      <Card className="space-y-3">
        <TimeSeries daily={points} trend={trend} bar={false} fmt={(v) => `${kgToDisplay(v, u)}`} defaultPeriod="3M" showAveraging={false} />
        <p className="text-xs text-muted">Punkte = Messwerte, Linie = Trend (geglättet, gleicht Tagesschwankungen aus). Der Körpergewichtsanteil bei Klimmzügen, Dips und Co. rechnet mit dem Trend.</p>
      </Card>

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
                  <b>{kgToDisplay(w.kg, u)} {u}{w.bodyFat != null && <span className="text-muted font-normal"> · {w.bodyFat} %</span>}</b>
                  <button className="text-danger text-xs" onClick={() => w.id && db.weights.delete(w.id)}>Löschen</button>
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
    { id: 'neck', label: 'Hals' }, { id: 'shoulders', label: 'Schultern' }, { id: 'bust', label: 'Brustumfang' },
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
        <TimeSeries daily={series} bar={false} fmt={(v) => `${cmToDisplay(v, u)}`} defaultPeriod="3M" showAveraging={false} />
      </Card>
      <p className="text-xs text-muted">Werte werden intern in cm gespeichert.</p>
    </Page>
  )
}
