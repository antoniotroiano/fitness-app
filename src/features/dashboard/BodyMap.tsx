import { useMemo, useState } from 'react'
import type { MuscleId } from '../../types'
import { Card, Chip, cx, LinkButton } from '../../components/ui'
import { MusclePair } from '../../components/MuscleFigure'
import { MUSCLES } from '../../data/muscles'
import { exerciseById } from '../../data/exercises'
import { useAllExercises, useSessions, useSettings, useBodyweights } from '../../db/db'
import { kgToDisplay } from '../../utils/units'
import { muscleContributions, setTier, volumeSplit, weeklyMuscleSets } from '../../engine/stats'

const WEEKS = [1, 4, 12] as const
/** Farbstufen (setTier 1–4): Muskelfarbe, gemischt mit der Linienfarbe */
const TIER_COLOR = ['', 30, 55, 80, 100].map((p) => (p === '' ? '' : `color-mix(in srgb, var(--muscle) ${p}%, var(--line))`))
const LEGEND = [[1, '< 4'], [2, '4–9'], [3, '10–20'], [4, '> 20']] as const

const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

/** Ø Sätze/Woche je Muskel, Farben der Karte und sortierte Liste */
function useMuscleVolume(weeks: number) {
  const sessions = useSessions()
  const all = useAllExercises()
  const avg = useMemo(() => weeklyMuscleSets(sessions, (id) => exerciseById(id, all), weeks), [sessions, all, weeks])
  const colors = useMemo(() => {
    const c: Partial<Record<MuscleId, string>> = {}
    for (const [m, v] of Object.entries(avg) as [MuscleId, number][]) { const t = setTier(v); if (t) c[m] = TIER_COLOR[t] }
    return c
  }, [avg])
  const list = MUSCLES.map((m) => ({ ...m, v: avg[m.id] ?? 0 })).sort((a, b) => b.v - a.v)
  return { colors, list }
}

/** Dashboard-Kachel „Volumen“: kleine Karte, stärkste Muskeln, Anzahl unter 4 Sätzen (Ø 4 Wochen). */
export function VolumeTile({ onClick }: { onClick: () => void }) {
  const { colors, list } = useMuscleVolume(4)
  const top = list.filter((m) => m.v > 0).slice(0, 2)
  const low = list.filter((m) => m.v < 4).length
  return (
    <button onClick={onClick} className="w-full text-left">
      <Card className="flex items-center gap-4 active:opacity-70">
        <MusclePair colors={colors} height={96} />
        <div className="min-w-0 space-y-1">
          <div className="font-semibold text-sm">Körperkarte</div>
          <div className="text-sm truncate">{top.length ? top.map((m) => `${m.label} ${fmt(m.v)}`).join(' · ') : 'Noch keine Sätze'}</div>
          <div className="text-xs text-muted">{low} {low === 1 ? 'Muskel' : 'Muskeln'} unter 4 Sätzen</div>
          <div className="text-xs text-muted">Ø Sätze pro Woche, letzte 4 Wochen</div>
        </div>
      </Card>
    </button>
  )
}

/** Körperkarte: Ø Arbeitssätze pro Woche je Muskel (sekundär halb), wählbarer Zeitraum, Liste zum Antippen. */
export function BodyMap({ onMuscle }: { onMuscle: (id: MuscleId) => void }) {
  const [weeks, setWeeks] = useState<(typeof WEEKS)[number]>(4)
  const { colors, list } = useMuscleVolume(weeks)
  const sessions = useSessions()
  const all = useAllExercises()
  const [openId, setOpenId] = useState<MuscleId | null>(null)
  const contrib = useMemo(
    () => (openId ? muscleContributions(sessions, (id) => exerciseById(id, all), openId, weeks) : []),
    [openId, sessions, all, weeks],
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {WEEKS.map((w) => <Chip key={w} active={weeks === w} onClick={() => setWeeks(w)}>{w === 1 ? '1 Woche' : `${w} Wochen`}</Chip>)}
      </div>
    <VolumeSplitCard weeks={weeks} />
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-sm">Körperkarte</div>
          <div className="text-xs text-muted">Ø Sätze pro Woche, sekundäre Muskeln zählen halb</div>
        </div>
      </div>
      <div className="flex justify-center" role="img" aria-label={`Körperkarte, Ø Sätze pro Woche über ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`}>
        <MusclePair colors={colors} height={240} />
      </div>
      <div className="flex justify-center gap-3 text-2xs text-muted">
        {LEGEND.map(([t, label]) => (
          <span key={t} className="flex items-center gap-1"><i className="w-3 h-3 rounded-sm inline-block" style={{ background: TIER_COLOR[t] }} />{label}</span>
        ))}
      </div>
      <ul className="divide-y divide-line">
        {list.map((m) => {
          const open = openId === m.id
          return (
            <li key={m.id}>
              <button onClick={() => setOpenId(open ? null : m.id)} aria-expanded={open}
                className="w-full flex items-center justify-between py-2 text-sm active:opacity-70">
                <span className="flex items-center gap-2">
                  <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: TIER_COLOR[setTier(m.v)] || 'var(--line)' }} />{m.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className={m.v > 0 ? 'font-semibold tabular-nums' : 'text-muted tabular-nums'}>{fmt(m.v)}</span>
                  <span className={cx('text-muted text-xs transition-transform', open && 'rotate-180')} aria-hidden>▾</span>
                </span>
              </button>
              {open && (
                <div className="pb-3 pl-4 space-y-1.5">
                  {contrib.length === 0 && <p className="text-xs text-muted">Keine Sätze in diesem Zeitraum.</p>}
                  {contrib.map((c) => (
                    <div key={c.exerciseId} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate">
                        {exerciseById(c.exerciseId, all)?.name ?? c.exerciseId}
                        <span className="text-muted"> · {c.role === 'primary' ? 'Hauptmuskel' : 'Nebenmuskel (½)'}</span>
                      </span>
                      <span className="tabular-nums font-medium">{fmt(c.perWeek)}</span>
                    </div>
                  ))}
                  <LinkButton onClick={() => onMuscle(m.id)} className="text-xs">Verlauf ansehen</LinkButton>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
    </div>
  )
}

/** Ø Wochenvolumen, aufgeteilt in Zusatz-/Hantelgewicht und Körpergewichtsanteil (gleicher Zeitraum wie die Karte) */
function VolumeSplitCard({ weeks }: { weeks: number }) {
  const sessions = useSessions()
  const all = useAllExercises()
  const weights = useBodyweights()
  const unit = useSettings().weightUnit
  const v = useMemo(() => volumeSplit(sessions, (id) => exerciseById(id, all), weights, weeks), [sessions, all, weights, weeks])
  const total = v.external + v.bodyweight
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const kg = (n: number) => `${Math.round(kgToDisplay(n, unit)).toLocaleString('de-DE')} ${unit}`
  const rows = [
    { label: 'Gewicht (Hantel, Maschine, Zusatz)', value: v.external, color: 'var(--muscle)' },
    { label: 'Körpergewicht', value: v.bodyweight, color: 'color-mix(in srgb, var(--muscle) 40%, var(--line))' },
  ]
  return (
    <Card className="space-y-3">
      <div>
        <div className="font-semibold text-sm">Wochenvolumen</div>
        <div className="text-xs text-muted">Ø pro Woche, Gewicht × Wdh.</div>
      </div>
      <div className="text-2xl font-semibold tabular-nums">{kg(total)}</div>
      <div className="flex h-3 rounded-full overflow-hidden bg-surface2" role="img"
        aria-label={`${pct(v.external)} % Gewicht, ${pct(v.bodyweight)} % Körpergewicht`}>
        {rows.map((r) => r.value > 0 && <div key={r.label} style={{ width: `${pct(r.value)}%`, background: r.color }} />)}
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 min-w-0"><i className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: r.color }} /><span className="truncate">{r.label}</span></span>
            <span className="tabular-nums shrink-0"><span className="font-semibold">{kg(r.value)}</span> <span className="text-muted">· {pct(r.value)} %</span></span>
          </li>
        ))}
      </ul>
      {weights.length === 0 && <p className="text-xs text-muted">Ohne eingetragenes Körpergewicht zählt bei Klimmzügen, Dips und Co. nur das Zusatzgewicht.</p>}
    </Card>
  )
}
