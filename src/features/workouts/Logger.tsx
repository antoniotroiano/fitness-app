import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LoggedExercise, LoggedSet } from '../../types'
import { Button, Card, Page, inputCls, cx } from '../../components/ui'
import { db, saveWeekState, useActiveProgram, useAllExercises, useSessions, useSettings, useWeekState } from '../../db/db'
import { exerciseById } from '../../data/exercises'
import { isStalled, sessionE1rm, suggestNext } from '../../engine/progression'
import { effectiveRir, effectiveSets, shiftRange, weekPlan } from '../../engine/periodization'
import { markSlot } from '../../engine/weekCycle'
import { displayToKg, displayToKm, kgToDisplay } from '../../utils/units'
import { todayStr } from '../../utils/dates'

interface Row { weight: string; reps: string; rir: string; done: boolean; minutes: string; km: string }

export default function Logger() {
  const { slot: param = 's0' } = useParams()
  const nav = useNavigate()
  const program = useActiveProgram()
  const week = useWeekState()
  const sessions = useSessions()
  const settings = useSettings()
  const all = useAllExercises()
  const [rows, setRows] = useState<Record<string, Row[]> | null>(null)
  const [rest, setRest] = useState(0)

  const slotIdx = param.startsWith('s') ? Number(param.slice(1)) : null
  const dayIdx = !program ? -1 : slotIdx !== null
    ? (program.weekSlots[slotIdx] as number | 'rest' | undefined) === 'rest' ? -1 : (program.weekSlots[slotIdx!] as number) : Number(param.slice(1))
  const day = program?.days[dayIdx]
  const plan = useMemo(() => (program?.config ? weekPlan(program.config, week.week) : { isDeload: false, repShift: 0, rirDelta: 0, setsFactor: 1 }), [program, week.week])

  // Vorschläge berechnen (einmalig pro Tag)
  const prepared = useMemo(() => {
    if (!day) return []
    return day.exercises.map((pe) => {
      const ex = exerciseById(pe.exerciseId, all)!
      const history = sessions.filter((s) => s.exercises.some((e) => e.exerciseId === pe.exerciseId))
      const lastSets = history.at(-1)?.exercises.find((e) => e.exerciseId === pe.exerciseId)?.sets
      const e1rms = history.slice(-3).map((s) => sessionE1rm(s.exercises.find((e) => e.exerciseId === pe.exerciseId)!.sets, pe.rir))
      const range = shiftRange({ min: pe.repMin, max: pe.repMax }, plan.repShift)
      const rir = effectiveRir(pe.rir, plan)
      const sets = ex.cardio ? 1 : effectiveSets(pe.sets, plan)
      const sug = ex.cardio ? { weight: null, reps: 0 } : suggestNext({
        range, targetRir: rir, equipment: ex.equipment, last: lastSets, stalled: isStalled(e1rms),
      })
      return { pe, ex, range, rir, sets, sug }
    })
  }, [day, all, sessions, plan])

  useEffect(() => {
    if (rows || !prepared.length || !day) return
    const init: Record<string, Row[]> = {}
    for (const p of prepared) {
      init[p.pe.exerciseId] = Array.from({ length: p.sets }, () => ({
        weight: p.sug.weight == null ? '' : String(kgToDisplay(p.sug.weight, settings.weightUnit)),
        reps: p.ex.cardio ? '' : String(p.sug.reps), rir: String(p.rir), done: false, minutes: '', km: '',
      }))
    }
    setRows(init)
  }, [prepared, rows, day, settings.weightUnit])

  useEffect(() => {
    if (rest <= 0) return
    const t = setTimeout(() => setRest((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [rest])

  if (!program || !day || !rows) {
    return <Page title="Workout" back={() => nav('/workouts')}><Card>Workout nicht gefunden.</Card></Page>
  }

  const patch = (id: string, i: number, p: Partial<Row>) =>
    setRows((r) => ({ ...r!, [id]: r![id].map((x, xi) => (xi === i ? { ...x, ...p } : x)) }))

  const finish = async () => {
    const exercises: LoggedExercise[] = []
    for (const p of prepared) {
      const done = rows[p.pe.exerciseId].filter((r) => r.done)
      const sets: LoggedSet[] = done.map((r) => p.ex.cardio
        ? { reps: 0, weight: 0, minutes: Number(r.minutes.replace(',', '.')) || 0, km: displayToKm(Number(r.km.replace(',', '.')) || 0, settings.distanceUnit) }
        : { weight: displayToKg(Number(r.weight) || 0, settings.weightUnit), reps: Number(r.reps) || 0, rir: Number(r.rir) })
      if (sets.length) exercises.push({ exerciseId: p.pe.exerciseId, sets })
    }
    if (!exercises.length) { nav('/workouts'); return }
    const date = todayStr()
    await db.sessions.add({ programId: program.id ?? null, dayIndex: dayIdx, date, finishedAt: Date.now(), week: week.week, exercises })
    if (slotIdx !== null) await saveWeekState(markSlot(week, slotIdx, date))
    nav('/workouts')
  }

  const wl = settings.weightUnit
  return (
    <Page title={day.name} back={() => nav('/workouts')}
      right={plan.isDeload ? <span className="text-xs rounded-full bg-amber-500/20 text-amber-500 px-2 py-1">Deload</span> : undefined}>
      {prepared.map(({ pe, ex, range, rir, sug }) => (
        <Card key={pe.exerciseId} className="space-y-3">
          <div>
            <div className="font-semibold">{ex.name}</div>
            <div className="text-xs text-muted">
              {ex.cardio ? 'Cardio' : `Ziel ${range.min}–${range.max} Wdh · RIR ${rir}${sug.weight ? ` · Vorschlag ${kgToDisplay(sug.weight, wl)} ${wl} × ${sug.reps}` : ' · Startgewicht selbst wählen'}`}
            </div>
          </div>
          <div className="space-y-2">
            {rows[pe.exerciseId].map((r, i) => (
              <div key={i} className={cx('grid gap-2 items-center', ex.cardio ? 'grid-cols-[1.5rem_1fr_1fr_2.5rem]' : 'grid-cols-[1.5rem_1fr_1fr_3.5rem_2.5rem]')}>
                <span className="text-xs text-muted">{i + 1}</span>
                {ex.cardio ? (
                  <>
                    <input inputMode="decimal" className={inputCls} placeholder="min" value={r.minutes} onChange={(e) => patch(pe.exerciseId, i, { minutes: e.target.value })} />
                    <input inputMode="decimal" className={inputCls} placeholder={settings.distanceUnit} value={r.km} onChange={(e) => patch(pe.exerciseId, i, { km: e.target.value })} />
                  </>
                ) : (
                  <>
                    <input inputMode="decimal" className={inputCls} placeholder={wl} value={r.weight} onChange={(e) => patch(pe.exerciseId, i, { weight: e.target.value.replace(',', '.') })} />
                    <input inputMode="numeric" className={inputCls} placeholder="Wdh" value={r.reps} onChange={(e) => patch(pe.exerciseId, i, { reps: e.target.value })} />
                    <select className={inputCls} value={r.rir} onChange={(e) => patch(pe.exerciseId, i, { rir: e.target.value })} aria-label="RIR">
                      {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </>
                )}
                <button aria-label="Satz abhaken"
                  onClick={() => { patch(pe.exerciseId, i, { done: !r.done }); if (!r.done && !ex.cardio) setRest(ex.compound ? 150 : 90) }}
                  className={cx('h-10 rounded-xl border', r.done ? 'bg-accent text-slate-900 border-accent' : 'border-line text-transparent')}>✓</button>
              </div>
            ))}
          </div>
          {!ex.cardio && (
            <button className="text-xs text-accent" onClick={() => setRows((rs) => ({
              ...rs!, [pe.exerciseId]: [...rs![pe.exerciseId], { ...rs![pe.exerciseId].at(-1)!, done: false }],
            }))}>+ Satz</button>
          )}
        </Card>
      ))}

      {rest > 0 && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-30">
          <button onClick={() => setRest(0)} className="rounded-full bg-surface2 border border-line px-5 py-2 text-sm shadow-lg">
            Pause {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, '0')} · tippen zum Beenden
          </button>
        </div>
      )}

      <div className="fixed bottom-0 inset-x-0 p-4 bg-bg/90 backdrop-blur border-t border-line safe-bottom">
        <div className="max-w-2xl mx-auto"><Button className="w-full" onClick={finish}>Workout beenden</Button></div>
      </div>
    </Page>
  )
}
