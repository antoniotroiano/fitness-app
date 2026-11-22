import { useMemo, useRef, useState } from 'react'
import { BottomSheet, Button, cx } from '../../components/ui'
import { db, useAllExercises, useSessions } from '../../db/db'
import { buildImportSessions, parseTrainingCsv, suggestMapping, type ImportRow } from '../../engine/trainingImport'
import { formatDate } from '../../utils/dates'
import { t, lc } from '../../i18n'

const SKIP = ''

/**
 * Import eines Trainingsverlaufs (CSV, eine Zeile pro Satz). Vorschau mit Zuordnung jeder Übung zu einer eigenen
 * Übung (vorbelegt, änderbar oder überspringen); bereits vorhandene Übungen am selben Tag werden nicht doppelt angelegt.
 */
export function TrainingImportCard({ onDone }: { onDone: (msg: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const all = useAllExercises()
  const sessions = useSessions()
  const [rows, setRows] = useState<ImportRow[] | null>(null)
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const names = useMemo(() => (rows ? [...new Set(rows.map((r) => r.exercise))].sort((a, b) => a.localeCompare(b)) : []), [rows])
  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const r of rows ?? []) if (r.type !== 'warmup') c.set(r.exercise, (c.get(r.exercise) ?? 0) + 1)
    return c
  }, [rows])
  const lookup = useMemo(() => { const m = new Map(all.map((e) => [e.id, e])); return (id: string) => m.get(id) }, [all])
  const result = useMemo(() => (rows ? buildImportSessions(rows, mapping, sessions, lookup) : null), [rows, mapping, sessions, lookup])
  const options = useMemo(() => [...all].sort((a, b) => a.name.localeCompare(b.name, 'de')), [all])

  const pick = async (f?: File) => {
    if (input.current) input.current.value = ''
    if (!f) return
    setError('')
    try {
      const parsed = parseTrainingCsv(await f.text())
      if (!parsed.length) throw new Error(t('Keine Sätze in der Datei gefunden.'))
      setMapping(suggestMapping([...new Set(parsed.map((r) => r.exercise))], all))
      setRows(parsed)
    } catch (e) { setError((e as Error).message) }
  }
  const close = () => { setRows(null); setMapping({}) }
  const run = async () => {
    if (!result?.sessions.length) return
    setBusy(true)
    try {
      await db.sessions.bulkAdd(result.sessions)
      onDone(t('{0} Einheiten importiert', result.sessions.length))
      close()
    } catch (e) { setError(t('Import fehlgeschlagen: {0}', (e as Error).message)) } finally { setBusy(false) }
  }

  const dates = result?.sessions.map((s) => s.date) ?? []
  const open = names.filter((n) => !mapping[n]).length
  return (
    <>
      <p className="text-sm text-muted">{t('Trainingsverlauf aus einer CSV-Datei importieren (eine Zeile pro Satz mit Datum, Übung, Gewicht, Wiederholungen, RIR). Vorhandene Einheiten bleiben erhalten.')}</p>
      <input ref={input} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      <Button variant="ghost" className="w-full" onClick={() => input.current?.click()}>{t('Trainingsverlauf importieren (CSV)')}</Button>
      {error && <div role="alert" className="text-sm text-danger">{error}</div>}

      <BottomSheet open={!!rows} onClose={close} title={t('Trainingsverlauf importieren')} tall>
        {result && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface2 p-3 text-sm space-y-1">
              <div><span className="font-semibold">{result.sessions.length}</span> {lc(t('Einheiten'))}
                {dates.length > 0 && <span className="text-muted"> · {formatDate(dates[0], { day: '2-digit', month: 'short', year: 'numeric' })} {t('bis')} {formatDate(dates[dates.length - 1], { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
              </div>
              {result.duplicates > 0 && <div className="text-muted">{result.duplicates} {t('Übungen sind an ihrem Tag schon vorhanden und werden übersprungen.')}</div>}
              {result.skippedSets > 0 && <div className="text-muted">{result.skippedSets} {t('Sätze ohne Zuordnung oder Werte werden übersprungen.')}</div>}
            </div>
            <div>
              <div className="text-sm font-medium mb-1">{t('Übungen zuordnen')}</div>
              <p className="text-xs text-muted mb-2">{open > 0 ? t('{0} ohne Zuordnung: wähle eine passende Übung oder überspringe sie.', open) : t('Alle Übungen sind zugeordnet. Prüfe die Vorschläge kurz.')}</p>
              <ul className="space-y-2">
                {names.map((n) => (
                  <li key={n} className="space-y-1">
                    <div className="text-xs text-muted flex justify-between gap-2"><span className="truncate">{n}</span><span className="shrink-0">{counts.get(n) ?? 0} {lc(t('Sätze'))}</span></div>
                    <select value={mapping[n] ?? SKIP} onChange={(e) => setMapping((m) => ({ ...m, [n]: e.target.value || null }))}
                      aria-label={t('Zuordnung für {0}', n)}
                      className={cx('w-full rounded-lg bg-surface2 border px-2 py-2 text-sm', mapping[n] ? 'border-line' : 'border-warn text-warn')}>
                      <option value={SKIP}>{t('Überspringen')}</option>
                      {options.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 pb-2">
              <Button className="w-full" disabled={busy || !result.sessions.length} onClick={() => void run()}>
                {result.sessions.length ? t('{0} Einheiten importieren', result.sessions.length) : t('Nichts Neues zu importieren')}
              </Button>
              <Button variant="ghost" className="w-full" onClick={close}>{t('Abbrechen')}</Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
