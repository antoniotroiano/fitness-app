import { describe, expect, it } from 'vitest'
import { adaptNextSets, detrainFactor, e1rm, effectiveRepsAt, incrementKg, isStalled, previousSets, sessionE1rm, suggestNext, weightForReps } from './progression'
import {
  DEFAULT_WARMUP_SCHEMES, collapsedWarmups, dedupeWarmups, effectiveMode, freshnessFor, intensityOf, isFirstForMuscle, resolveWarmup, smartSteps, stepsToSets,
  type WarmupContext,
} from './warmup'
import { effectiveStep, floorToScale, snapToScale, stepDown, stepUp } from './weightScale'
import type { WeightScale } from '../types'
import { volumeFactor, exerciseValue, noLoadStats } from './stats'
import { migrateExercise, migrateFocus, migrateMuscles } from '../data/muscleMigration'
import { groupExercises, libraryGroup } from './library'
import { axisTicks, bucketSpan, chartWindow, clampOffset, formatRange, niceTicks } from './chartWindow'
import { dailyValues, dailySeries, habitDots, monthGrid, shiftMonth, streakDays, streakWeeks, weekCount } from './habits'
import { elapsedMs, formatClock, pauseClock, resumeClock, startClock } from './workoutClock'
import { DEFAULT_REST, restCategory, restSecondsFor } from './rest'
import { baseRepRange, effectiveSets, exerciseTargets, isSkipped, neutralWeek, plannedSets, failureSetIndex, setRir, setWeekTarget, TIME_RANGE, recommendedRepScheme, weekPlan, weeklyOverview, zoneRange } from './periodization'
import { dayTypes, generate, isDirectFor, SESSION_SET_CAP, weekSlots } from './planGenerator'
import { alternatives, swapPlanned } from './swap'
import { targetMuscles } from './targetMuscles'
import { weekProgress } from './weekProgress'
import { deloadSessionOf, plannedDay } from './plannedDay'
import { MEDIA_MAP, posterSlug } from '../data/media'
import { TIPS } from '../data/media/tips'
import manifest from '../data/media/manifest.json'
import { emptyWeek, historyUpTo, isWeekComplete, jumpToWeek, markSlot, maxReachedWeek, weekLabel, weekOptions } from './weekCycle'
import { average, cardioDaily, exerciseDaily, filterPeriod, groupByMonth, muscleDaily, summary } from './stats'
import { ALL_EXERCISES, EXERCISES, exerciseById, TIME_BASED } from '../data/exercises'
import { recentRecords } from './records'
import { linksOf, nextInSuperset, normalizeSupersets, setSupersetLink, supersetMembers, toggleSupersetLink, withLinks } from './superset'
import { DROP_FACTOR, nextSegment } from './setTypes'
import { applyBodyweight, bodyLoadOf, bodyweightAt } from './bodyweight'
import { BODYWEIGHT_SHARE } from '../data/exercises'
import { buildImportSessions, parseTrainingCsv, suggestMapping } from './trainingImport'
import { IMPORT_ALIASES } from '../data/importAliases'
import { bodySeries, lastEntries, ratioSeries, weightSeries } from './body'
import type { MeasureEntry, Program, ProgramConfig, Session, WeightEntry } from '../types'

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
    expect(s.weight!).toBeLessThanOrEqual(67.5)
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

  it('Rep-Bereichs-Wechsel (A5): leichte Woche 60 × 12 @ RIR 1 → schwere Woche 4–8 liefert 70–75 kg', () => {
    const last = [1, 2, 3].map(() => ({ weight: 60, reps: 12, rir: 1 }))
    const s = suggestNext({ range: { min: 4, max: 8 }, targetRir: 1, equipment: 'barbell', last })
    expect(s.reps).toBe(4)
    expect(s.weight!).toBeGreaterThanOrEqual(70)
    expect(s.weight!).toBeLessThanOrEqual(75)
  })

  it('e1RM-Deckel: unplausibel hohes gemeldetes RIR hebt das Gewicht nicht über +5 % e1RM', () => {
    const last = [1, 2, 3].map(() => ({ weight: 60, reps: 10, rir: 6 }))
    const s = suggestNext({ range, targetRir: 2, equipment: 'barbell', last })
    expect(s.weight!).toBeLessThanOrEqual(67.5)
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
  it('Blocklänge: 4 Wochen wie bisher, längere Blöcke strecken den Verlauf', () => {
    const run = (blockWeeks: number | undefined, deload = true) => Array.from({ length: (blockWeeks ?? 4) + 1 }, (_, w) =>
      weekPlan({ deload, repScheme: 'linear', blockWeeks }, w))
    const four = run(undefined)
    expect(four.map((p) => p.repShift)).toEqual([0, -1, -2, -3, 0])
    expect(four.map((p) => p.rirDelta)).toEqual([0, -1, -2, -2, 3])
    expect(four.map((p) => p.setsFactor > 1)).toEqual([false, false, true, true, false])
    expect(run(4)).toEqual(four)
    const five = run(5)
    expect(five.map((p) => p.isDeload)).toEqual([false, false, false, false, false, true])
    expect(five.map((p) => p.repShift)).toEqual([0, -1, -2, -2, -3, 0])
    expect(five.map((p) => p.rirDelta).slice(0, 5)).toEqual([0, 0, -1, -2, -2])
    const six = run(6)
    expect(six[6].isDeload).toBe(true)
    expect(six.slice(0, 6).map((p) => p.repShift)).toEqual([0, -1, -1, -2, -2, -3])
    expect(six.slice(0, 6).map((p) => p.rirDelta)).toEqual([0, 0, -1, -1, -2, -2])
    expect(weekPlan({ deload: true, repScheme: 'static', blockWeeks: 5 }, 6).isDeload).toBe(false)
    expect(weeklyOverview({ sets: 3, repMin: 8, repMax: 12, rir: 2 }, { repScheme: 'linear', deload: true, blockWeeks: 5 }, {})).toHaveLength(6)
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
  it('Tausch übernimmt Bereich der neuen Übungsart, nicht den der alten', () => {
    const ex = (id: string) => exerciseById(id)!
    const main = { exerciseId: 'bb-bench', sets: 3, repMin: 6, repMax: 10, rir: 2 }
    // Verbund → Isolation: Isolationsbereich statt 6–10
    const curl = swapPlanned(main, ex('bb-bench'), ex('cable-curl'), { goal: 'hypertrophy' }, [ex('bb-row')])
    expect(curl).toMatchObject({ exerciseId: 'cable-curl', repMin: 10, repMax: 15, sets: 3, rir: 2 })
    // Gleiche Art: Werte bleiben
    expect(swapPlanned(main, ex('bb-bench'), ex('bb-ohp'), { goal: 'hypertrophy' }, [])).toEqual({ ...main, exerciseId: 'bb-ohp' })
    // Isolation → Verbund: Hauptübung, solange der Tag weniger als zwei Verbundübungen hat, sonst weitere Verbundübung; mind. 3 Sätze
    const iso = { exerciseId: 'db-lateral', sets: 2, repMin: 10, repMax: 15, rir: 2 }
    expect(swapPlanned(iso, ex('db-lateral'), ex('bb-ohp'), { goal: 'both' }, [ex('bb-bench')])).toMatchObject({ repMin: 4, repMax: 6, sets: 3 })
    expect(swapPlanned(iso, ex('db-lateral'), ex('bb-ohp'), { goal: 'both' }, [ex('bb-bench'), ex('bb-squat')])).toMatchObject({ repMin: 6, repMax: 10 })
    // Zeitübung: Sekunden-Bereich
    expect(swapPlanned(iso, ex('db-lateral'), ex('plank'), { goal: 'hypertrophy' }, [])).toMatchObject({ repMin: TIME_RANGE.min, repMax: TIME_RANGE.max })
  })
})

describe('planGenerator: Zeitbudget, Direktübungen, Auswahl (A7)', () => {
  const budgets = Object.keys(SESSION_SET_CAP) as (keyof typeof SESSION_SET_CAP)[]
  it('Sätze pro Tag liegen in jeder Woche des Blocks im Zeitbudget (auch Woche 3 und 4)', () => {
    for (const time of budgets) for (const [split, days] of [['ulfb', 4], ['ppl', 6], ['fullBody', 3], ['ppl', 3]] as const) {
      for (const goal of ['hypertrophy', 'strength', 'both'] as const) {
        const { program } = generate(cfg({ time, split, days, goal }), ALL_EXERCISES)
        for (let week = 0; week < 10; week++) {
          const plan = weekPlan({ repScheme: 'static', deload: true }, week)
          for (const d of program.days) {
            const total = d.exercises.reduce((a, e) => a + effectiveSets(e.sets, plan), 0)
            expect(total, `${time} ${split}${days} ${goal} Woche ${week} ${d.name}`).toBeLessThanOrEqual(SESSION_SET_CAP[time])
          }
        }
      }
    }
  })
  it('Hypertrophie, 60–90 min: jede Woche mind. eine direkte Übung für Bizeps, Trizeps und seitliche Schulter', () => {
    for (const [split, days] of [['ulfb', 4], ['ppl', 6], ['ulfb', 5], ['fullBody', 3]] as const) {
      for (const time of ['60-90', '90-120'] as const) {
        const { program } = generate(cfg({ time, split, days }), ALL_EXERCISES)
        const ex = program.days.flatMap((d) => d.exercises.map((e) => exerciseById(e.exerciseId)!))
        for (const m of ['biceps', 'triceps', 'sideDelts'] as const) {
          expect(ex.some((e) => isDirectFor(e, m)), `${split}${days} ${time} ${m}`).toBe(true)
        }
      }
    }
  })
  it('zeitbasierte und Band-Übungen nur bei ausdrücklicher Wahl', () => {
    const ids = (c: ProgramConfig) => generate(c, ALL_EXERCISES).program.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))
    for (const days of [3, 4, 5, 6]) {
      const all = ids(cfg({ days, time: 'o120', focus: { forearms: 'high', obliques: 'high' } }))
      expect(all.filter((id) => TIME_BASED.has(id))).toEqual([])
      expect(all.filter((id) => exerciseById(id)!.equipment === 'band')).toEqual([])
    }
    // Band-Equipment ausdrücklich gewählt → Band-Übungen sind erlaubt (nur Band + Körpergewicht)
    const band = ids(cfg({ equipment: ['band', 'bodyweight'] }))
    expect(band.some((id) => exerciseById(id)!.equipment === 'band')).toBe(true)
    // Zeitbasierte Übung ausdrücklich gewählt
    const explicit = ids(cfg({ equipment: ['bodyweight'], includeExercises: ['copenhagen-plank'], time: 'o120' }))
    expect(explicit.filter((id) => TIME_BASED.has(id) && id !== 'copenhagen-plank')).toEqual([])
  })
  it('Sätze, die an einem Tag nicht ins Budget passen, wandern auf andere Tage derselben Muskelgruppe', () => {
    // Bei knappem Budget (40–60 min) bleibt keine Kapazität ungenutzt: Was an einem Tag nicht passt, landet an einem anderen Tag
    for (const [split, days] of [['fullBody', 3], ['ulfb', 4]] as const) {
      const { program } = generate(cfg({ time: '40-60', split, days }), ALL_EXERCISES)
      for (const d of program.days) {
        const peak = d.exercises.reduce((a, e) => a + Math.round(e.sets * 1.25), 0)
        expect(peak, d.name).toBeLessThanOrEqual(SESSION_SET_CAP['40-60'])
        expect(peak, d.name).toBeGreaterThanOrEqual(SESSION_SET_CAP['40-60'] - 4)
      }
    }
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

describe('warmup', () => {
  const ctx = (o: Partial<WarmupContext> = {}): WarmupContext =>
    ({ equipment: 'barbell', compound: true, isCore: false, freshness: 'fresh', intensity: intensityOf(5, 2), ...o })
  it('Smart: schwerer = mehr Sätze', () => {
    const heavy = smartSteps(ctx({ intensity: intensityOf(3, 2) })).length
    const mid = smartSteps(ctx({ intensity: intensityOf(6, 2) })).length
    const light = smartSteps(ctx({ intensity: intensityOf(12, 2) })).length
    expect(heavy).toBe(3)
    expect(mid).toBe(3)
    expect(light).toBe(2)
  })
  it('Smart: bereits belasteter Muskel = weniger Sätze', () => {
    expect(smartSteps(ctx({ freshness: 'partial' })).length).toBe(smartSteps(ctx()).length - 1)
    expect(smartSteps(ctx({ freshness: 'primed', intensity: intensityOf(10, 2) }))).toEqual([])
    expect(smartSteps(ctx({ freshness: 'primed', intensity: intensityOf(3, 2) }))).toHaveLength(1)
  })
  it('Smart: Core, Bodyweight: keine Sätze; Isolation: 1-2', () => {
    expect(smartSteps(ctx({ isCore: true }))).toEqual([])
    expect(smartSteps(ctx({ equipment: 'bodyweight' }))).toEqual([])
    expect(smartSteps(ctx({ compound: false, equipment: 'cable', intensity: intensityOf(12, 1) }))).toHaveLength(2)
    expect(smartSteps(ctx({ intensity: 0.95 })).length).toBeLessThanOrEqual(3)
  })
  it('Schema: Prozent vom Arbeitsgewicht, gerundet und aufsteigend', () => {
    const w = stepsToSets(DEFAULT_WARMUP_SCHEMES.compoundUpper, 100, 'barbell')
    expect(w.map((x) => x.weight)).toEqual([40, 60, 80])
    expect(w.map((x) => x.reps)).toEqual([5, 5, 3])
  })
  it('Stange als Untergrenze, keine Doppelten, nie über Arbeitsgewicht', () => {
    const w = stepsToSets(DEFAULT_WARMUP_SCHEMES.compoundLower, 30, 'barbell')
    expect(new Set(w.map((x) => x.weight)).size).toBe(w.length)
    expect(w.every((x) => (x.weight ?? 0) >= 20 && (x.weight ?? 0) < 30)).toBe(true)
    expect(stepsToSets(DEFAULT_WARMUP_SCHEMES.compoundUpper, 20, 'barbell')).toEqual([])
  })
  it('ohne Arbeitsgewicht: Platzhalter ohne Gewicht', () => {
    const w = resolveWarmup({ mode: 'scheme', scheme: DEFAULT_WARMUP_SCHEMES.compoundUpper, ctx: ctx(), workWeight: null })
    expect(w).toHaveLength(3)
    expect(w.every((x) => x.weight === null)).toBe(true)
  })
  it('Modus-Auflösung: Überschreibung vor App-Einstellung', () => {
    expect(effectiveMode(undefined, 'smart')).toBe('smart')
    expect(effectiveMode('default', 'scheme')).toBe('scheme')
    expect(effectiveMode('none', 'smart')).toBe('none')
    expect(effectiveMode('smart', 'off')).toBe('smart')
    expect(effectiveMode(undefined, 'off')).toBe('none')
  })
  it('Frische und isFirstForMuscle', () => {
    const ids = ['bb-bench', 'db-incline', 'db-lateral', 'cable-pushdown']
    expect(freshnessFor(ids, 0, exerciseById)).toBe('fresh')
    expect(freshnessFor(ids, 1, exerciseById)).toBe('primed')
    expect(isFirstForMuscle(ids, 0, exerciseById)).toBe(true)
    expect(isFirstForMuscle(ids, 1, exerciseById)).toBe(false)
    expect(isFirstForMuscle(ids, 2, exerciseById)).toBe(true)
  })
})

describe('Kurzhantel-Volumen und Rep-Rollen', () => {
  it('Kurzhantel zählt doppelt, Langhantel und Hantel-Pullover einfach', () => {
    expect(volumeFactor(exerciseById('db-bench'))).toBe(2)
    expect(volumeFactor(exerciseById('bb-bench'))).toBe(1)
    expect(volumeFactor(exerciseById('db-pullover'))).toBe(1)
    expect(volumeFactor(exerciseById('goblet-squat'))).toBe(1)
    expect(volumeFactor(exerciseById('db-overhead-ext'))).toBe(1)
    expect(volumeFactor(exerciseById('kb-row'))).toBe(2)
    expect(volumeFactor(exerciseById('kb-swing'))).toBe(1)
    const sets = [{ weight: 20, reps: 10 }]
    expect(exerciseValue(sets, 'totalVolume', 2)).toBe(400)
    expect(exerciseValue(sets, 'bestSetVolume')).toBe(200)
    expect(exerciseValue(sets, 'heaviest', 2)).toBe(20)
  })
  it('Rep-Bereiche je Rolle: Kraft/Beides haben schwere Haupt- und leichte Isolationsübungen', () => {
    for (const g of ['strength', 'both'] as const) {
      expect(baseRepRange(g, true, 'main').max).toBeLessThan(baseRepRange(g, false, 'isolation').min)
    }
  })
  it('Generator: Verbundübungen mit mind. 3 Sätzen, bei "Beides" verschiedene Rep-Bereiche', () => {
    const { program } = generate(cfg({ goal: 'both', experience: 'beginner' }), ALL_EXERCISES)
    const ex = program.days.flatMap((d) => d.exercises)
    expect(ex.filter((e) => exerciseById(e.exerciseId)!.compound).every((e) => e.sets >= 3)).toBe(true)
    expect(ex.every((e) => e.sets >= 2)).toBe(true)
    expect(new Set(ex.map((e) => e.repMin)).size).toBeGreaterThan(1)
  })
})

describe('rest', () => {
  const settings = { restSeconds: DEFAULT_REST, warmupRestBetween: 30, warmupRestLast: 90 }
  it('Kategorien', () => {
    expect(restCategory(exerciseById('bb-bench')!)).toBe('compoundUpper')
    expect(restCategory(exerciseById('bb-squat')!)).toBe('compoundLower')
    expect(restCategory(exerciseById('db-lateral')!)).toBe('isoUpper')
    expect(restCategory(exerciseById('leg-ext')!)).toBe('isoLower')
    expect(restCategory(exerciseById('plank')!)).toBe('core')
  })
  it('Pausenzeiten inklusive Aufwärmsatz', () => {
    expect(restSecondsFor(exerciseById('bb-bench')!, settings, 'work')).toBe(150)
    expect(restSecondsFor(exerciseById('bb-bench')!, settings, 'warmup')).toBe(30)
    expect(restSecondsFor(exerciseById('db-lateral')!, settings, 'lastWarmup')).toBe(90)
  })
})

describe('setRir', () => {
  it('Verbund: erster Satz mehr Reserve', () => {
    expect([0, 1, 2].map((i) => setRir(2, i, 3, true))).toEqual([3, 2, 2])
  })
  it('Isolation: letzter Satz näher am Versagen, nie unter 0', () => {
    expect([0, 1, 2].map((i) => setRir(2, i, 3, false))).toEqual([2, 2, 1])
    expect(setRir(0, 1, 2, false)).toBe(0)
  })
  it('ein einzelner Satz bleibt auf Basis', () => {
    expect(setRir(2, 0, 1, true)).toBe(2)
    expect(setRir(2, 0, 1, false)).toBe(2)
  })
})

describe('Aufwärmsätze in Auswertungen', () => {
  const withWarmup: Session = {
    programId: 1, dayIndex: 0, date: '2026-01-01', finishedAt: 1, week: 0,
    exercises: [{ exerciseId: 'bb-bench', sets: [
      { weight: 40, reps: 8, warmup: true }, { weight: 100, reps: 8 }, { weight: 100, reps: 7 },
    ] }],
  }
  it('zählen nicht in Sätzen oder Volumen', () => {
    const lookup = (id: string) => exerciseById(id)
    expect(muscleDaily([withWarmup], 'chest', 'sets', lookup)[0].value).toBe(2)
    expect(exerciseDaily([withWarmup], 'bb-bench', 'totalSets')[0].value).toBe(2)
    expect(exerciseDaily([withWarmup], 'bb-bench', 'totalVolume')[0].value).toBe(1500)
  })
  it('beeinflussen Progression und e1RM nicht', () => {
    const sets = withWarmup.exercises[0].sets
    expect(sessionE1rm(sets)).toBe(sessionE1rm(sets.filter((s) => !s.warmup)))
    expect(suggestNext({ range, targetRir: 2, equipment: 'barbell', last: sets }))
      .toEqual(suggestNext({ range, targetRir: 2, equipment: 'barbell', last: sets.filter((s) => !s.warmup) }))
  })
  it('previousSets trennt Aufwärm- und Arbeitssätze der letzten Einheit', () => {
    const older: Session = { ...withWarmup, date: '2025-12-01', exercises: [{ exerciseId: 'bb-bench', sets: [{ weight: 90, reps: 8 }] }] }
    const prev = previousSets([withWarmup, older], 'bb-bench')
    expect(prev.warmups).toHaveLength(1)
    expect(prev.work).toHaveLength(2)
    expect(previousSets([], 'bb-bench')).toEqual({ warmups: [], work: [] })
  })
})

describe('workoutClock', () => {
  it('formatiert HH:MM:SS', () => {
    expect(formatClock(0)).toBe('00:00:00')
    expect(formatClock(65)).toBe('00:01:05')
    expect(formatClock(3725)).toBe('01:02:05')
  })
  it('Pausen zählen nicht zur Dauer', () => {
    let c = startClock(1000)
    expect(elapsedMs(c, 11000)).toBe(10000)
    c = pauseClock(c, 11000)
    expect(elapsedMs(c, 61000)).toBe(10000)
    c = resumeClock(c, 61000)
    expect(elapsedMs(c, 71000)).toBe(20000)
  })
  it('doppeltes Pausieren/Fortsetzen ändert nichts', () => {
    const c = pauseClock(startClock(0), 100)
    expect(pauseClock(c, 500)).toBe(c)
    const r = resumeClock(c, 300)
    expect(resumeClock(r, 900)).toBe(r)
  })
})

describe('habits', () => {
  const today = '2026-11-15' // Sonntag
  it('30 Punkte, älteste zuerst, heute zuletzt', () => {
    const dots = habitDots(new Set([today, '2026-11-14']), today)
    expect(dots).toHaveLength(30)
    expect(dots.at(-1)).toEqual({ date: today, on: true })
    expect(dots.filter((d) => d.on)).toHaveLength(2)
  })
  it('Wochenzähler zählt nur Mo bis heute', () => {
    expect(weekCount(new Set(['2026-11-09', '2026-11-11', '2026-11-15', '2026-11-08']), today)).toBe(3)
    expect(weekCount(new Set(['2026-11-16']), today)).toBe(0)
  })
  it('Streak in Tagen: heute leer unterbricht nicht', () => {
    const d = new Set(['2026-11-14', '2026-11-13', '2026-11-12', '2026-11-10'])
    expect(streakDays(d, today)).toBe(3)
    expect(streakDays(new Set([...d, today]), today)).toBe(4)
    expect(streakDays(new Set(['2026-11-01']), today)).toBe(0)
  })
  it('Streak in Wochen', () => {
    const d = new Set(['2026-11-10', '2026-11-03', '2026-10-27', '2026-10-13'])
    expect(streakWeeks(d, today)).toBe(3)
    expect(streakWeeks(new Set(['2026-10-01']), today)).toBe(0)
  })
  it('Monatsraster beginnt montags und hat volle Wochen', () => {
    const g = monthGrid(2026, 10) // November 2026, 1. ist ein Sonntag
    expect(g[0][6]).toBe('2026-11-01')
    expect(g[0].slice(0, 6).every((x) => x === null)).toBe(true)
    expect(g.every((w) => w.length === 7)).toBe(true)
    expect(g.flat().filter(Boolean)).toHaveLength(30)
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month0: 0 })
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month0: 11 })
  })
  it('7-Tage-Reihe füllt Lücken mit 0', () => {
    expect(dailySeries([{ date: today, value: 4 }, { date: '2026-11-13', value: 3 }, { date: '2026-10-01', value: 9 }], today))
      .toEqual([0, 0, 0, 0, 3, 0, 4])
  })
})

describe('chartWindow', () => {
  const today = '2026-11-15'
  it('1W: Mo bis So, Titel wie gewünscht', () => {
    const w = chartWindow('1W', today, '2026-01-01')
    expect(w).toEqual({ start: '2026-11-09', end: today, days: 7 })
    expect(formatRange(w)).toBe('9. - 15. Nov. 2026')
    expect(axisTicks(w).map((t) => t.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
  })
  it('1M: 30 Tage, 6 Beschriftungen, rechts das Enddatum', () => {
    const w = chartWindow('1M', today, '2026-01-01')
    expect(formatRange(w)).toBe('17. Okt. - 15. Nov. 2026')
    const t = axisTicks(w)
    expect(t).toHaveLength(6)
    expect(t.at(-1)).toEqual({ index: 29, label: '15. Nov.' })
    expect(t[4].index).toBe(24)
  })
  it('lange Zeiträume: 6 Beschriftungen, ab ca. 4 Wochen Schritt nur Monatsnamen', () => {
    expect(axisTicks(chartWindow('3M', today, '2025-01-01'))).toHaveLength(6)
    expect(axisTicks(chartWindow('1Y', today, '2020-01-01')).every((t) => !/\d/.test(t.label))).toBe(true)
  })
  it('Titel über den Jahreswechsel', () => {
    expect(formatRange({ start: '2025-12-20', end: '2026-01-18', days: 30 })).toBe('20. Dez. 2025 - 18. Jan. 2026')
  })
  it('Verschieben: nach hinten bis zum ersten Eintrag, nie in die Zukunft', () => {
    expect(chartWindow('1W', today, '2026-11-01', 2).end).toBe('2026-11-13')
    expect(clampOffset(99, today, '2026-11-01')).toBe(14)
    expect(clampOffset(-3, today, '2026-11-01')).toBe(0)
    expect(clampOffset(5, today, null)).toBe(0)
  })
  it('All: ab erstem Eintrag, mindestens 7 Tage, unverschiebbar', () => {
    expect(chartWindow('All', today, '2026-11-14').days).toBe(7)
    expect(chartWindow('All', today, '2026-10-17', 9)).toMatchObject({ start: '2026-10-17', end: today, days: 30 })
  })
  it('bucketSpan beschneidet Wochen und Monate auf das Fenster', () => {
    const w = chartWindow('1M', today, '2026-01-01')
    expect(bucketSpan('2026-11-09', 'weekly', w)).toEqual({ from: 23, to: 29 })
    expect(bucketSpan('2026-10-12', 'weekly', w)).toEqual({ from: 0, to: 1 })
    expect(bucketSpan('2026-11-01', 'monthly', w)).toEqual({ from: 15, to: 29 })
  })
  it('niceTicks und dailyValues', () => {
    expect(niceTicks(0, 38, 4)).toEqual([0, 10, 20, 30, 40])
    expect(niceTicks(5, 5).length).toBe(3)
    expect(dailyValues([{ date: today, value: 3 }], today, 3)).toEqual([null, null, 3])
  })
})

describe('library', () => {
  it('ordnet Equipment den Gruppen zu', () => {
    expect(libraryGroup(exerciseById('bb-bench')!)).toBe('free')
    expect(libraryGroup(exerciseById('kb-swing')!)).toBe('free')
    expect(libraryGroup(exerciseById('leg-press')!)).toBe('machines')
    expect(libraryGroup(exerciseById('cable-fly')!)).toBe('machines')
    expect(libraryGroup(exerciseById('smith-bench')!)).toBe('machines')
    expect(libraryGroup(exerciseById('pushup')!)).toBe('bodyweight')
    expect(libraryGroup(exerciseById('band-curl')!)).toBe('bodyweight')
    expect(libraryGroup(exerciseById('c-run')!)).toBe('cardio')
    expect(libraryGroup({ ...exerciseById('bb-bench')!, custom: true })).toBe('bodyweight')
  })
  it('Gruppen in fester Reihenfolge, Cardio zuletzt, nichts geht verloren', () => {
    const g = groupExercises(ALL_EXERCISES)
    expect(g.map((x) => x.id)).toEqual(['free', 'machines', 'bodyweight', 'cardio'])
    expect(g.reduce((a, x) => a + x.items.length, 0)).toBe(ALL_EXERCISES.length)
    expect(groupExercises(ALL_EXERCISES.filter((e) => e.cardio)).map((x) => x.id)).toEqual(['cardio'])
  })
})

describe('Muskel-Migration (15 auf 22 Gruppen)', () => {
  it('Schultern und Core werden aufgeteilt, Dopplungen entfallen', () => {
    expect(migrateMuscles(['chest', 'shoulders', 'core'])).toEqual(['chest', 'frontDelts', 'sideDelts', 'abs'])
    expect(migrateMuscles(['abs', 'core'])).toEqual(['abs'])
    expect(migrateMuscles(undefined)).toEqual([])
  })
  it('eigene Übungen und Fokus werden übernommen', () => {
    const e = migrateExercise({ id: 'x', name: 'x', primary: ['shoulders'] as never, secondary: ['sideDelts', 'triceps'], equipment: 'cable', pattern: 'isolation', compound: false, custom: true })
    expect(e.primary).toEqual(['frontDelts', 'sideDelts'])
    expect(e.secondary).toEqual(['triceps'])
    expect(migrateFocus({ shoulders: 'high', core: 'low', chest: 'low' })).toEqual({
      frontDelts: 'high', sideDelts: 'high', rearDelts: 'high', abs: 'low', chest: 'low',
    })
  })
  it('Planer: Fokus-Muskeln erscheinen nur bei "Höher"', () => {
    const base = generate(cfg({ days: 4 }), ALL_EXERCISES).program.days.flatMap((d) => d.exercises.map((e) => exerciseById(e.exerciseId)!.primary[0]))
    expect(base).not.toContain('neck')
    expect(base).not.toContain('tibialis')
    const withFocus = generate(cfg({ days: 4, focus: { neck: 'high', tibialis: 'high' } }), ALL_EXERCISES).program.days
      .flatMap((d) => d.exercises.map((e) => exerciseById(e.exerciseId)!.primary[0]))
    expect(withFocus).toContain('neck')
    expect(withFocus).toContain('tibialis')
  })
})

describe('targetMuscles', () => {
  it('summiert Übungen und Sätze je primärem Muskel, ignoriert Cardio', () => {
    const bench = exerciseById('bb-bench', ALL_EXERCISES)!
    const fly = exerciseById('cable-fly', ALL_EXERCISES)!
    const curl = exerciseById('bb-curl', ALL_EXERCISES)!
    const cardio = ALL_EXERCISES.find((e) => e.cardio)!
    const t = targetMuscles([{ ex: bench, sets: 3 }, { ex: fly, sets: 2 }, { ex: curl, sets: 3 }, { ex: cardio, sets: 1 }])
    const chest = t.find((x) => x.muscle === 'chest')!
    expect(chest).toEqual({ muscle: 'chest', exercises: 2, sets: 5 })
    expect(t.find((x) => x.muscle === 'biceps')).toEqual({ muscle: 'biceps', exercises: 1, sets: 3 })
    expect(t[0].muscle).toBe('chest')
    expect(t.every((x) => x.sets > 0)).toBe(true)
  })
})

describe('weekProgress Muskeln', () => {
  const ex = (id: string) => exerciseById(id, ALL_EXERCISES)!
  const pe = (id: string) => ({ exerciseId: id, sets: 2, repMin: 8, repMax: 12, rir: 2 })
  const program = {
    id: 1, name: 'T', icon: '', color: '', weekSlots: [0, 1], createdAt: 0,
    days: [
      { id: 'a', name: 'A', exercises: [pe('bb-bench'), pe('bb-curl')] },
      { id: 'b', name: 'B', exercises: [pe('cable-fly')] },
    ],
  } as unknown as Parameters<typeof weekProgress>[0]
  const week = { week: 0, done: [false, false], markedDates: [] } as unknown as Parameters<typeof weekProgress>[1]
  const sets = (n: number) => Array.from({ length: n }, () => ({ weight: 50, reps: 8 }))
  const session = (dayIndex: number, exs: [string, number][]) => ({
    programId: 1, week: 0, dayIndex, date: '2026-01-01', finishedAt: 1,
    exercises: exs.map(([exerciseId, n]) => ({ exerciseId, sets: sets(n) })),
  }) as unknown as Parameters<typeof weekProgress>[2][number]

  it('zählt Muskeln anteilig, wenn ein Workout erledigt ist', () => {
    // Brust: 2 Sätze Bankdrücken (A) + 2 Sätze Fly (B) = 4 geplant; Bizeps: 2 in A
    const p = weekProgress(program, week, [session(0, [['bb-bench', 2], ['bb-curl', 2]])], (id) => ex(id))
    expect(p.muscles.total).toBe(2)
    expect(p.muscles.done).toBeCloseTo(1.5) // Bizeps 1 + Brust 0,5
    expect(p.muscles.full).toBe(1) // nur Bizeps vollständig (Anzeige als Ganzzahl)
  })
  it('ist 0 ohne Sessions und voll nach allen Workouts', () => {
    expect(weekProgress(program, week, [], (id) => ex(id)).muscles.done).toBe(0)
    const all = [session(0, [['bb-bench', 2], ['bb-curl', 2]]), session(1, [['cable-fly', 2]])]
    expect(weekProgress(program, week, all, (id) => ex(id)).muscles.done).toBe(2)
    expect(weekProgress(program, week, all, (id) => ex(id)).muscles.full).toBe(2)
  })
})

describe('Übungsbilder (Mapping)', () => {
  it('mappt nur auf vorhandene App-Übungen und vorhandene Poster', () => {
    for (const [id, slug] of Object.entries(MEDIA_MAP)) {
      expect(exerciseById(id), `unbekannte Übung ${id}`).toBeTruthy()
      expect(manifest, `Poster fehlt: ${slug}`).toContain(slug)
      expect(posterSlug(id)).toBe(slug)
    }
  })
  it('hat keine Dubletten bei den Slugs', () => {
    const slugs = Object.values(MEDIA_MAP)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
  it('liefert null ohne Mapping', () => {
    expect(posterSlug('gibt-es-nicht')).toBeNull()
  })
})

describe('Übungs-Tipps', () => {
  it('hat zu jeder Übung mit Bild vollständige Tipps', () => {
    for (const id of Object.keys(MEDIA_MAP)) {
      const t = TIPS[id]
      expect(t, `Tipps fehlen: ${id}`).toBeTruthy()
      expect(t.cues.length, id).toBeGreaterThan(0)
      expect(t.mistakes.length, id).toBeGreaterThan(0)
      expect(t.breathing.length, id).toBeGreaterThan(0)
    }
  })
  it('hat keine Tipps zu unbekannten Übungen', () => {
    for (const id of Object.keys(TIPS)) expect(exerciseById(id), id).toBeTruthy()
  })
})

describe('Körperdaten', () => {
  const weights: WeightEntry[] = [
    { date: '2026-01-03', kg: 80, bodyFat: 18, source: 'manual' },
    { date: '2026-01-01', kg: 81, source: 'manual' },
    { date: '2026-01-02', kg: 80.5, bodyFat: 18.5, source: 'manual' },
  ]
  const measures: MeasureEntry[] = [
    { date: '2026-01-01', values: { waist: 80, hips: 100 } },
    { date: '2026-01-02', values: { waist: 82 } },
    { date: '2026-01-03', values: { waist: 81, hips: 90, bicepsL: 36, bicepsR: 38 } },
  ]
  it('sortiert Gewicht chronologisch und lässt Einträge ohne Körperfett aus', () => {
    expect(weightSeries(weights, 'kg').map((p) => p.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
    expect(weightSeries(weights, 'bodyFat').map((p) => p.value)).toEqual([18.5, 18])
  })
  it('berechnet Verhältnisse nur, wenn beide Maße vorhanden sind', () => {
    expect(ratioSeries(measures, 'waist', 'hips')).toEqual([
      { date: '2026-01-01', value: 0.8 }, { date: '2026-01-03', value: 0.9 },
    ])
  })
  it('bodySeries wählt Quelle nach Schlüssel', () => {
    expect(bodySeries('weight', weights, measures)).toHaveLength(3)
    expect(bodySeries('waist', weights, measures)).toHaveLength(3)
    expect(bodySeries('bicepsSym', weights, measures)[0].value).toBeCloseTo(0.95)
  })
  it('lastEntries liefert die letzten n', () => {
    const pts = weightSeries(weights, 'kg')
    expect(lastEntries(pts, 2).map((p) => p.date)).toEqual(['2026-01-02', '2026-01-03'])
    expect(lastEntries(pts, 7)).toHaveLength(3)
  })
})

describe('Recent Records', () => {
  const mk = (date: string, finishedAt: number, exercises: Session['exercises']): Session =>
    ({ programId: 1, dayIndex: 0, date, finishedAt, week: 0, exercises })
  const set = (weight: number, reps: number, warmup = false) => ({ weight, reps, warmup, done: true }) as never
  const lookup = (id: string) => (id === 'run' ? ({ id, cardio: true } as never) : ({ id, cardio: false } as never))
  const sessions = [
    mk('2026-01-01', 1, [{ exerciseId: 'a', sets: [set(100, 5)] }]),
    mk('2026-01-03', 2, [{ exerciseId: 'a', sets: [set(60, 20, true), set(80, 10)] }, { exerciseId: 'run', sets: [set(1, 1)] }, { exerciseId: 'b', sets: [set(50, 8), set(40, 12)] }]),
  ]
  it('nimmt je Übung die jüngste Einheit, ohne Cardio und Warm-ups', () => {
    const rows = recentRecords(sessions, lookup, 'volume')
    expect(rows.map((r) => r.exerciseId)).toEqual(['a', 'b'])
    expect(rows[0].value).toBe(800)
    expect(rows[1].value).toBe(480)
  })
  it('liefert Reps und begrenzt auf n', () => {
    expect(recentRecords(sessions, lookup, 'reps').map((r) => r.value)).toEqual([10, 12])
    expect(recentRecords(sessions, lookup, 'rm1', 1)).toHaveLength(1)
  })
})

describe('Wochensprung', () => {
  const program = { id: 7, weekSlots: [0, 'rest', 1, 'rest', 2, 'rest', 'rest'] } as never
  const mk = (week: number, dayIndex: number, date: string): Session =>
    ({ programId: 7, dayIndex, date, finishedAt: 1, week, exercises: [] })
  const sessions = [mk(1, 0, '2026-02-02'), mk(1, 1, '2026-02-04'), mk(2, 0, '2026-02-09'), { ...mk(0, 0, '2026-01-01'), programId: 99 }]
  it('rekonstruiert erledigte Slots der Zielwoche', () => {
    const w = jumpToWeek(program, sessions, 1)
    expect(w.week).toBe(1)
    expect(w.done).toEqual([true, false, true, false, false, false, false])
    expect(w.markedDates).toEqual(['2026-02-02', '2026-02-04'])
  })
  it('liefert leere Woche ohne Einheiten und begrenzt negative Ziele', () => {
    expect(jumpToWeek(program, sessions, 5).done.every((d) => !d)).toBe(true)
    expect(jumpToWeek(program, sessions, -3).week).toBe(0)
  })
  it('bestimmt höchste erreichte Woche', () => {
    expect(maxReachedWeek(program, sessions, 1)).toBe(2)
    expect(maxReachedWeek(program, [], 3)).toBe(3)
  })
  it('historyUpTo blendet spätere Wochen des Programms aus', () => {
    const h = historyUpTo(sessions, 7, 1)
    expect(h).toHaveLength(3)
    expect(h.some((s) => s.week === 2)).toBe(false)
  })
})

describe('adaptNextSets (Folgesätze mit Ermüdung)', () => {
  const plan = { planWeight: 100, planReps: 8, planRir: 3 }
  const one = [{ planWeight: 100, rir: 3 }]
  const r610 = { min: 6, max: 10 }
  it('Satz nach Plan (±1 RIR) → Folgesätze bleiben unverändert', () => {
    for (const rir of [2, 3, 4]) expect(adaptNextSets({ weight: 100, reps: 8, rir, ...plan }, one, r610, 'barbell')).toEqual([null])
  })
  it('leichter als geplant: erst mehr Wdh., über dem Bereich schwerer', () => {
    expect(adaptNextSets({ weight: 100, reps: 8, rir: 5, ...plan }, one, r610, 'barbell')).toEqual([{ weight: 100, reps: 9 }])
    expect(adaptNextSets({ weight: 100, reps: 8, rir: 5, ...plan }, one, { min: 6, max: 8 }, 'barbell')).toEqual([{ weight: 102.5, reps: 7 }])
  })
  it('schwerer als geplant: weniger Wdh., unter dem Bereich leichter (höchstens −10 %)', () => {
    expect(adaptNextSets({ weight: 100, reps: 8, rir: 1, ...plan }, one, r610, 'barbell')).toEqual([{ weight: 100, reps: 5 }])
    expect(adaptNextSets({ weight: 100, reps: 8, rir: 1, ...plan }, one, { min: 8, max: 10 }, 'barbell')).toEqual([{ weight: 95, reps: 7 }])
  })
  it('Kalibrierung ohne Verlauf: 40 kg × 11 bei RIR 1 → 40 kg × 9, nicht 45 × 4', () => {
    const done = { weight: 40, reps: 11, rir: 1, planWeight: null, planReps: 10, planRir: 1 }
    expect(adaptNextSets(done, [{ planWeight: null, rir: 2 }, { planWeight: null, rir: 1 }], { min: 10, max: 15 }, 'cable'))
      .toEqual([{ weight: 40, reps: 9 }, { weight: 40, reps: 9 }])
  })
  it('spätere Sätze behalten das Gewicht und verlieren nur Wdh. (Ermüdung)', () => {
    const done = { weight: 40, reps: 11, rir: 1, planWeight: null, planReps: 4, planRir: 3 }
    const res = adaptNextSets(done, [{ planWeight: null, rir: 2 }, { planWeight: null, rir: 2 }], { min: 4, max: 8 }, 'barbell')
    expect(res).toEqual([{ weight: 42.5, reps: 6 }, { weight: 42.5, reps: 5 }])
  })
  it('ungültige Eingaben ergeben null', () => {
    expect(adaptNextSets({ weight: 0, reps: 6, rir: 2, ...plan }, one, r610, 'barbell')).toEqual([null])
  })
  it('effectiveRepsAt kehrt e1rm um', () => {
    for (const n of [3, 8, 12, 15]) expect(effectiveRepsAt(e1rm(100, n, 0), 100)).toBeCloseTo(n, 6)
  })
})

describe('Trainingspause', () => {
  it('Abschlag erst nach 3 Wochen, nach 8 Wochen ≈ 9 %, höchstens 15 %', () => {
    expect(detrainFactor(undefined)).toBe(1)
    expect(detrainFactor(21)).toBe(1)
    expect(detrainFactor(56)).toBeCloseTo(0.91, 5)
    expect(detrainFactor(400)).toBeCloseTo(0.85, 5)
  })
  it('suggestNext senkt das Gewicht nach langer Pause', () => {
    const last = [1, 2, 3].map(() => ({ weight: 100, reps: 8, rir: 2 }))
    const base = { range: { min: 6, max: 10 }, targetRir: 2, equipment: 'barbell' as const, last }
    expect(suggestNext(base)).toEqual({ weight: 100, reps: 9 })
    expect(suggestNext({ ...base, daysSince: 10 })).toEqual({ weight: 100, reps: 9 })
    expect(suggestNext({ ...base, daysSince: 56 })).toEqual({ weight: 90, reps: 9 })
  })
})

describe('Schema "Wechselnde Bereiche"', () => {
  it('drei Zonen à 3 Wdh. um die Mitte des Basisbereichs', () => {
    expect([0, 1, 2].map((z) => zoneRange({ min: 10, max: 15 }, z))).toEqual([{ min: 11, max: 13 }, { min: 8, max: 10 }, { min: 14, max: 16 }])
    expect(zoneRange({ min: 3, max: 6 }, 1)).toEqual({ min: 3, max: 5 })
  })
  it('Übungen eines Tages stehen in verschiedenen Zonen, jede Übung wechselt wöchentlich', () => {
    const cfg = { repScheme: 'rotating' as const, deload: true, blockWeeks: 5 }
    const pe = { repMin: 6, repMax: 10, rir: 2 }
    const week1 = weekPlan(cfg, 1)
    const day = [0, 1, 2].map((i) => exerciseTargets(pe, week1, i, false).range.min)
    expect(new Set(day).size).toBe(3)
    const ex0 = [0, 1, 2].map((w) => exerciseTargets(pe, weekPlan(cfg, w), 0, false).range.min)
    expect(new Set(ex0).size).toBe(3)
    // Schwere Zone: eine Wdh. mehr Reserve; Deload: mittlere Zone; Zeitübung: unverändert
    expect(exerciseTargets(pe, weekPlan(cfg, 1), 0, false)).toEqual({ range: { min: 4, max: 6 }, rir: 3 })
    expect(exerciseTargets(pe, weekPlan(cfg, 5), 1, false).range).toEqual({ min: 7, max: 9 })
    expect(exerciseTargets({ repMin: 30, repMax: 60, rir: 2 }, week1, 0, true).range).toEqual({ min: 30, max: 60 })
  })
  it('sanfter RIR-Verlauf: höchstens −1 über den Block, Verbund nie unter RIR 1', () => {
    const cfg = { repScheme: 'rotating' as const, deload: false }
    const rirs = (rir: number, compound: boolean) => [0, 1, 2, 3].flatMap((w) => [0, 1, 2].map((i) =>
      exerciseTargets({ repMin: 6, repMax: 10, rir }, weekPlan(cfg, w), i, false, compound).rir))
    expect(Math.min(...rirs(2, true))).toBe(1)
    expect(Math.min(...rirs(1, true))).toBe(1)
    expect(Math.min(...rirs(2, false))).toBe(1)
    expect(Math.min(...rirs(1, false))).toBe(0)
    // Andere Schemata unverändert: Reserve sinkt um bis zu 2
    expect(exerciseTargets({ repMin: 6, repMax: 10, rir: 2 }, weekPlan({ repScheme: 'static', deload: false }, 3), 0, false, true).rir).toBe(0)
  })
  it('Automatik empfiehlt es für Fortgeschrittene (Hypertrophie/Beides)', () => {
    expect(recommendedRepScheme('hypertrophy', 'intermediate')).toBe('rotating')
  })
})

describe('Satz bis Versagen am Blockende', () => {
  it('nur in der letzten Arbeitswoche, nicht im Deload', () => {
    const cfg = { repScheme: 'static' as const, deload: true }
    expect([0, 1, 2, 3, 4].map((w) => !!weekPlan(cfg, w).failureLastSet)).toEqual([false, false, false, true, false])
    expect(!!weekPlan({ ...cfg, blockWeeks: 5 }, 4).failureLastSet).toBe(true)
  })
  it('plannedDay setzt den letzten Arbeitssatz auf RIR 0', () => {
    const day = { id: 'd', name: 'T', exercises: [{ exerciseId: 'bb-bench', sets: 3, repMin: 6, repMax: 10, rir: 2 }] }
    const warm = { warmupMode: 'off' as const, warmupSchemes: DEFAULT_WARMUP_SCHEMES }
    const [v] = plannedDay(day, weekPlan({ repScheme: 'static', deload: true }, 3), [], (id) => exerciseById(id), warm)
    expect(v.failureLast).toBe(true)
    expect(v.setRirs.at(-1)).toBe(0)
  })
})

describe('Plateau-Reset (A1)', () => {
  const at = (weight: number, reps: number) => [1, 2, 3].map(() => ({ weight, reps, rir: 2 }))
  it('befolgt der Nutzer die Vorschläge, folgt nach dem Reset kein zweiter Reset', () => {
    let last = at(100, 6)
    const e1rms = [0, 1, 2].map(() => sessionE1rm(last))
    const resets: boolean[] = []
    for (let i = 0; i < 6; i++) {
      const stalled = isStalled(e1rms)
      const sug = suggestNext({ range, targetRir: 2, equipment: 'barbell', last, stalled })
      resets.push(stalled)
      if (stalled) expect(sug.weight!).toBeLessThan(100)
      last = at(sug.weight!, sug.reps)
      e1rms.push(sessionE1rm(last))
    }
    expect(resets.slice(0, 3)).toEqual([true, false, false])
  })
  it('Reset senkt das Gewicht immer, auch bei grober Rundung', () => {
    const s = suggestNext({ range, targetRir: 2, equipment: 'barbell', last: [{ weight: 20, reps: 8, rir: 2 }], stalled: true })
    expect(s.weight!).toBeLessThan(20)
  })
  it('isStalled ignoriert nur Historie vor einem deutlichen Abfall und Nullwerte', () => {
    expect(isStalled([120, 120, 114])).toBe(false)
    expect(isStalled([120, 114, 117, 117])).toBe(false)
    expect(isStalled([120, 114, 114, 114])).toBe(true)
    expect(isStalled([0, 0, 0])).toBe(false)
  })
  it('Deload-Einheiten lösen keinen Reset aus (plannedDay)', () => {
    const config = cfg({ deload: true })
    const deloadWeek = [0, 1, 2, 3, 4, 5].find((w) => weekPlan(config, w).isDeload)!
    const mk = (date: string, w: number): Session => ({
      programId: 1, dayIndex: 0, date, finishedAt: 0, week: w,
      exercises: [{ exerciseId: 'bb-bench', sets: [{ weight: 100, reps: 6, rir: 2 }] }],
    })
    // Zwei normale Einheiten und eine Deload-Einheit mit gleichem e1RM: ohne Deload-Filter wirkt das wie ein Plateau
    const sessions = [mk('2026-01-01', 0), mk('2026-01-08', 1), mk('2026-01-15', deloadWeek)]
    const day = { id: 'd', name: 'A', exercises: [{ exerciseId: 'bb-bench', sets: 3, repMin: 6, repMax: 10, rir: 2 }] }
    const warm = { warmupMode: 'off' as const, warmupSchemes: {} as never }
    const view = (deload?: (s: Session) => boolean) =>
      plannedDay(day, weekPlan(config, 0), sessions, (id) => exerciseById(id), warm, {}, deload)[0]
    expect(view().sug.weight!).toBeLessThan(100)
    expect(view(deloadSessionOf({ id: 1, config })).sug).toEqual({ weight: 100, reps: 7 })
  })
})

describe('Körpergewicht (A2)', () => {
  const pullups = (reps: number[]): Session => ({
    programId: 1, dayIndex: 0, date: '2026-01-01', finishedAt: 0, week: 0,
    exercises: [{ exerciseId: 'pullup', sets: reps.map((r) => ({ weight: 0, reps: r, rir: 2 })) }],
  })
  it('Klimmzüge 3 × 8 ohne Zusatzgewicht → +1 Wiederholung', () => {
    const last = [8, 8, 8].map((reps) => ({ weight: 0, reps, rir: 2 }))
    expect(suggestNext({ range, targetRir: 2, equipment: 'bodyweight', last })).toEqual({ weight: 0, reps: 9 })
  })
  it('Obergrenze erreicht → Zusatzgewicht an der Untergrenze', () => {
    const last = [10, 10, 10].map((reps) => ({ weight: 0, reps, rir: 2 }))
    const s = suggestNext({ range, targetRir: 2, equipment: 'bodyweight', last })
    expect(s.reps).toBe(6)
    expect(s.weight!).toBeGreaterThan(0)
  })
  it('Sätze ohne Gewicht zählen in Muskel- und Übungsstatistik und stimmen mit weekProgress überein', () => {
    const lookup = (id: string) => exerciseById(id)
    expect(muscleDaily([pullups([8, 8, 8])], 'lats', 'sets', lookup)[0].value).toBe(3)
    expect(exerciseDaily([pullups([8, 8, 8])], 'pullup', 'totalSets')[0].value).toBe(3)
    expect(exerciseDaily([pullups([8, 8, 8])], 'pullup', 'totalReps')[0].value).toBe(24)
    expect(exerciseDaily([pullups([8, 8, 8])], 'pullup', 'bestSetReps')[0].value).toBe(8)
    expect(exerciseDaily([pullups([8, 8, 8])], 'pullup', 'totalVolume')).toEqual([])
  })
  it('Plateau-Erkennung greift bei Körpergewicht ohne Last nicht', () => {
    expect(isStalled([0, 0, 0])).toBe(false)
  })
})

describe('Assistierte Übungen (A4)', () => {
  const last = [12, 12, 12].map((reps) => ({ weight: 30, reps, rir: 2 }))
  it('Obergrenze erreicht → weniger Unterstützung, Wdh. zurück an die Untergrenze', () => {
    expect(suggestNext({ range: { min: 8, max: 12 }, targetRir: 2, equipment: 'machine', last, assisted: true }))
      .toEqual({ weight: 27.5, reps: 8 })
  })
  it('sonst +1 Wiederholung bei gleicher Unterstützung, Plateau-Flag wird ignoriert', () => {
    const l = [9, 9, 9].map((reps) => ({ weight: 30, reps, rir: 2 }))
    expect(suggestNext({ range: { min: 8, max: 12 }, targetRir: 2, equipment: 'machine', last: l, assisted: true, stalled: true }))
      .toEqual({ weight: 30, reps: 10 })
  })
  it('assisted-pullup ist markiert, ohne 1RM/Volumen in der Statistik', () => {
    expect(exerciseById('assisted-pullup')?.assisted).toBe(true)
    const sets = [{ weight: 30, reps: 10, rir: 2 }]
    expect(exerciseValue(sets, 'rm1', 1, true)).toBe(0)
    expect(exerciseValue(sets, 'heaviest', 1, true)).toBe(0)
    expect(exerciseValue(sets, 'totalSets', 1, true)).toBe(1)
  })
})

describe('e1RM-Grenzen (A8)', () => {
  it('eine Wiederholung ohne Reserve ist das 1RM selbst', () => {
    expect(e1rm(100, 1, 0)).toBe(100)
  })
  it('wächst monoton mit den effektiven Wiederholungen, über 12 flacher', () => {
    const f = (n: number) => e1rm(100, n, 0)
    for (let n = 1; n < 25; n++) expect(f(n + 1)).toBeGreaterThan(f(n))
    expect(f(14) - f(13)).toBeLessThan(f(11) - f(10))
  })
  it('Rückrechnung bleibt über die Knickstelle konsistent', () => {
    for (const [reps, rir] of [[5, 0], [10, 2], [15, 3], [20, 0]]) {
      expect(weightForReps(e1rm(80, reps, rir), reps, rir)).toBeCloseTo(80)
    }
  })
  it('fehlendes RIR zählt in Statistik und Progression gleich', () => {
    const noRir = [{ weight: 100, reps: 5 }]
    expect(exerciseValue(noRir, 'rm1')).toBeCloseTo(sessionE1rm(noRir))
    expect(sessionE1rm(noRir)).toBeCloseTo(e1rm(100, 5, 2))
  })
})

describe('Warm-up-Defaults (A9)', () => {
  it('Core ohne Aufwärmsätze, Isolation kürzer als Verbund', () => {
    expect(DEFAULT_WARMUP_SCHEMES.core).toEqual([])
    expect(DEFAULT_WARMUP_SCHEMES.isoUpper.length).toBeLessThan(DEFAULT_WARMUP_SCHEMES.compoundUpper.length)
    expect(DEFAULT_WARMUP_SCHEMES.isoLower.length).toBeLessThan(DEFAULT_WARMUP_SCHEMES.compoundLower.length)
  })
})

describe('Zeitbasierte Übungen (A10)', () => {
  const t = { min: 30, max: 60 }
  const hold = (s: number[], weight = 0) => s.map((reps) => ({ weight, reps, rir: 2 }))
  it('jede zeitbasierte Übung hat metric "time", andere nicht', () => {
    for (const e of EXERCISES) expect(e.metric === 'time', e.id).toBe(TIME_BASED.has(e.id))
  })
  it('+5 s je Einheit, gedeckelt an der Obergrenze', () => {
    expect(suggestNext({ range: t, targetRir: 2, equipment: 'bodyweight', last: hold([40, 40, 45]), metric: 'time' })).toEqual({ weight: 0, reps: 45 })
    expect(suggestNext({ range: t, targetRir: 2, equipment: 'bodyweight', last: hold([58, 60]), metric: 'time' })).toEqual({ weight: 0, reps: 60 })
  })
  it('an der Obergrenze mit Zusatzlast: mehr Gewicht, Zeit zurück an die Untergrenze', () => {
    expect(suggestNext({ range: t, targetRir: 2, equipment: 'kettlebell', last: hold([60, 60], 16), metric: 'time' })).toEqual({ weight: 20, reps: 30 })
  })
  it('kein Plateau-Reset und keine Wdh.-Progression', () => {
    expect(suggestNext({ range: t, targetRir: 2, equipment: 'bodyweight', last: hold([30, 30]), stalled: true, metric: 'time' }).reps).toBe(35)
  })
  it('keine 1RM-/Volumenwerte, aber Sätze zählen', () => {
    expect(noLoadStats(exerciseById('plank'))).toBe(true)
    expect(noLoadStats(exerciseById('bb-bench'))).toBe(false)
    const sessions: Session[] = [session('2026-01-01', [{ weight: 20, reps: 45 }, { weight: 20, reps: 45 }], 'suitcase-carry')]
    expect(muscleDaily(sessions, 'forearms', 'volume', (id) => exerciseById(id))).toEqual([])
    expect(muscleDaily(sessions, 'forearms', 'sets', (id) => exerciseById(id)).length).toBe(1)
  })
  it('Generator vergibt für explizit gewählte Zeitübungen eine Sekunden-Range', () => {
    const { program } = generate(cfg({ equipment: ['bodyweight'], includeExercises: ['copenhagen-plank'], time: 'o120' }), ALL_EXERCISES)
    const pe = program.days.flatMap((d) => d.exercises).find((e) => e.exerciseId === 'copenhagen-plank')!
    expect(pe).toBeDefined()
    expect(pe.repMin).toBe(TIME_RANGE.min)
    expect(pe.repMax).toBe(TIME_RANGE.max)
  })
})

describe('Szenario: 12 Wochen nach Plan trainieren (T1)', () => {
  const config = cfg({ deload: true, repScheme: 'static' })
  const day = { id: 'd', name: 'A', exercises: [{ exerciseId: 'bb-bench', sets: 3, repMin: 6, repMax: 10, rir: 2 }] }
  const warm = { warmupMode: 'off' as const, warmupSchemes: {} as never }
  const run = (weeks: number) => {
    const sessions: Session[] = []
    const log: { week: number; deload: boolean; weight: number; reps: number }[] = []
    for (let w = 0; w < weeks; w++) {
      const plan = weekPlan(config, w)
      const v = plannedDay(day, plan, sessions, (id) => exerciseById(id), warm, {}, deloadSessionOf({ id: 1, config }))[0]
      const weight = v.sug.weight ?? 60
      log.push({ week: w, deload: plan.isDeload, weight, reps: v.sug.reps })
      // Nutzer erfüllt jeden Vorschlag und erreicht genau den Ziel-RIR
      sessions.push({
        programId: 1, dayIndex: 0, date: `2026-01-${String(w + 1).padStart(2, '0')}`, finishedAt: w, week: w,
        exercises: [{ exerciseId: 'bb-bench', sets: v.setRirs.map((rir) => ({ weight, reps: v.sug.reps, rir })) }],
      })
    }
    return log
  }
  it('Gewichte sinken nie außer im Deload (kein Reset ohne Leistungsabfall)', () => {
    const log = run(12)
    for (let i = 1; i < log.length; i++) {
      if (log[i].deload) continue
      // Vergleich mit der letzten Nicht-Deload-Woche
      const prev = [...log.slice(0, i)].reverse().find((l) => !l.deload)!
      expect(log[i].weight, `Woche ${i}`).toBeGreaterThanOrEqual(prev.weight)
    }
  })
  it('Deload ist nicht schwerer als die Woche davor', () => {
    const log = run(12)
    for (const l of log.filter((x) => x.deload)) expect(l.weight).toBeLessThanOrEqual(log[l.week - 1].weight)
  })
  it('Wiederholungen steigen innerhalb eines Gewichts, bleiben in der Range', () => {
    for (const l of run(12)) { expect(l.reps).toBeGreaterThanOrEqual(6); expect(l.reps).toBeLessThanOrEqual(10) }
  })
  it('nach 12 Wochen ist das Gewicht gestiegen', () => {
    const log = run(12)
    expect(log.at(-1)!.weight).toBeGreaterThan(log[0].weight)
  })
})

describe('Einheit lb (B7)', () => {
  const lb = (kg: number) => kg / 0.45359237
  const isMultiple = (v: number, step: number) => Math.abs(v / step - Math.round(v / step)) < 1e-6

  it('Schrittweite: 5 lb Stange, 2,5 lb Kurzhantel, in kg unverändert', () => {
    expect(incrementKg('barbell', 'lb')).toBeCloseTo(5 * 0.45359237, 6)
    expect(incrementKg('dumbbell', 'lb')).toBeCloseTo(2.5 * 0.45359237, 6)
    expect(incrementKg('barbell')).toBe(2.5)
    expect(incrementKg('dumbbell', 'kg')).toBe(2)
  })
  it('Vorschlag Stange: glatte lb-Werte statt 5,5-lb-Sprüngen', () => {
    const last = [{ weight: 100, reps: 8, rir: 2 }, { weight: 100, reps: 8, rir: 2 }]
    const sug = suggestNext({ range: { min: 6, max: 8 }, targetRir: 2, equipment: 'barbell', last, unit: 'lb' })
    expect(isMultiple(lb(sug.weight!), 5)).toBe(true)
    expect(sug.weight!).toBeGreaterThan(100)
  })
  it('Vorschlag Kurzhantel: Vielfache von 2,5 lb', () => {
    const last = [{ weight: 22.68, reps: 12, rir: 1 }, { weight: 22.68, reps: 12, rir: 1 }]
    const sug = suggestNext({ range: { min: 8, max: 12 }, targetRir: 2, equipment: 'dumbbell', last, unit: 'lb' })
    expect(isMultiple(lb(sug.weight!), 2.5)).toBe(true)
  })
  it('Anpassung zwischen Sätzen rundet in lb', () => {
    const [n] = adaptNextSets({ weight: 60, reps: 8, rir: 0, planWeight: 60, planReps: 8, planRir: 3 }, [{ planWeight: 60, rir: 3 }], { min: 6, max: 10 }, 'barbell', 'lb')
    if (!n) throw new Error('erwartet Anpassung')
    expect(n.weight).toBeLessThan(60)
    expect(isMultiple(lb(n.weight), 5)).toBe(true)
  })
  it('Aufwärmsätze runden in lb, leere Stange = 45 lb', () => {
    const sets = stepsToSets([{ pct: 40, reps: 5 }, { pct: 60, reps: 5 }], 140, 'barbell', 'lb')
    for (const s of sets) expect(isMultiple(lb(s.weight!), 5)).toBe(true)
    const light = stepsToSets([{ pct: 20, reps: 5 }], 100, 'barbell', 'lb')
    expect(lb(light[0].weight!)).toBeCloseTo(45, 6)
  })
})

describe('Aufwärmsätze ohne doppelte Gewichte (B7)', () => {
  it('neue Sätze mit dem Gewicht eines abgehakten Satzes entfallen', () => {
    const fresh = [{ weight: 40, reps: 5 }, { weight: 60, reps: 5 }, { weight: 80, reps: 3 }]
    expect(dedupeWarmups(fresh, [{ weight: 60 }])).toEqual([{ weight: 40, reps: 5 }, { weight: 80, reps: 3 }])
  })
  it('gleiche Gewichte in den neuen Sätzen selbst werden einmal behalten, ohne Gewicht bleibt', () => {
    expect(dedupeWarmups([{ weight: 50, reps: 5 }, { weight: 50, reps: 3 }, { weight: null, reps: 8 }], [])).toEqual([
      { weight: 50, reps: 5 }, { weight: null, reps: 8 },
    ])
  })
})

describe('Gerätegewichte', () => {
  const range = { min: 6, max: 10 }
  const r5: WeightScale = { kind: 'range', min: 0, max: 250, step: 5 }
  const list: WeightScale = { kind: 'list', weights: [15, 10, 2, 4, 6, 8, 12.5, 12.5] }

  it('Range: snap, Schritte und Klemmen', () => {
    expect(snapToScale(22, r5)).toBe(20)
    expect(snapToScale(23, r5)).toBe(25)
    expect(snapToScale(999, r5)).toBe(250)
    expect(snapToScale(-3, r5)).toBe(0)
    expect(stepUp(20, r5)).toBe(25)
    expect(stepUp(21, r5)).toBe(25)
    expect(stepDown(20, r5)).toBe(15)
    expect(stepDown(21, r5)).toBe(20)
    expect(stepUp(250, r5)).toBe(250)
    expect(stepDown(0, r5)).toBe(0)
    expect(floorToScale(24, r5)).toBe(20)
    expect(effectiveStep(r5)).toBe(5)
  })
  it('Range: Maximum, das kein Vielfaches ist, wird abgerundet', () => {
    const s: WeightScale = { kind: 'range', min: 2.5, max: 100, step: 5 }
    expect(snapToScale(500, s)).toBe(97.5)
    expect(stepUp(97.5, s)).toBe(97.5)
  })
  it('Liste mit Lücken: nur vorhandene Werte', () => {
    expect(snapToScale(11, list)).toBe(10)
    expect(snapToScale(11.5, list)).toBe(12.5)
    expect(snapToScale(100, list)).toBe(15)
    expect(snapToScale(0.5, list)).toBe(2)
    expect(stepUp(10, list)).toBe(12.5)
    expect(stepUp(12.5, list)).toBe(15)
    expect(stepUp(15, list)).toBe(15)
    expect(stepDown(12.5, list)).toBe(10)
    expect(stepDown(2, list)).toBe(2)
    expect(effectiveStep(list)).toBe(2)
  })
  it('suggestNext: Vorschlag liegt immer auf der 5-kg-Skala', () => {
    for (const w of [37.5, 40, 42.5, 47.5, 52.5]) {
      for (const reps of [6, 8, 10]) {
        const last = [1, 2, 3].map(() => ({ weight: w, reps, rir: 2 }))
        const s = suggestNext({ range, targetRir: 2, equipment: 'cable', last, scale: { kind: 'range', min: 5, max: 100, step: 5 } })
        expect(s.weight! % 5).toBe(0)
      }
    }
  })
  it('suggestNext: Obergrenze erreicht → genau eine Stufe höher (Kabel 5 kg)', () => {
    const last = [1, 2, 3].map(() => ({ weight: 40, reps: 10, rir: 2 }))
    const s = suggestNext({ range, targetRir: 2, equipment: 'cable', last, scale: { kind: 'range', min: 5, max: 100, step: 5 } })
    expect(s.reps).toBe(6)
    expect(s.weight).toBe(45)
  })
  it('suggestNext: Kurzhantelliste mit Lücke, nie ein Wert außerhalb', () => {
    const l: WeightScale = { kind: 'list', weights: [10, 12.5, 15] }
    const last = [1, 2].map(() => ({ weight: 10, reps: 10, rir: 2 }))
    // 10 → 12,5 kg (+25 %) ist für 6–10 Wdh. zu groß: Gewicht halten, Wdh. über die Obergrenze
    expect(suggestNext({ range, targetRir: 2, equipment: 'dumbbell', last, scale: l })).toMatchObject({ weight: 10, reps: 11, note: 'extend', nextWeight: 12.5 })
    const top = [1, 2].map(() => ({ weight: 15, reps: 10, rir: 2 }))
    // Ende der Liste: Gewicht halten, Wdh. steigen weiter statt zurück an die Untergrenze
    expect(suggestNext({ range, targetRir: 2, equipment: 'dumbbell', last: top, scale: l })).toMatchObject({ weight: 15, reps: 11, note: 'gap' })
    const mid = [1, 2].map(() => ({ weight: 12.5, reps: 8, rir: 2 }))
    expect([10, 12.5, 15]).toContain(suggestNext({ range, targetRir: 2, equipment: 'dumbbell', last: mid, scale: l }).weight)
  })
  it('suggestNext: Plateau-Reset geht mindestens eine Stufe runter', () => {
    const last = [1, 2].map(() => ({ weight: 40, reps: 6, rir: 2 }))
    const s = suggestNext({ range, targetRir: 2, equipment: 'cable', last, stalled: true, scale: r5 })
    expect(s.weight!).toBeLessThanOrEqual(35)
    expect(s.weight! % 5).toBe(0)
  })
  it('assistiert: weniger Unterstützung um eine Stufe', () => {
    const last = [12, 12, 12].map((reps) => ({ weight: 30, reps, rir: 2 }))
    expect(suggestNext({ range: { min: 8, max: 12 }, targetRir: 2, equipment: 'machine', last, assisted: true, scale: r5 }))
      .toEqual({ weight: 25, reps: 8 })
  })
  it('Zeitübung mit Zusatzlast: nächste Stufe', () => {
    const last = [60, 60].map((reps) => ({ weight: 16, reps, rir: 2 }))
    expect(suggestNext({ range: { min: 30, max: 60 }, targetRir: 2, equipment: 'kettlebell', last, metric: 'time', scale: { kind: 'list', weights: [16, 24, 32] } }))
      .toEqual({ weight: 24, reps: 30 })
  })
  it('adaptNextSets rundet auf die Skala', () => {
    const plan = { planWeight: 60, planReps: 8, planRir: 3 }
    expect(adaptNextSets({ weight: 60, reps: 8, rir: 8, ...plan }, [{ planWeight: 60, rir: 3 }], { min: 6, max: 10 }, 'cable', 'kg', r5))
      .toEqual([{ weight: 65, reps: 8 }])
  })
  it('Aufwärmsätze liegen auf der Skala', () => {
    const sets = stepsToSets([{ pct: 40, reps: 8 }, { pct: 70, reps: 5 }], 62.5, 'machine', 'kg', r5)
    for (const s of sets) expect(s.weight! % 5).toBe(0)
  })
  it('Regression: ohne Skala unverändert', () => {
    const last = [1, 2, 3].map(() => ({ weight: 60, reps: 10, rir: 2 }))
    const a = suggestNext({ range, targetRir: 2, equipment: 'barbell', last })
    expect(suggestNext({ range, targetRir: 2, equipment: 'barbell', last, scale: undefined })).toEqual(a)
    expect(stepsToSets(DEFAULT_WARMUP_SCHEMES.compoundUpper, 100, 'barbell')).toEqual(stepsToSets(DEFAULT_WARMUP_SCHEMES.compoundUpper, 100, 'barbell', 'kg', undefined))
  })
})

describe('weeklyOverview (Wizard-Vorschau)', () => {
  const pe = { sets: 4, repMin: 6, repMax: 10, rir: 2 }
  it('4 Arbeitswochen + Deload, Werte wie plannedDay', () => {
    const o = weeklyOverview(pe, { repScheme: 'linear', deload: true }, {})
    expect(o).toHaveLength(5)
    expect(o[4].isDeload).toBe(true)
    expect(o[4].sets).toBe(2)
    expect(o[4].rir).toBe(5)
    expect(o[2].repMin).toBe(4)
    expect(o[3].sets).toBe(5)
    expect(o[0].rir).toBe(2)
  })
  it('ohne Deload nur 4 Wochen, Zeitübung ohne Rep-Verschiebung', () => {
    const o = weeklyOverview({ ...pe, repMin: 30, repMax: 60 }, { repScheme: 'linear', deload: false }, { metric: 'time' })
    expect(o).toHaveLength(4)
    expect(o.every((w) => w.repMin === 30 && w.repMax === 60)).toBe(true)
  })
})

describe('recommendedRepScheme', () => {
  it('Einsteiger static, Kraft linear, sonst wechselnde Bereiche', () => {
    expect(recommendedRepScheme('hypertrophy', 'none')).toBe('static')
    expect(recommendedRepScheme('strength', 'beginner')).toBe('static')
    expect(recommendedRepScheme('strength', 'advanced')).toBe('linear')
    expect(recommendedRepScheme('hypertrophy', 'intermediate')).toBe('rotating')
  })
})

describe('Trainings-Import (CSV)', () => {
  const csv = [
    '﻿"Datum","Trainingsdauer","Training","Übung","Übungsgrundgewicht (kg)","Satztyp","Gewicht (kg)","Wiederholungen","RIR","Dauer","Distanz kurz (m)","Distanz lang (km)"',
    '"2026-05-02","3498","Plan (Workout A)","Barbell Bench Press",,"Warm-Up Set","20.0","8.0",,,,',
    '"2026-05-02","3498","Plan (Workout A)","Barbell Bench Press",,"Standard Set","50.0","5.0","3",,,',
    '"2026-05-02","3498","Plan (Workout A)","Barbell Bench Press",,"Failure Set","50.0","6.0",,,,',
    '"2026-05-02","3498","Plan (Workout A)","Running",,"Standard Set",,,,"600",,"0.89"',
    '"2026-05-02","3498","Plan (Workout A)","Mystery Move",,"Standard Set","10","10","2",,,',
    '"2026-05-04","3000","Plan (Workout B)","Cable Straight Bar Biceps Curl",,"Standard Set","40,0","11","1",,,',
  ].join('\r\n')
  const lookup = (id: string) => exerciseById(id)
  it('liest Sätze, Satztypen, Cardio und Dezimalkomma', () => {
    const rows = parseTrainingCsv(csv)
    expect(rows).toHaveLength(6)
    expect(rows[0]).toMatchObject({ date: '2026-05-02', exercise: 'Barbell Bench Press', type: 'warmup', weight: 20, reps: 8 })
    expect(rows[2].type).toBe('failure')
    expect(rows[3]).toMatchObject({ seconds: 600, km: 0.89 })
    expect(rows[5].weight).toBe(40)
  })
  it('ordnet bekannte Namen zu, unbekannte bleiben offen', () => {
    const m = suggestMapping(['Barbell Bench Press', 'Running', 'Mystery Move', 'Kabel-Curl'], ALL_EXERCISES)
    expect(m).toEqual({ 'Barbell Bench Press': 'bb-bench', Running: 'c-run', 'Mystery Move': null, 'Kabel-Curl': 'cable-curl' })
  })
  it('baut Einheiten je Tag und Training, Versagen ohne RIR = 0, überspringt Duplikate', () => {
    const rows = parseTrainingCsv(csv)
    const mapping = suggestMapping([...new Set(rows.map((r) => r.exercise))], ALL_EXERCISES)
    const res = buildImportSessions(rows, mapping, [], lookup)
    expect(res.sessions).toHaveLength(2)
    expect(res.skippedSets).toBe(1)
    const [a, b] = res.sessions
    expect(a).toMatchObject({ programId: null, date: '2026-05-02', durationSec: 3498, week: 0 })
    expect(a.exercises[0].sets).toEqual([{ weight: 20, reps: 8, warmup: true }, { weight: 50, reps: 5, rir: 3 }, { weight: 50, reps: 6, rir: 0 }])
    expect(a.exercises[1]).toEqual({ exerciseId: 'c-run', sets: [{ reps: 0, weight: 0, minutes: 10, km: 0.89 }] })
    expect(b.exercises[0].exerciseId).toBe('cable-curl')
    // Zweiter Import derselben Datei: nichts Neues
    const again = buildImportSessions(rows, mapping, res.sessions, lookup)
    expect(again.sessions).toHaveLength(0)
    expect(again.duplicates).toBe(3)
  })
  it('fehlende Pflichtspalten ergeben eine verständliche Fehlermeldung', () => {
    expect(() => parseTrainingCsv('a,b\n1,2')).toThrow(/Datum/)
  })
  it('alle Aliase zeigen auf vorhandene Übungen', () => {
    for (const id of Object.values(IMPORT_ALIASES)) expect(ALL_EXERCISES.some((e) => e.id === id)).toBe(true)
  })
})

describe('Wochenauswahl', () => {
  const prog = (config?: Partial<ProgramConfig>) => ({
    id: 1, name: 'P', days: [], weekSlots: [], active: true, createdAt: 0,
    ...(config ? { config: { ...cfg(), ...config } } : {}),
  }) as unknown as Program
  const at = (week: number) => ({ programId: 1, dayIndex: 0, date: '2026-01-01', finishedAt: 0, week, exercises: [] }) as Session
  it('zeigt genau einen Block (Arbeitswochen + Deload), ein Sprung verlängert die Liste nicht', () => {
    const p = prog({ deload: true })
    expect(weekOptions(p, [], 0).map((o) => o.label)).toEqual(['Woche 1', 'Woche 2', 'Woche 3', 'Woche 4', 'Deload'])
    expect(weekOptions(p, [], 2)).toHaveLength(5)
    expect(weekOptions(prog({ deload: true, blockWeeks: 5 }), [], 4).map((o) => o.label).at(-1)).toBe('Deload')
    expect(weekOptions(prog({ deload: false, blockWeeks: 6 }), [], 0)).toHaveLength(6)
  })
  it('zweiter Block erscheint erst, wenn er erreicht ist; Beschriftung mit Block', () => {
    const p = prog({ deload: true })
    expect(weekOptions(p, [at(5)], 0)).toHaveLength(10)
    expect(weekOptions(p, [], 6).map((o) => o.block).at(-1)).toBe(1)
    expect(weekLabel(p, 4)).toBe('Deload')
    expect(weekLabel(p, 6)).toBe('Woche 2 · Block 2')
  })
  it('ohne Periodisierung: bis eine Woche nach der letzten trainierten, ohne Wachstum durch Auswahl', () => {
    const p = prog()
    expect(weekOptions(p, [at(1)], 0)).toHaveLength(3)
    expect(weekOptions(p, [at(1)], 2)).toHaveLength(3)
  })
})

describe('Körpergewichtsanteil', () => {
  const pull = exerciseById('pullup')!
  const weights = [{ date: '2026-01-10', kg: 80 }, { date: '2026-03-01', kg: 78 }]

  it('Anteile gehören zu existierenden Körpergewichtsübungen im Bereich 0–1', () => {
    for (const [id, share] of Object.entries(BODYWEIGHT_SHARE)) {
      const ex = exerciseById(id)
      expect(ex, id).toBeDefined()
      expect(ex!.equipment).toBe('bodyweight')
      expect(ex!.bodyweight).toBe(share)
      expect(share > 0 && share <= 1).toBe(true)
    }
    expect(exerciseById('plank')!.bodyweight).toBeUndefined()
  })

  it('Körpergewicht am Datum: letzter Eintrag davor, vor der ersten Messung der früheste', () => {
    expect(bodyweightAt(weights, '2026-02-15')).toBe(80)
    expect(bodyweightAt(weights, '2026-03-01')).toBe(78)
    expect(bodyweightAt(weights, '2025-12-01')).toBe(80)
    expect(bodyweightAt([], '2026-01-01')).toBeUndefined()
  })

  it('Körperlast nur bei Anteil, bekanntem Gewicht und nicht assistiert', () => {
    expect(bodyLoadOf(pull, 80)).toBe(76)
    expect(bodyLoadOf(pull, undefined)).toBe(0)
    expect(bodyLoadOf({ ...pull, assisted: true }, 80)).toBe(0)
    expect(bodyLoadOf(exerciseById('bb-bench'), 80)).toBe(0)
  })

  it('ohne Körperlast bleibt die reine Wiederholungs-Progression', () => {
    const last = [{ weight: 0, reps: 8, rir: 2 }, { weight: 0, reps: 8, rir: 2 }]
    expect(suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last })).toEqual({ weight: 0, reps: 9 })
  })

  it('mit Körperlast: unter der Obergrenze +1 Wdh. ohne Zusatzgewicht', () => {
    const last = [{ weight: 0, reps: 8, rir: 2 }, { weight: 0, reps: 8, rir: 2 }]
    expect(suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last, bodyLoad: 76 })).toEqual({ weight: 0, reps: 9 })
  })

  it('mit Körperlast: an der Obergrenze sanfter Einstieg mit kleinster Zusatzstufe und Wdh. aus dem e1RM', () => {
    const last = [{ weight: 0, reps: 10, rir: 2 }, { weight: 0, reps: 10, rir: 2 }]
    // e1RM 76 × (1 + 12/30) = 106,4; bei 78,5 kg ≈ 10,7 eff. Wdh. − 2 RIR → 8
    expect(suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last, bodyLoad: 76 })).toEqual({ weight: 2.5, reps: 8 })
    // mit Gerätegewicht-Skala (Gewichtsscheiben am Gürtel): kleinste Stufe
    const scale: WeightScale = { kind: 'list', weights: [1.25, 2.5, 5, 10] }
    expect(suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last, bodyLoad: 76, scale }).weight).toBe(1.25)
  })

  it('mit Körperlast und schon Zusatzgewicht: an der Obergrenze normaler Sprung (gedeckelt)', () => {
    const last = [{ weight: 5, reps: 10, rir: 2 }, { weight: 5, reps: 10, rir: 2 }]
    const sug = suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last, bodyLoad: 76 })
    expect(sug.reps).toBe(6)
    const cap = weightForReps(e1rm(81, 10, 2) * 1.05, 6, 2) - 76
    expect(sug.weight!).toBeGreaterThan(5)
    expect(sug.weight!).toBeLessThanOrEqual(cap)
  })

  it('gewichtete Sätze: e1RM auf Gesamtlast, Vorschlag bleibt Zusatzgewicht', () => {
    const last = [{ weight: 10, reps: 7, rir: 2 }]
    const sug = suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last, bodyLoad: 76 })
    expect(sug).toEqual({ weight: 10, reps: 8 })
  })

  it('geändertes Körpergewicht: Halten heißt gleiches Zusatzgewicht', () => {
    // letzte Einheit bei 80 kg (Last 76), heute 78 kg (Last 74,1): kein Zusatzgewicht, nur weil man leichter ist
    const last = [{ weight: 0, reps: 8, rir: 2 }]
    const sug = suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last, bodyLoad: 74.1, lastBodyLoad: 76 })
    expect(sug.reps).toBe(9)
    expect(sug.weight).toBe(0)
  })

  it('Anpassung der Folgesätze funktioniert auch ohne Zusatzgewicht', () => {
    // geplant 0 kg × 8 @2, geschafft nur 5 @0: Folgesätze bekommen weniger Wdh.
    const res = adaptNextSets({ weight: 0, reps: 5, rir: 0, planWeight: 0, planReps: 8, planRir: 2 },
      [{ planWeight: 0, rir: 2 }], { min: 6, max: 10 }, 'bodyweight', 'kg', undefined, 76)
    expect(res[0]).not.toBeNull()
    expect(res[0]!.weight).toBe(0)
    expect(res[0]!.reps).toBeLessThan(8)
    // ohne Körperlast keine Anpassung (Gewicht 0)
    expect(adaptNextSets({ weight: 0, reps: 5, rir: 0, planWeight: 0, planReps: 8, planRir: 2 },
      [{ planWeight: 0, rir: 2 }], { min: 6, max: 10 }, 'bodyweight')).toEqual([null])
  })

  it('Statistik: 1RM und Volumen mit Körpergewicht am Tag der Einheit', () => {
    const s: Session = { programId: null, dayIndex: 0, date: '2026-02-01', finishedAt: 1, week: 0,
      exercises: [{ exerciseId: 'pullup', sets: [{ weight: 0, reps: 10, rir: 0 }, { weight: 0, reps: 5, warmup: true }] }] }
    const [t] = applyBodyweight([s], (id) => exerciseById(id), weights)
    expect(t.exercises[0].sets[0].weight).toBe(76)
    expect(t.exercises[0].sets[1].weight).toBe(0)
    expect(exerciseValue(t.exercises[0].sets, 'totalVolume')).toBe(760)
    expect(exerciseValue(s.exercises[0].sets, 'totalVolume')).toBe(0)
    expect(applyBodyweight([s], (id) => exerciseById(id), [])[0]).toBe(s)
  })

  it('plannedDay rechnet mit Körperlast und gibt Zusatzgewicht zurück', () => {
    const day = { id: 'd', name: 'A', exercises: [{ exerciseId: 'pullup', sets: 3, repMin: 6, repMax: 10, rir: 2 }] }
    const sessions: Session[] = [{ programId: null, dayIndex: 0, date: '2026-03-02', finishedAt: 1, week: 0,
      exercises: [{ exerciseId: 'pullup', sets: [{ weight: 0, reps: 10, rir: 2 }, { weight: 0, reps: 10, rir: 2 }] }] }]
    const plan = weekPlan({ deload: false, repScheme: 'static' } as ProgramConfig, 0)
    const settings = { warmupMode: 'off' as const, warmupSchemes: {} as never }
    const [withBw] = plannedDay(day, plan, sessions, (id) => exerciseById(id), settings, {}, undefined, '2026-03-05', weights)
    expect(withBw.bodyLoad).toBeCloseTo(74.1)
    expect(withBw.sug.weight!).toBeGreaterThan(0)
    const [without] = plannedDay(day, plan, sessions, (id) => exerciseById(id), settings, {}, undefined, '2026-03-05')
    expect(without.bodyLoad).toBe(0)
    expect(without.sug.weight).toBe(2.5)
  })
})

describe('Supersätze', () => {
  const pe = (id: string, superset?: string) => ({ exerciseId: id, sets: 3, repMin: 8, repMax: 12, rir: 2, ...(superset ? { superset } : {}) })
  const ids = (l: { superset?: string }[]) => l.map((e) => e.superset ?? '-')

  it('verbinden mit nächster/vorheriger, ID = erste Übung des Laufs', () => {
    const l = [pe('a'), pe('b'), pe('c'), pe('d')]
    expect(ids(setSupersetLink(l, 1, 'next'))).toEqual(['-', 'b', 'b', '-'])
    expect(ids(setSupersetLink(l, 1, 'prev'))).toEqual(['a', 'a', '-', '-'])
    // drei Übungen: c an den bestehenden Supersatz a–b hängen
    expect(ids(setSupersetLink([pe('a', 'a'), pe('b', 'a'), pe('c'), pe('d')], 2, 'prev'))).toEqual(['a', 'a', 'a', '-'])
  })

  it('lösen: aus der Mitte trennt die Gruppe, Einzelne verlieren die ID', () => {
    const l = [pe('a', 'a'), pe('b', 'a'), pe('c', 'a'), pe('d', 'a')]
    expect(ids(setSupersetLink(l, 1, 'none'))).toEqual(['-', '-', 'c', 'c'])
    expect(ids(setSupersetLink([pe('a', 'a'), pe('b', 'a')], 0, 'none'))).toEqual(['-', '-'])
  })

  it('normalisiert: nicht benachbarte gleiche IDs werden getrennt', () => {
    const l = [pe('a', 'x'), pe('b'), pe('c', 'x')]
    expect(ids(withLinks(l, linksOf(l)))).toEqual(['-', '-', '-'])
    expect(supersetMembers([pe('a', 'a'), pe('b', 'a'), pe('c')], 'b')).toEqual(['a', 'b'])
    expect(supersetMembers([pe('a'), pe('b')], 'a')).toEqual([])
  })

  it('Umschalten einer Verbindung (Programm-Erstellung) und Normalisieren mit veralteter ID', () => {
    const l = [pe('a'), pe('b'), pe('c')]
    const ab = toggleSupersetLink(l, 0)
    expect(ids(ab)).toEqual(['a', 'a', '-'])
    expect(ids(toggleSupersetLink(ab, 1))).toEqual(['a', 'a', 'a'])
    expect(ids(toggleSupersetLink(toggleSupersetLink(ab, 1), 0))).toEqual(['-', 'b', 'b'])
    expect(toggleSupersetLink(l, 2)).toBe(l)
    // erste Übung getauscht: ID nennt noch die alte Übung, wird beim Speichern neu gesetzt
    expect(ids(normalizeSupersets([pe('x', 'a'), pe('b', 'a')]))).toEqual(['x', 'x'])
  })

  it('Ablauf: nach A zu B ohne Pause, nach B Pause und zurück zu A', () => {
    const open = new Set(['a', 'b'])
    expect(nextInSuperset(['a', 'b'], 'a', (m) => open.has(m))).toEqual({ next: 'b', rest: false })
    expect(nextInSuperset(['a', 'b'], 'b', (m) => open.has(m))).toEqual({ next: 'a', rest: true })
    // A ist fertig: B bleibt, mit Pause
    expect(nextInSuperset(['a', 'b'], 'b', (m) => m === 'b')).toEqual({ next: 'b', rest: true })
    expect(nextInSuperset(['a', 'b'], 'b', () => false)).toEqual({ next: null, rest: true })
  })
})

describe('Satztypen', () => {
  it('Drop-Segment: Gewicht −20 % gerundet, Wdh. 75 %; Myo: gleiches Gewicht, ein Drittel', () => {
    const snap = (w: number) => Math.round(w / 2.5) * 2.5
    expect(nextSegment('drop', { weight: 50, reps: 10, segment: false }, snap)).toEqual({ weight: snap(50 * DROP_FACTOR), reps: 8 })
    expect(nextSegment('myo', { weight: 30, reps: 15, segment: false }, snap)).toEqual({ weight: 30, reps: 5 })
    // weiteres Segment übernimmt die Wdh. des Segments davor
    expect(nextSegment('myo', { weight: 30, reps: 4, segment: true }, snap)).toEqual({ weight: 30, reps: 4 })
    // Rundung darf nie schwerer werden als vorher
    expect(nextSegment('drop', { weight: 2.5, reps: 10, segment: false }, () => 5).weight).toBe(2.5)
    expect(nextSegment('drop', { weight: null, reps: 0, segment: false }, snap)).toEqual({ weight: null, reps: null })
  })

  const sets = [
    { weight: 50, reps: 10, rir: 0, failure: true },
    { weight: 40, reps: 6, segment: 'drop' as const },
    { weight: 20, reps: 5, warmup: true },
    { weight: 50, reps: 8, rir: 1, partial: 2 },
  ]

  it('Segmente zählen für Wdh. und Volumen, nicht als Satz und nicht für 1RM/Bestwerte', () => {
    expect(exerciseValue(sets, 'totalSets')).toBe(2)
    expect(exerciseValue(sets, 'totalReps')).toBe(24)
    expect(exerciseValue(sets, 'totalVolume')).toBe(50 * 10 + 40 * 6 + 50 * 8)
    expect(exerciseValue(sets, 'heaviest')).toBe(50)
    expect(exerciseValue([{ weight: 40, reps: 20, segment: 'myo' as const }, { weight: 40, reps: 8, rir: 2 }], 'bestSetReps')).toBe(8)
    expect(exerciseValue(sets, 'rm1')).toBeCloseTo(e1rm(50, 10, 0))
  })

  it('Progression und Vergleichszeilen ignorieren Segmente', () => {
    const s: Session = { programId: null, dayIndex: 0, date: '2026-05-01', finishedAt: 1, week: 0, exercises: [{ exerciseId: 'x', sets }] }
    expect(previousSets([s], 'x').work.map((x) => x.reps)).toEqual([10, 8])
    expect(sessionE1rm([{ weight: 40, reps: 30, segment: 'myo' }, { weight: 40, reps: 8, rir: 2 }])).toBeCloseTo(e1rm(40, 8, 2))
    const sug = suggestNext({ range: { min: 8, max: 12 }, targetRir: 2, equipment: 'barbell', last: [{ weight: 50, reps: 12, rir: 2 }, { weight: 40, reps: 3, segment: 'drop' }] })
    expect(sug.weight).toBeGreaterThan(50)
  })

  it('Muskel-Sätze ohne Segmente', () => {
    const s: Session = { programId: null, dayIndex: 0, date: '2026-05-01', finishedAt: 1, week: 0, exercises: [{ exerciseId: 'bb-bench', sets }] }
    expect(muscleDaily([s], 'chest', 'sets', (id) => exerciseById(id))[0].value).toBe(2)
  })
})

describe('Equipment-Grenzen', () => {
  const r = { min: 12, max: 15 }
  const sets = (weight: number, reps: number, rir = 2) => [1, 2, 3].map(() => ({ weight, reps, rir }))
  it('Seitheben 10 kg × 15: +2 kg wäre zu viel, Wdh. steigen über die Obergrenze', () => {
    const s = suggestNext({ range: r, targetRir: 2, equipment: 'dumbbell', last: sets(10, 15) })
    expect(s).toMatchObject({ weight: 10, reps: 16, note: 'extend', nextWeight: 12 })
  })
  it('erweiterter Bereich endet bei Obergrenze + 25 %, dann Sprung mit Hinweis', () => {
    // 15 + ceil(3,75) = 19
    expect(suggestNext({ range: r, targetRir: 2, equipment: 'dumbbell', last: sets(10, 18) })).toMatchObject({ weight: 10, reps: 19, note: 'extend' })
    // 10 × 19 @2 → Epley 17 kg → 12 kg: 10 Wdh. (Untergrenze 12 − 1 nicht erreicht)
    expect(suggestNext({ range: r, targetRir: 2, equipment: 'dumbbell', last: sets(10, 19) })).toMatchObject({ weight: 12, reps: 10, note: 'gap', nextWeight: 12 })
  })
  it('Sprung, sobald die nächste Stufe die Untergrenze (−1) trägt', () => {
    // 24 → 26 kg (+8 %): 24 × 15 @2 → Epley 37,6 kg → 26 kg: 11 Wdh. ≥ 12 − 1
    const s = suggestNext({ range: r, targetRir: 2, equipment: 'dumbbell', last: sets(24, 15) })
    expect(s.note).toBeUndefined()
    expect(s.weight).toBe(26)
    expect(s.reps).toBe(12)
  })
  it('+10 % bei 15 Wdh.: eine Einheit erweitern, dann Sprung', () => {
    expect(suggestNext({ range: r, targetRir: 2, equipment: 'dumbbell', last: sets(20, 15) })).toMatchObject({ weight: 20, reps: 16, note: 'extend' })
    expect(suggestNext({ range: r, targetRir: 2, equipment: 'dumbbell', last: sets(20, 16) })).toMatchObject({ weight: 22, reps: 12 })
  })
  it('kleine Stufen (Langhantel) bleiben beim normalen Sprung', () => {
    const s = suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'barbell', last: sets(80, 10) })
    expect(s.note).toBeUndefined()
    expect(s.weight).toBeGreaterThan(80)
    expect(s.reps).toBe(6)
  })
  it('Körpergewichtsübung mit Zusatzgewicht: nextWeight ist Zusatzgewicht', () => {
    const s = suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last: sets(10, 10), bodyLoad: 76 })
    expect(s.note).toBeUndefined()
    expect(s.weight).toBeGreaterThan(10)
  })
})

describe('Zielwert Mitte / Weight Match / Bereich erweitern', () => {
  const r = { min: 6, max: 10 }
  const sets = (weight: number, reps: number, rir = 2) => [1, 2, 3].map(() => ({ weight, reps, rir }))
  const mid = (last: ReturnType<typeof sets>, extra: Partial<Parameters<typeof suggestNext>[0]> = {}) =>
    suggestNext({ range: r, targetRir: 2, equipment: 'barbell', last, target: 'mid', ...extra })
  it('Weight Match: gleiches Gewicht, eine Wdh. mehr, solange im Bereich', () => {
    expect(mid(sets(100, 7))).toMatchObject({ weight: 100, reps: 8 })
    expect(mid(sets(100, 9))).toMatchObject({ weight: 100, reps: 10 })
  })
  it('Obergrenze erreicht: Steigerung landet um die Mitte statt an der Untergrenze', () => {
    const s = mid(sets(100, 10))
    expect(s.weight).toBeGreaterThan(100)
    expect(s.reps).toBeGreaterThanOrEqual(7)
    expect(s.reps).toBeLessThanOrEqual(9)
    // klassisch: Untergrenze und größerer Sprung
    const classic = suggestNext({ range: r, targetRir: 2, equipment: 'barbell', last: sets(100, 10) })
    expect(classic.reps).toBe(6)
    expect(classic.weight!).toBeGreaterThan(s.weight!)
  })
  it('ohne Weight Match: Gewicht folgt, Wdh. bleiben nahe der Mitte', () => {
    const s = mid(sets(100, 8), { weightMatch: false })
    expect(s.weight).toBeGreaterThan(100)
    expect(Math.abs(s.reps - 8)).toBeLessThanOrEqual(1)
  })
  it('mehr RIR als geplant zählt als Fortschritt', () => {
    const s = mid(sets(100, 8, 4))
    expect(s.weight! > 100 || s.reps >= 10).toBe(true)
  })
  it('unter der Untergrenze: leichteres Gewicht im Bereich', () => {
    const s = mid(sets(100, 3))
    expect(s.weight).toBeLessThan(100)
    expect(s.reps).toBeGreaterThanOrEqual(6)
  })
  it('großer Sprung: erweitern, ohne Erweiterung Sprung mit Hinweis', () => {
    const rr = { min: 12, max: 15 }
    const s = suggestNext({ range: rr, targetRir: 2, equipment: 'dumbbell', last: sets(10, 15), target: 'mid' })
    expect(s).toMatchObject({ weight: 10, reps: 16, note: 'extend', nextWeight: 12 })
    const off = suggestNext({ range: rr, targetRir: 2, equipment: 'dumbbell', last: sets(10, 15), target: 'mid', expandRange: false })
    expect(off).toMatchObject({ weight: 12, reps: 12, note: 'gap' })
    const end = suggestNext({ range: rr, targetRir: 2, equipment: 'dumbbell', last: sets(10, 19), target: 'mid' })
    expect(end).toMatchObject({ weight: 12, note: 'gap' })
  })
  it('klassisch ohne Erweiterung: Sprung an die Untergrenze mit Hinweis', () => {
    const s = suggestNext({ range: { min: 12, max: 15 }, targetRir: 2, equipment: 'dumbbell', last: sets(10, 15), expandRange: false })
    expect(s).toMatchObject({ weight: 12, reps: 12, note: 'gap' })
  })
  it('Körpergewicht mit Zusatz: Mitte rechnet mit Gesamtlast, Ergebnis Zusatzgewicht', () => {
    const s = suggestNext({ range: r, targetRir: 2, equipment: 'bodyweight', last: sets(5, 10), bodyLoad: 76, target: 'mid' })
    expect(s.weight).toBeGreaterThan(5)
    expect(s.weight).toBeLessThan(15)
    expect(s.reps).toBeGreaterThanOrEqual(7)
  })
  it('Plateau-Reset zielt auf die Mitte', () => {
    expect(mid(sets(100, 8), { stalled: true }).reps).toBe(8)
  })
})

describe('Zusatzgewicht halten', () => {
  const sets = [1, 2, 3].map(() => ({ weight: 2.5, reps: 8, rir: 2 }))
  it('2,5 kg Zusatz bleibt 2,5 kg (keine Rundung auf 1-kg-Schritte)', () => {
    for (const target of ['min', 'mid'] as const) {
      expect(suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last: sets, bodyLoad: 76, target })).toMatchObject({ weight: 2.5, reps: 9 })
    }
  })
  it('mit Geräteliste wird auf die Liste gesetzt', () => {
    const s = suggestNext({ range: { min: 6, max: 10 }, targetRir: 2, equipment: 'bodyweight', last: sets, bodyLoad: 76, scale: { kind: 'list', weights: [5, 10] } })
    expect([0, 5, 10]).toContain(s.weight)
  })
})

describe('Periodisierung: Blocklänge, Deload am Anfang, Wochenziele', () => {
  const pe = { exerciseId: 'bb-bench', sets: 3, repMin: 6, repMax: 10, rir: 2 }
  it('freie Blocklänge 3 und 8 Wochen', () => {
    expect(weeklyOverview(pe, { repScheme: 'linear', deload: true, blockWeeks: 3 }, {})).toHaveLength(4)
    const eight = weeklyOverview(pe, { repScheme: 'linear', deload: true, blockWeeks: 8 }, {})
    expect(eight).toHaveLength(9)
    expect(eight.at(-1)!.isDeload).toBe(true)
    expect(eight.at(-2)!.failure).toBe(true)
  })
  it('Deload am Anfang: Woche 0 ist Deload, danach der normale Verlauf', () => {
    const cfg = { repScheme: 'linear' as const, deload: true, deloadFirst: true }
    expect([0, 1, 2, 3, 4, 5].map((w) => weekPlan(cfg, w).isDeload)).toEqual([true, false, false, false, false, true])
    const end = { repScheme: 'linear' as const, deload: true }
    expect(weekPlan(cfg, 1).repShift).toBe(weekPlan(end, 0).repShift)
    expect(weekPlan(cfg, 4).failureLastSet).toBe(true)
    expect(weekLabel({ config: { ...cfg } as ProgramConfig }, 0)).toBe('Deload')
    expect(weekLabel({ config: { ...cfg } as ProgramConfig }, 1)).toBe('Woche 1')
  })
  it('Wochenziel je Block überschreibt Sätze, Bereich und RIR in jedem Block', () => {
    const cfg = { repScheme: 'static' as const, deload: true }
    const edited = setWeekTarget(pe, 'b1', { sets: 5, repMin: 4, repMax: 6, rir: 1 })
    for (const week of [1, 6]) {
      const plan = weekPlan(cfg, week)
      expect(plannedSets(edited, plan)).toBe(5)
      expect(exerciseTargets(edited, plan, 0, false)).toEqual({ range: { min: 4, max: 6 }, rir: 1 })
    }
    expect(plannedSets(edited, weekPlan(cfg, 0))).toBe(3)
    expect(weeklyOverview(edited, cfg, {})[1]).toMatchObject({ sets: 5, repMin: 4, repMax: 6, rir: 1, edited: true })
  })
  it('einmaliges Wochenziel hat Vorrang und gilt nur in dieser Woche', () => {
    const cfg = { repScheme: 'static' as const, deload: true }
    const edited = setWeekTarget(setWeekTarget(pe, 'b1', { sets: 5 }), 'w6', { sets: 2, skip: true })
    expect(plannedSets(edited, weekPlan(cfg, 6))).toBe(2)
    expect(isSkipped(edited, weekPlan(cfg, 6))).toBe(true)
    expect(isSkipped(edited, weekPlan(cfg, 1))).toBe(false)
    // ohne Periodisierung: nur einmalige Ziele
    expect(isSkipped(edited, neutralWeek(6))).toBe(true)
    expect(isSkipped(edited, neutralWeek(1))).toBe(false)
  })
  it('Zurücksetzen entfernt den Eintrag (und das Feld, wenn leer)', () => {
    const edited = setWeekTarget(pe, 'b0', { skip: true })
    expect(setWeekTarget(edited, 'b0', undefined).weeks).toBeUndefined()
    expect(setWeekTarget(pe, 'b0', { skip: false }).weeks).toBeUndefined()
  })
  it('ausgelassene Übung: in plannedDay markiert, nicht im Wochenfortschritt', () => {
    const plan = neutralWeek(0)
    const skipped = setWeekTarget(pe, 'w0', { skip: true })
    const day = { id: 'd', name: 'A', exercises: [skipped, { ...pe, exerciseId: 'bb-row' }] }
    const warm = { warmupMode: 'off' as const, warmupSchemes: DEFAULT_WARMUP_SCHEMES }
    const views = plannedDay(day, plan, [], (id) => exerciseById(id), warm)
    expect(views.map((v) => v.skipped)).toEqual([true, false])
    const program = { id: 1, name: 'P', icon: '', color: '', createdAt: 0, active: true, config: null, days: [day], weekSlots: [0, 'rest', 'rest', 'rest', 'rest', 'rest', 'rest'] } as Program
    expect(weekProgress(program, emptyWeek(0), [], (id) => exerciseById(id)).exercises.total).toBe(1)
  })
})

describe('Harter Satz zuerst', () => {
  it('erster Satz 1 RIR unter dem Ziel, danach Ziel-RIR', () => {
    expect([0, 1, 2].map((i) => setRir(2, i, 3, false, true))).toEqual([1, 2, 2])
    expect([0, 1, 2].map((i) => setRir(2, i, 3, true, true))).toEqual([1, 2, 2])
    // Verbund nicht unter RIR 1, Isolation bis 0
    expect(setRir(1, 0, 3, true, true)).toBe(1)
    expect(setRir(1, 0, 3, false, true)).toBe(0)
    expect(setRir(0, 0, 3, true, true)).toBe(0)
    // ein einzelner Satz bleibt beim Ziel
    expect(setRir(2, 0, 1, false, true)).toBe(2)
  })
  it('Standard unverändert', () => {
    expect([0, 1, 2].map((i) => setRir(2, i, 3, true))).toEqual([3, 2, 2])
    expect([0, 1, 2].map((i) => setRir(2, i, 3, false))).toEqual([2, 2, 1])
  })
  it('Versagenssatz der letzten Arbeitswoche wandert an den Anfang', () => {
    expect(failureSetIndex(3)).toBe(2)
    expect(failureSetIndex(3, true)).toBe(0)
    const cfg = { repScheme: 'static' as const, deload: true }
    const plan = weekPlan(cfg, 3)
    // Basis-RIR 3: in der letzten Arbeitswoche (−2) Ziel 1, so ist nur der Versagenssatz bei 0
    const day = { id: 'd', name: 'A', exercises: [{ exerciseId: 'bb-bench', sets: 3, repMin: 6, repMax: 10, rir: 3 }] }
    const warm = { warmupMode: 'off' as const, warmupSchemes: DEFAULT_WARMUP_SCHEMES }
    const [std] = plannedDay(day, plan, [], (id) => exerciseById(id), warm)
    const [hard] = plannedDay(day, plan, [], (id) => exerciseById(id), { ...warm, hardSetFirst: true })
    expect(std.failureIdx).toBe(std.sets - 1)
    expect(std.setRirs.at(-1)).toBe(0)
    expect(hard.failureIdx).toBe(0)
    expect(hard.setRirs[0]).toBe(0)
    expect(hard.setRirs.slice(1).every((r) => r > 0)).toBe(true)
  })
})

describe('Abgehakte Aufwärmsätze ausblenden', () => {
  const rows = [
    { id: 'a', type: 'warmup', done: true }, { id: 'b', type: 'warmup', done: false },
    { id: 'c', type: 'warmup', done: true }, { id: 'd', type: 'work', done: true },
  ]
  it('blendet nur abgehakte Aufwärmsätze aus, Sammelzeile an der ersten Stelle', () => {
    const r = collapsedWarmups(rows, true)
    expect([...r.hidden]).toEqual([0, 2])
    expect(r.summaryAt).toBe(0)
  })
  it('aus: nichts ausgeblendet', () => {
    expect(collapsedWarmups(rows, false)).toEqual({ hidden: new Set(), summaryAt: -1 })
  })
  it('Zeile mit offenem Numpad bleibt sichtbar', () => {
    const r = collapsedWarmups(rows, true, 'a')
    expect([...r.hidden]).toEqual([2])
    expect(r.summaryAt).toBe(2)
  })
})
