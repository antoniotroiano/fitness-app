import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Page } from '../../components/ui'
import { ProgramBadge } from '../../components/icons'
import { useAllExercises, usePrograms, useSessionsLoaded, useSettings } from '../../db/db'
import { sessionSummary } from '../../engine/history'
import { kgToDisplay, formatTime } from '../../utils/units'
import { formatDate, formatMonth, monthKey } from '../../utils/dates'
import { BackfillSheet } from './BackfillSheet'
import { sessionProgram, sessionTitle } from './format'

/** Workout-Verlauf: alle Einheiten, neueste zuerst; Tippen öffnet die Bearbeitung. */
export default function HistoryPage() {
  const nav = useNavigate()
  const sessions = useSessionsLoaded()
  const programs = usePrograms()
  const all = useAllExercises()
  const settings = useSettings()
  const [backfill, setBackfill] = useState(false)

  const groups = useMemo(() => {
    const sorted = [...(sessions ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.finishedAt - a.finishedAt)
    const out: { month: string; items: typeof sorted }[] = []
    for (const s of sorted) {
      const m = monthKey(s.date)
      if (out.at(-1)?.month === m) out.at(-1)!.items.push(s); else out.push({ month: m, items: [s] })
    }
    return out
  }, [sessions])

  const name = (id: string) => all.find((e) => e.id === id)?.name ?? id

  return (
    <Page title="Verlauf" back={() => nav('/more')} right={<button onClick={() => setBackfill(true)} className="text-accent text-sm font-medium">Nachtragen</button>}>
      {sessions === undefined ? <div className="text-sm text-muted">Lädt …</div> : groups.length === 0 ? (
        <Card className="text-center space-y-3 py-8">
          <div className="font-semibold">Noch keine Einheit geloggt</div>
          <p className="text-sm text-muted">Abgeschlossene Workouts erscheinen hier und lassen sich nachträglich korrigieren.</p>
          <Button variant="ghost" onClick={() => setBackfill(true)}>Workout nachtragen</Button>
        </Card>
      ) : groups.map((g) => (
        <section key={g.month} className="space-y-2" aria-label={formatMonth(g.month)}>
          <h2 className="text-xs uppercase tracking-wide text-muted px-1">{formatMonth(g.month)}</h2>
          {g.items.map((s) => {
            const sum = sessionSummary(s, (id) => all.find((e) => e.id === id))
            const p = sessionProgram(s, programs)
            const meta = [`${sum.sets} Sätze`, sum.volumeKg > 0 ? `${Math.round(kgToDisplay(sum.volumeKg, settings.weightUnit)).toLocaleString('de-DE')} ${settings.weightUnit}` : null,
              s.durationSec ? `${Math.round(s.durationSec / 60)} min` : null].filter(Boolean).join(' · ')
            return (
              <button key={s.id} onClick={() => nav(`/history/${s.id}`)} className="w-full text-left rounded-2xl bg-surface border border-line p-4 active:opacity-70">
                <div className="flex items-center gap-3">
                  {p ? <ProgramBadge icon={p.icon} color={p.color} size={32} /> : <span className="w-8 h-8 shrink-0 rounded-full border-2 border-line" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{sessionTitle(s, programs)}</div>
                    <div className="text-xs text-muted">{formatDate(s.date, { weekday: 'short', day: '2-digit', month: 'short' })}{s.startedAt ? ` · ${formatTime(new Date(s.startedAt), settings.clock)}` : ''}</div>
                  </div>
                  <span className="text-muted">›</span>
                </div>
                <div className="text-xs text-muted mt-2">{meta}</div>
                <div className="text-xs mt-1 line-clamp-2">{s.exercises.map((e) => name(e.exerciseId)).join(' · ')}</div>
              </button>
            )
          })}
        </section>
      ))}
      <BackfillSheet open={backfill} onClose={() => setBackfill(false)} />
    </Page>
  )
}
