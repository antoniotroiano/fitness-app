import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MeasureSite } from '../../types'
import { Button, Card, Page, Segmented, cx, inputCls } from '../../components/ui'
import { db, parseWeightFile, saveBodyEntry, setWeight, useMeasures, useSettings, useWeights } from '../../db/db'
import { EntrySheet } from './EntrySheet'
import { cmToDisplay, displayToCm, displayToKg, kgToDisplay } from '../../utils/units'
import { addDays, formatDate, todayStr } from '../../utils/dates'
import { compareRows, trendSeries, type CompareRow } from '../../engine/body'
import { bodyUnit, formatBody } from './format'
import { streakDays } from '../../engine/habits'
import { CalendarLegend, MonthCalendar } from '../dashboard/widgets'
import { TimeSeries } from '../stats/TimeSeries'
import { de } from '../../i18n/de'
import { t, LOCALE, lc } from '../../i18n'

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
  const trend = useMemo(() => trendSeries(points, settings.trendDays), [points, settings.trendDays])
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
    setMsg(rows.length ? t('{0} Einträge importiert', rows.length) : t('Keine Gewichtswerte in der Datei gefunden'))
  }

  return (
    <Page title={t('Körpergewicht')} back={() => nav(-1)}>
      <Card className="flex items-center justify-between">
        <div><div className="text-xs text-muted">{t('Heute')}</div><div className="text-lg font-bold">{todayW ? `${kgToDisplay(todayW.kg, u)} ${u}` : `-- ${u}`}</div></div>
        <div className="text-right"><div className="text-xs text-muted">{de.common.streak}</div><div className="text-lg font-bold">{streakDays(dates, todayStr())} {lc(t('Tage'))}</div></div>
      </Card>
      <Card className="space-y-3">
        <div className="flex gap-2">
          <input type="date" className={inputCls} value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          <input inputMode="decimal" className={inputCls} placeholder={u} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button className="w-full" onClick={save}>{t('Eintragen')}</Button>
        {latest && <div className="text-xs text-muted">{t('Zuletzt:')} {kgToDisplay(latest.kg, u)} {u} {t('am')} {formatDate(latest.date)}{trend.length > 1 && <> · Trend {kgToDisplay(trend.at(-1)!.value, u)} {u}</>}</div>}
      </Card>

      <Card><MonthCalendar tracked={dates} today={todayStr()} color="var(--habit-weight)" textColor="var(--on-habit-weight)" onSelect={setSheetDate} /><CalendarLegend color="var(--habit-weight)" /></Card>
      <EntrySheet date={sheetDate} today={todayStr()} entry={weights.find((w) => w.date === sheetDate)} unit={u} onClose={() => setSheetDate(null)} />

      <Card className="space-y-3">
        <TimeSeries daily={points} trend={trend} bar={false} lineColor="var(--c-weight)" fmt={(v) => `${kgToDisplay(v, u)}`} defaultPeriod="3M" showAveraging={false} />
        <p className="text-xs text-muted">{t('Punkte = Messwerte, Linie = Trend (geglättet, gleicht Tagesschwankungen aus). Der Körpergewichtsanteil bei Klimmzügen, Dips und Co. rechnet mit dem Trend.')}</p>
      </Card>

      <Card className="space-y-2">
        <div className="font-semibold text-sm">Import</div>
        <p className="text-xs text-muted">
          {t('Direkter Zugriff auf Apple Health oder Health Connect ist in einer Web-App nicht möglich. Du kannst aber den Apple-Health-Export (export.xml) oder eine CSV-Datei (Datum,kg je Zeile) importieren.')}
        </p>
        <input ref={file} type="file" accept=".xml,.csv,.txt" className="hidden" onChange={(e) => onImport(e.target.files?.[0])} />
        <Button variant="ghost" onClick={() => file.current?.click()}>{t('Datei wählen')}</Button>
        {msg && <div className="text-xs text-accent">{msg}</div>}
      </Card>

      {weights.length > 0 && (
        <Card>
          <div className="font-semibold text-sm mb-2">{t('Einträge')}</div>
          <ul className="divide-y divide-line">
            {[...weights].reverse().slice(0, 30).map((w) => (
              <li key={w.id} className="flex justify-between items-center py-2 text-sm">
                <span>{formatDate(w.date, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="flex items-center gap-3">
                  <b>{kgToDisplay(w.kg, u)} {u}{w.bodyFat != null && <span className="text-muted font-normal"> · {w.bodyFat} %</span>}</b>
                  <button className="text-danger text-xs" onClick={() => w.id && db.weights.delete(w.id)}>{t('Löschen')}</button>
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
  { region: t('Oberkörper'), items: [
    { id: 'neck', label: t('Hals') }, { id: 'shoulders', label: t('Schultern') }, { id: 'bust', label: t('Brustumfang') },
    { id: 'chest', label: t('Brust') }, { id: 'waist', label: t('Taille') },
    { id: 'bicepsL', label: t('Bizeps links') }, { id: 'bicepsR', label: t('Bizeps rechts') },
    { id: 'forearmL', label: t('Unterarm links') }, { id: 'forearmR', label: t('Unterarm rechts') },
    { id: 'wristL', label: t('Handgelenk links') }, { id: 'wristR', label: t('Handgelenk rechts') },
  ] },
  { region: t('Unterkörper'), items: [
    { id: 'hips', label: t('Hüfte') },
    { id: 'thighL', label: t('Oberschenkel links') }, { id: 'thighR', label: t('Oberschenkel rechts') },
    { id: 'calfL', label: t('Wade links') }, { id: 'calfR', label: t('Wade rechts') },
    { id: 'ankleL', label: t('Knöchel links') }, { id: 'ankleR', label: t('Knöchel rechts') },
  ] },
]

/** Waagerechtes Diagramm der Veränderung in Prozent je Kennzahl: Nulllinie in der Mitte, Abnahme links, Zunahme rechts. */
function PctChart({ rows }: { rows: CompareRow[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pct)))
  const rowH = 22, labelW = 120, half = 80, W = labelW + half * 2 + 50, mid = labelW + half
  const sorted = [...rows].sort((a, b) => b.pct - a.pct)
  return (
    <svg viewBox={`0 0 ${W} ${sorted.length * rowH + 4}`} className="w-full" role="img"
      aria-label={t('Veränderung in Prozent je Wert')}>
      <line x1={mid} x2={mid} y1={0} y2={sorted.length * rowH + 4} stroke="var(--line)" strokeWidth={1} />
      {sorted.map((r, i) => {
        const w = Math.max(1, (Math.abs(r.pct) / max) * half)
        const y = i * rowH + 4
        const up = r.pct >= 0
        return (
          <g key={r.key}>
            <text x={labelW - 6} y={y + 11} textAnchor="end" fontSize={9} fill="var(--muted)">{r.label.length > 20 ? `${r.label.slice(0, 19)}…` : r.label}</text>
            <rect x={up ? mid : mid - w} y={y} width={w} height={14} rx={3} fill="var(--chart-bar)" opacity={up ? 1 : 0.55} />
            <text x={W - 2} y={y + 11} textAnchor="end" fontSize={9} fill="var(--fg)" className="tabular-nums">
              {r.pct > 0 ? '+' : r.pct < 0 ? '−' : ''}{Math.abs(r.pct).toLocaleString(LOCALE)} %
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function MeasuresPage() {
  const nav = useNavigate()
  const measures = useMeasures()
  const settings = useSettings()
  const u = settings.lengthUnit
  const [vals, setVals] = useState<Partial<Record<MeasureSite, string>>>({})
  const [site, setSite] = useState<MeasureSite>('waist')
  const weights = useWeights()
  const [periodKey, setPeriodKey] = useState<'28' | '90' | '365' | 'null' | 'custom'>('90')
  const today = todayStr()
  const [from, setFrom] = useState(addDays(today, -90))
  const [to, setTo] = useState(today)
  const compare = useMemo(() => compareRows(weights, measures, today,
    periodKey === 'custom' ? { from, to } : periodKey === 'null' ? null : (Number(periodKey) as 28 | 90 | 365)), [weights, measures, today, periodKey, from, to])

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
    <Page title={t('Körpermaße')} back={() => nav(-1)}>
      {SITES.map((g) => (
        <Card key={g.region} className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted">{g.region}</div>
          {g.items.map((i) => (
            <div key={i.id} className="flex items-center gap-3">
              <button className={cx('flex-1 text-left text-sm', site === i.id && 'text-accent font-semibold')} onClick={() => setSite(i.id)}>
                {i.label}
                {last(i.id) != null && <span className="text-xs text-muted ml-2">{t('zuletzt')} {cmToDisplay(last(i.id)!, u)} {u}</span>}
              </button>
              <input inputMode="decimal" className={`${inputCls} !w-24`} placeholder={u} value={vals[i.id] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [i.id]: e.target.value }))} />
            </div>
          ))}
        </Card>
      ))}
      <Button className="w-full" onClick={save}>{t('Speichern (heute,')} {formatDate(todayStr())})</Button>

      <Card className="space-y-2">
        <div className="font-semibold text-sm">{t('Verlauf:')} {label}</div>
        <TimeSeries daily={series} bar={false} fmt={(v) => `${cmToDisplay(v, u)}`} defaultPeriod="3M" showAveraging={false} />
      </Card>
      <Card className="space-y-3">
        <div className="font-semibold text-sm">{t('Vergleich')}</div>
        <Segmented value={periodKey} onChange={(v) => setPeriodKey(v as typeof periodKey)}
          options={[{ value: '28', label: t('4 Wochen') }, { value: '90', label: t('3 Monate') }, { value: '365', label: t('1 Jahr') }, { value: 'null', label: t('Gesamt') }, { value: 'custom', label: t('Frei') }]} />
        {periodKey === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted space-y-1">{t('Von')}
              <input type="date" className={inputCls} value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
            <label className="text-xs text-muted space-y-1">{t('Bis')}
              <input type="date" className={inputCls} value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
          </div>
        )}
        {compare.length > 0 && <PctChart rows={compare} />}
        {compare.length === 0 ? (
          <p className="text-sm text-muted">{t('Für einen Vergleich braucht ein Wert mindestens zwei Einträge an verschiedenen Tagen.')}</p>
        ) : (
          <div className="divide-y divide-line">
            {compare.map((r) => {
              const unit = bodyUnit(r.key, settings)
              const d = formatBody(r.key, r.delta, settings)
              const sign = r.delta > 0 ? '+' : r.delta < 0 ? '−' : ''
              return (
                <div key={r.key} className="flex items-baseline gap-2 py-2 text-sm">
                  <span className="flex-1 min-w-0 truncate">{r.label}</span>
                  <span className="text-xs text-muted tabular-nums">{formatBody(r.key, r.from.value, settings)} → {formatBody(r.key, r.to.value, settings)} {unit}</span>
                  <span className="w-28 text-right font-semibold tabular-nums">{sign}{d.replace('-', '')} {unit}
                    <span className="block text-2xs font-normal text-muted">{r.pct > 0 ? '+' : r.pct < 0 ? '−' : ''}{Math.abs(r.pct).toLocaleString(LOCALE)} %</span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-muted">{t('Ausgangswert ist der letzte Eintrag am oder vor Beginn des Zeitraums, sonst der erste Eintrag darin. Verglichen wird mit dem neuesten Eintrag.')}</p>
      </Card>
      <p className="text-xs text-muted">{t('Werte werden intern in cm gespeichert.')}</p>
    </Page>
  )
}
