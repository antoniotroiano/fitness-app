import { describe, expect, it } from 'vitest'
import { e1rm, isStalled, previousSets, sessionE1rm, suggestNext, weightForReps } from './progression'
import { isFirstForMuscle, warmupSets } from './warmup'
import { migrateExercise, migrateFocus, migrateMuscles } from '../data/muscleMigration'
import { groupExercises, libraryGroup } from './library'
import { axisTicks, bucketSpan, chartWindow, clampOffset, formatRange, niceTicks } from './chartWindow'
import { dailyValues, dailySeries, habitDots, monthGrid, shiftMonth, streakDays, streakWeeks, weekCount } from './habits'
import { elapsedMs, formatClock, pauseClock, resumeClock, startClock } from './workoutClock'
import { DEFAULT_REST, restCategory, restSecondsFor } from './rest'
import { baseRepRange, effectiveSets, setRir, weekPlan } from './periodization'
import { dayTypes, generate, weekSlots } from './planGenerator'
import { alternatives } from './swap'
import { targetMuscles } from './targetMuscles'
import { weekProgress } from './weekProgress'
import { MEDIA_MAP, posterSlug } from '../data/media'
import { TIPS } from '../data/media/tips'
import manifest from '../data/media/manifest.json'
import { emptyWeek, historyUpTo, isWeekComplete, jumpToWeek, markSlot, maxReachedWeek } from './weekCycle'
import { average, cardioDaily, exerciseDaily, filterPeriod, groupByMonth, muscleDaily, summary } from './stats'
import { ALL_EXERCISES, EXERCISES, exerciseById } from '../data/exercises'
import { recentRecords } from './records'
import { bodySeries, lastEntries, ratioSeries, weightSeries } from './body'
import type { MeasureEntry, ProgramConfig, Session, WeightEntry } from '../types'

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

describe('warmup', () => {
  const base = { equipment: 'barbell' as const, compound: true, pattern: 'horizontalPush' as const, firstForMuscle: true }
  it('schwere Verbundübung als erste: Rampe mit 3 Sätzen, aufsteigend und gerundet', () => {
    const w = warmupSets({ ...base, workWeight: 100 })
    expect(w.map((x) => x.weight)).toEqual([50, 70, 85])
    expect(w.map((x) => x.reps)).toEqual([8, 5, 3])
  })
  it('weitere Verbundübung: 1 Satz', () => {
    expect(warmupSets({ ...base, workWeight: 100, firstForMuscle: false })).toHaveLength(1)
  })
  it('Isolation: 1 Satz nur als erste Übung, sonst keiner', () => {
    const iso = { ...base, equipment: 'cable' as const, compound: false, pattern: 'isolation' as const }
    expect(warmupSets({ ...iso, workWeight: 30 })).toHaveLength(1)
    expect(warmupSets({ ...iso, workWeight: 30, firstForMuscle: false })).toEqual([])
  })
  it('Core, Bodyweight und Cardio: keine Aufwärmsätze', () => {
    expect(warmupSets({ ...base, workWeight: 20, pattern: 'core' })).toEqual([])
    expect(warmupSets({ ...base, workWeight: 20, equipment: 'bodyweight' })).toEqual([])
  })
  it('ohne Arbeitsgewicht: Platzhalter ohne Gewicht', () => {
    expect(warmupSets({ ...base, workWeight: null }).every((x) => x.weight === null)).toBe(true)
  })
  it('sehr leichte Last: keine doppelten oder zu schweren Sätze', () => {
    const w = warmupSets({ ...base, workWeight: 5 })
    expect(new Set(w.map((x) => x.weight)).size).toBe(w.length)
    expect(w.every((x) => (x.weight ?? 0) < 5)).toBe(true)
  })
  it('isFirstForMuscle', () => {
    const ids = ['bb-bench', 'db-incline', 'db-lateral']
    expect(isFirstForMuscle(ids, 0, exerciseById)).toBe(true)
    expect(isFirstForMuscle(ids, 1, exerciseById)).toBe(false)
    expect(isFirstForMuscle(ids, 2, exerciseById)).toBe(true)
  })
})

describe('rest', () => {
  const settings = { restSeconds: DEFAULT_REST, warmupRestCompound: 90, warmupRestOther: 45 }
  it('Kategorien', () => {
    expect(restCategory(exerciseById('bb-bench')!)).toBe('compoundUpper')
    expect(restCategory(exerciseById('bb-squat')!)).toBe('compoundLower')
    expect(restCategory(exerciseById('db-lateral')!)).toBe('isoUpper')
    expect(restCategory(exerciseById('leg-ext')!)).toBe('isoLower')
    expect(restCategory(exerciseById('plank')!)).toBe('core')
  })
  it('Pausenzeiten inklusive Aufwärmsatz', () => {
    expect(restSecondsFor(exerciseById('bb-bench')!, settings, false)).toBe(150)
    expect(restSecondsFor(exerciseById('bb-bench')!, settings, true)).toBe(90)
    expect(restSecondsFor(exerciseById('db-lateral')!, settings, true)).toBe(45)
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
  })
  it('ist 0 ohne Sessions und voll nach allen Workouts', () => {
    expect(weekProgress(program, week, [], (id) => ex(id)).muscles.done).toBe(0)
    const all = [session(0, [['bb-bench', 2], ['bb-curl', 2]]), session(1, [['cable-fly', 2]])]
    expect(weekProgress(program, week, all, (id) => ex(id)).muscles.done).toBe(2)
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
