import { useEffect, useMemo, useState } from 'react'
import type { Exercise } from '../../types'
import { BottomSheet, cx } from '../../components/ui'
import { ProgramBadge } from '../../components/icons'
import { MuscleDetail } from '../../components/MuscleFigure'
import { ExerciseHero } from '../../components/ExerciseMedia'
import type { MediaTips } from '../../data/media/types'
import { EQUIPMENT_LABEL } from '../../data/exercises'
import { muscleLabel } from '../../data/muscles'
import { saveExerciseOverride, useExerciseOverrides, usePrograms, useSessions, useSettings } from '../../db/db'
import { formatDate } from '../../utils/dates'
import { kgToDisplay, kmToDisplay } from '../../utils/units'
import { de } from '../../i18n/de'
import { t, lc } from '../../i18n'

type Tab = 'instructions' | 'details' | 'history'
const TABS: { id: Tab; label: string }[] = [
  { id: 'instructions', label: de.info.instructions }, { id: 'details', label: 'Details' }, { id: 'history', label: de.info.history },
]

interface Guide { steps: string[]; tips?: MediaTips }

/** Anleitung und Tipps liegen in großen Textdateien: erst beim Öffnen der Info nachladen (eigener Chunk). */
function useGuide(ex: Exercise): Guide | null {
  const [loaded, setLoaded] = useState<{ instructionsFor: (e: Exercise) => string[]; tipsFor: (id: string) => MediaTips | undefined } | null>(null)
  useEffect(() => {
    let cancelled = false
    void Promise.all([import('../../data/instructions'), import('../../data/media/tips')])
      .then(([i, tp]) => { if (!cancelled) setLoaded({ instructionsFor: i.instructionsFor, tipsFor: tp.tipsFor }) })
    return () => { cancelled = true }
  }, [])
  return useMemo(() => (loaded ? { steps: loaded.instructionsFor(ex), tips: loaded.tipsFor(ex.id) } : null), [loaded, ex])
}

function Tips({ tips }: { tips?: MediaTips }) {
  if (!tips) return null
  const block = (title: string, items: string[]) => items.length > 0 && (
    <section className="mt-5">
      <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
      <ul className="space-y-1 text-sm text-muted list-disc pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </section>
  )
  return (
    <>
      {block(t('Tipps'), tips.cues)}
      {block(t('Häufige Fehler'), tips.mistakes)}
      {tips.breathing && (
        <section className="mt-5">
          <h3 className="text-sm font-semibold mb-1.5">{t('Atmung')}</h3>
          <p className="text-sm text-muted">{tips.breathing}</p>
        </section>
      )}
    </>
  )
}

function History({ ex }: { ex: Exercise }) {
  const sessions = useSessions()
  const programs = usePrograms()
  const s = useSettings()
  const [open, setOpen] = useState<string | null>(null)
  const entries = useMemo(() => {
    const out: { key: string; date: string; program?: { name: string; icon: string; color: string }; warm: string[]; work: string[] }[] = []
    for (const sess of [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.finishedAt - a.finishedAt)) {
      const logged = sess.exercises.find((e) => e.exerciseId === ex.id)
      if (!logged) continue
      const warm: string[] = []
      const work: string[] = []
      for (const set of logged.sets) {
        const text = ex.cardio
          ? `${set.minutes ?? 0} min${set.km ? ` · ${kmToDisplay(set.km, s.distanceUnit)} ${s.distanceUnit}` : ''}`
          : `${kgToDisplay(set.weight, s.weightUnit)} ${s.weightUnit} × ${set.reps}`
        ;(set.warmup ? warm : work).push(text)
      }
      out.push({ key: String(sess.id ?? `${sess.date}-${sess.finishedAt}`), date: sess.date, program: programs.find((p) => p.id === sess.programId), warm, work })
    }
    return out
  }, [sessions, programs, ex, s.weightUnit, s.distanceUnit])

  if (!entries.length) return <p className="text-sm text-muted">{t('Noch keine Einträge für diese Übung.')}</p>
  return (
    <ul className="divide-y divide-line">
      {entries.map((e) => (
        <li key={e.key}>
          <button className="w-full flex items-center gap-3 py-3 text-left" aria-expanded={open === e.key}
            onClick={() => setOpen(open === e.key ? null : e.key)}>
            <ProgramBadge icon={e.program?.icon} color={e.program?.color ?? '#64748b'} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{formatDate(e.date)}</span>
              <span className="block text-xs text-muted truncate">{e.program?.name ?? t('Einzelnes Workout')}</span>
            </span>
            <span className="text-muted text-xs">{e.work.length} {lc(t('Sätze'))} {open === e.key ? '▴' : '▾'}</span>
          </button>
          {open === e.key && (
            <div className="pb-3 pl-12 space-y-1 text-sm">
              {e.warm.map((s, i) => <div key={`w${i}`} className="flex gap-3"><span className="w-6 text-warn font-semibold">W</span><span>{s}</span></div>)}
              {e.work.map((s, i) => <div key={i} className="flex gap-3"><span className="w-6 text-muted">{i + 1}</span><span>{s}</span></div>)}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Übungs-Info: Anleitung, Muskeln (Details) und Verlauf. */
export function ExerciseInfoSheet({ ex, open, onClose }: { ex: Exercise | null; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('instructions')
  if (!ex) return null
  return <InfoSheet ex={ex} open={open} onClose={onClose} tab={tab} setTab={setTab} />
}

function InfoSheet({ ex, open, onClose, tab, setTab }: { ex: Exercise; open: boolean; onClose: () => void; tab: Tab; setTab: (t: Tab) => void }) {
  const guide = useGuide(ex)
  return (
    <BottomSheet tall open={open} onClose={onClose} title={ex.name}>
      <div role="tablist" className="sticky top-0 z-10 flex gap-1 p-1 rounded-xl bg-surface2 mb-4">
        {TABS.map((tb) => (
          <button key={tb.id} role="tab" aria-selected={tab === tb.id} onClick={() => setTab(tb.id)}
            className={cx('flex-1 py-2 rounded-lg text-sm', tab === tb.id ? 'bg-surface font-semibold shadow-sm' : 'text-muted')}>{tb.label}</button>
        ))}
      </div>
      {tab === 'instructions' && (
        <div>
          <ExerciseHero ex={ex} />
          <ol className="space-y-3 text-sm list-decimal pl-5">
            {(guide?.steps ?? []).map((step, i) => <li key={i}>{step}</li>)}
          </ol>
          {!guide && <p className="text-sm text-muted">{de.common.loading}</p>}
          <Tips tips={guide?.tips} />
        </div>
      )}
      {tab === 'details' && (
        <div className="space-y-4">
          {!ex.cardio && <MuscleDetail primary={ex.primary} secondary={ex.secondary} />}
          <dl className="text-sm space-y-1">
            <div className="flex gap-2"><dt className="text-muted w-24">{t('Primär')}</dt><dd>{ex.primary.map(muscleLabel).join(', ') || '–'}</dd></div>
            <div className="flex gap-2"><dt className="text-muted w-24">{t('Sekundär')}</dt><dd>{ex.secondary.map(muscleLabel).join(', ') || '–'}</dd></div>
            <div className="flex gap-2"><dt className="text-muted w-24">Equipment</dt><dd>{EQUIPMENT_LABEL[ex.equipment]}</dd></div>
          </dl>
          <NeverRecommend id={ex.id} />
        </div>
      )}
      {tab === 'history' && <History ex={ex} />}
    </BottomSheet>
  )
}

/** Schalter „Nie empfehlen“: Generator und Tauschvorschläge lassen die Übung weg */
function NeverRecommend({ id }: { id: string }) {
  const on = !!useExerciseOverrides()[id]?.neverRecommend
  return (
    <label className="flex items-center gap-3 border-t border-line pt-4">
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{t('Nie empfehlen')}</span>
        <span className="block text-xs text-muted">{t('Neue Pläne und Tauschvorschläge lassen die Übung weg. Bestehende Pläne bleiben, von Hand kannst du sie weiter wählen.')}</span>
      </span>
      <button role="switch" aria-checked={on} aria-label={t('Nie empfehlen')} onClick={() => void saveExerciseOverride(id, { neverRecommend: on ? undefined : true })}
        className={cx('relative w-12 h-7 rounded-full shrink-0 transition-colors', on ? 'bg-accent' : 'bg-line')}>
        <span className={cx('absolute top-0.5 left-0.5 w-6 h-6 rounded-full shadow transition-transform', on ? 'translate-x-5 bg-accent-fg' : 'bg-surface')} />
      </button>
    </label>
  )
}
