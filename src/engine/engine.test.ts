import { describe, expect, it } from 'vitest'
import { e1rm, isStalled, suggestNext, weightForReps } from './progression'
import { baseRepRange, effectiveSets, weekPlan } from './periodization'
import { dayTypes, generate, weekSlots } from './planGenerator'
import { alternatives } from './swap'
import { emptyWeek, isWeekComplete, markSlot } from './weekCycle'
import { average, cardioDaily, exerciseDaily, filterPeriod, groupByMonth, muscleDaily, summary } from './stats'
import { ALL_EXERCISES, EXERCISES, exerciseById } from '../data/exercises'
import type { ProgramConfig, Session } from '../types'

const range = { min: 6, max: 10 }

describe('progression', () => {
  it('e1RM und Rückrechnung sind konsistent', () => {
    const rm = e1rm(100, 5, 0)
    expect(weightForReps(rm, 5, 0)).toBeCloseTo(100)
  })

  it('ohne Historie kein Gewicht, Reps an Untergrenze', () => {
    expect(suggestNext({ range, targetRir: 2, equipment: 'barbell' })).toEqual({ weight: null, reps: 6 })
  })

  it('alle Sätze am oberen Ende → Gewicht hoch, Reps zurück', () => {
    const last = [1, 2, 3].map(() => ({ weight: 60, reps: 10, rir: 2 }))
    const s = suggestNext({ range, targetRir: 2, equipment: 'barbell', last })
    expect(s.reps).toBe(6)
    expect(s.weight).toBeGreaterThan(60)
    expect(s.weight!).toBeLessThanOrEqual(66)
  })

  it('sonst +1 Wiederholung bei gleichem Gewicht', () => {
    const last = [{ weight: 60, reps: 8, rir: 2 }, { weight: 60, reps: 8, rir: 2 }]
    expect(suggestNext({ range, targetRir: 2, equipment: 'barbell', last })).toEqual({ weight: 60, reps: 9 })
  })

  it('Abweichung nach unten wird neu berechnet', () => {
    // Nutzer hat statt Vorschlag nur 6 Wdh mit leichterem Gewicht gemacht
    const last = [{ weight: 50, reps: 6, rir: 2 }]
    const s = suggestNext({ range, targetRir: 2, equipment: 'barbell', last })
    expect(s.weight).toBeGreaterThanOrEqual(45)
    expect(s.weight).toBeLessThanOrEqual(50)
    expect(s.reps).toBe(7)
  })

  it('Plateau reduziert das Gewicht', () => {
    const last = [{ weight: 100, reps: 6, rir: 2 }]
    const s = suggestNext({ range, targetRir: 2, equipment: 'barbell', last, stalled: true })
    expect(s.weight).toBe(95)
  })

  it('isStalled', () => {
    expect(isStalled([100, 100, 100])).toBe(true)
    expect(isStalled([100, 104, 108])).toBe(false)
    expect(isStalled([100, 101])).toBe(false)
  })
})

describe('periodization', () => {
  it('Reps-Schemata', () => {
    const base = { deload: false }
    expect(weekPlan({ ...base, repScheme: 'static' }, 3).repShift).toBe(0)
    expect(weekPlan({ ...base, repScheme: 'linear' }, 2).repShift).toBe(-2)
    expect(weekPlan({ ...base, repScheme: 'reverseLinear' }, 2).repShift).toBe(2)
    expect(weekPlan({ ...base, repScheme: 'undulating' }, 0).repShift).toBe(-2)
    expect(weekPlan({ ...base, repScheme: 'undulating' }, 1).repShift).toBe(2)
  })
  it('Deload nach 4 Wochen halbiert die Sätze', () => {
    const p = weekPlan({ deload: true, repScheme: 'static' }, 4)
    expect(p.isDeload).toBe(true)
    expect(effectiveSets(4, p)).toBe(2)
    expect(weekPlan({ deload: true, repScheme: 'static' }, 5).isDeload).toBe(false)
  })
  it('Basis-Rep-Ranges', () => {
    expect(baseRepRange('strength', true)).toEqual({ min: 3, max: 6 })
  })
})

const cfg = (over: Partial<ProgramConfig> = {}): ProgramConfig => ({
  mode: 'auto', goal: 'hypertrophy', days: 4, split: 'ulfb', time: '60-90', repScheme: 'static',
  focus: {}, deload: true, experience: 'intermediate', name: 'Test', icon: 'dumbbell', color: '#38bdf8', ...over,
})

describe('planGenerator', () => {
  it('Split-Zuordnung', () => {
    expect(dayTypes('ppl', 3)).toEqual(['push', 'pull', 'legs'])
    expect(dayTypes('ulfb', 4)).toEqual(['upper', 'lower', 'upper', 'lower'])
    expect(dayTypes('none', 2)).toEqual(['full', 'full'])
  })
  it('weekSlots: 3 Tage wie beschrieben', () => {
    expect(weekSlots(3)).toEqual([0, 'rest', 1, 'rest', 2, 'rest', 'rest'])
    expect(weekSlots(6).filter((s) => s !== 'rest')).toHaveLength(6)
  })
  it('erzeugt Tage mit Übungen, nie Cardio', () => {
    const { program } = generate(cfg(), ALL_EXERCISES)
    expect(program.days).toHaveLength(4)
    for (const d of program.days) {
      expect(d.exercises.length).toBeGreaterThan(0)
      for (const e of d.exercises) expect(exerciseById(e.exerciseId)?.cardio).toBeFalsy()
    }
  })
  it('kürzere Zeit → weniger Sätze pro Einheit', () => {
    const sum = (c: ProgramConfig) =>
      generate(c, ALL_EXERCISES).program.days[0].exercises.reduce((a, e) => a + e.sets, 0)
    expect(sum(cfg({ time: 'u20' }))).toBeLessThan(sum(cfg({ time: '90-120' })))
    expect(sum(cfg({ time: 'u20' }))).toBeLessThanOrEqual(8)
  })
  it('Muskelfokus erhöht Volumen', () => {
    const sets = (c: ProgramConfig, mus: string) =>
      generate(c, ALL_EXERCISES).program.days.flatMap((d) => d.exercises)
        .filter((e) => exerciseById(e.exerciseId)!.primary[0] === mus)
        .reduce((a, e) => a + e.sets, 0)
    expect(sets(cfg({ focus: { biceps: 'high' }, time: 'o120' }), 'biceps'))
      .toBeGreaterThan(sets(cfg({ focus: { biceps: 'low' }, time: 'o120' }), 'biceps'))
  })
  it('Equipment-Filter wird beachtet', () => {
    const { program } = generate(cfg({ equipment: ['dumbbell', 'bodyweight'] }), ALL_EXERCISES)
    for (const d of program.days) for (const e of d.exercises) {
      expect(['dumbbell', 'bodyweight']).toContain(exerciseById(e.exerciseId)!.equipment)
    }
  })
  it('Alternativen trainieren dieselbe Hauptmuskelgruppe', () => {
    const cur = exerciseById('bb-bench')!
    const alts = alternatives(cur, EXERCISES)
    expect(alts.length).toBeGreaterThan(3)
    for (const a of alts) expect(a.primary).toContain('chest')
  })
})

describe('weekCycle', () => {
  it('Reset nach 7 erledigten Slots, Woche zählt hoch', () => {
    let s = emptyWeek(0)
    for (let i = 0; i < 6; i++) s = markSlot(s, i, `2026-01-0${i + 1}`)
    expect(isWeekComplete(s)).toBe(false)
    s = markSlot(s, 6, '2026-01-07')
    expect(s.week).toBe(1)
    expect(s.done.every((d) => !d)).toBe(true)
    expect(s.markedDates).toEqual([])
  })
})

const session = (date: string, sets: { weight: number; reps: number }[], ex = 'bb-bench'): Session => ({
  programId: 1, dayIndex: 0, date, finishedAt: 0, week: 0, exercises: [{ exerciseId: ex, sets }],
})

describe('cardio stats', () => {
  const run = (date: string, minutes: number, km: number): Session => ({
    programId: 1, dayIndex: 0, date, finishedAt: 0, week: 0,
    exercises: [{ exerciseId: 'c-run', sets: [{ weight: 0, reps: 0, minutes, km }] }],
  })
  const sessions = [run('2026-01-01', 30, 5), run('2026-01-03', 20, 0)]
  it('Dauer, Distanz und Tempo', () => {
    expect(cardioDaily(sessions, 'c-run', 'minutes').map((p) => p.value)).toEqual([30, 20])
    expect(cardioDaily(sessions, 'c-run', 'distance').map((p) => p.value)).toEqual([5])
    expect(cardioDaily(sessions, 'c-run', 'pace').map((p) => p.value)).toEqual([6])
  })
  it('Cardio fließt nicht in Muskelstatistik', () => {
    expect(muscleDaily(sessions, 'quads', 'sets', exerciseById)).toEqual([])
  })
})

describe('stats', () => {
  const sessions = [
    session('2026-01-05', [{ weight: 100, reps: 5 }, { weight: 100, reps: 4 }]),
    session('2026-01-12', [{ weight: 102.5, reps: 5 }]),
    session('2026-02-02', [{ weight: 105, reps: 3 }]),
  ]
  it('Tageswerte pro Metrik', () => {
    expect(exerciseDaily(sessions, 'bb-bench', 'heaviest').map((p) => p.value)).toEqual([100, 102.5, 105])
    expect(exerciseDaily(sessions, 'bb-bench', 'totalSets').map((p) => p.value)).toEqual([2, 1, 1])
    expect(exerciseDaily(sessions, 'bb-bench', 'totalVolume')[0].value).toBe(900)
    expect(exerciseDaily(sessions, 'bb-bench', 'totalReps')[0].value).toBe(9)
    expect(exerciseDaily(sessions, 'bb-bench', 'bestSetReps')[0].value).toBe(5)
  })
  it('rm3 ist größer als rm10', () => {
    const [a] = exerciseDaily(sessions, 'bb-bench', 'rm3')
    const [b] = exerciseDaily(sessions, 'bb-bench', 'rm10')
    expect(a.value).toBeGreaterThan(b.value)
  })
  it('Zeitraum, Averaging, Summary, Gruppierung', () => {
    const pts = exerciseDaily(sessions, 'bb-bench', 'totalSets')
    expect(filterPeriod(pts, '1M', '2026-02-20').map((p) => p.date)).toEqual(['2026-02-02'])
    expect(average(pts, 'monthly', true).map((p) => p.value)).toEqual([3, 1])
    expect(average(exerciseDaily(sessions, 'bb-bench', 'heaviest'), 'monthly', false)[0].value).toBe(101.25)
    expect(summary(pts, true)).toMatchObject({ best: 2, total: 4 })
    expect(groupByMonth(pts).map((g) => g.month)).toEqual(['2026-02', '2026-01'])
  })
  it('Muskelstatistik zählt sekundäre Muskeln halb', () => {
    const lookup = (id: string) => exerciseById(id)
    expect(muscleDaily(sessions, 'chest', 'sets', lookup)[0].value).toBe(2)
    expect(muscleDaily(sessions, 'triceps', 'sets', lookup)[0].value).toBe(1)
  })
})
