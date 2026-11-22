import { describe, expect, it } from 'vitest'
import type { LoggedSet } from '../../types'
import { rowToSet, setToRow } from './sessionRows'

const kg = { weight: 'kg', distance: 'km' } as const
const lb = { weight: 'lb', distance: 'mi' } as const
const ex = { cardio: false, metric: 'reps' } as const

const sets: LoggedSet[] = [
  { weight: 40, reps: 10, warmup: true },
  { weight: 60, reps: 8, rir: 2 },
  { weight: 60, reps: 6, rir: 0, failure: true, partial: 2 },
  { weight: 50, reps: 5, segment: 'drop' },
  { weight: 15, reps: 10, rir: 1, sides: { l: { weight: 15, reps: 10, rir: 1 }, r: { weight: 15, reps: 12, rir: 2 } } },
]

describe('Zeilen ⇄ Sätze (Verlauf bearbeiten)', () => {
  it('Satz → Zeile → Satz ergibt denselben Satz (kg)', () => {
    for (const s of sets) {
      const row = setToRow(s, ex, kg)
      expect(row.done).toBe(false)
      expect(rowToSet(row, ex, 0, kg)).toEqual(s)
    }
  })
  it('Zeilentypen', () => {
    expect(setToRow(sets[0], ex, kg).type).toBe('warmup')
    expect(setToRow(sets[2], ex, kg)).toMatchObject({ type: 'work', failure: true, partial: '2' })
    expect(setToRow(sets[3], ex, kg).type).toBe('drop')
    const sided = setToRow(sets[4], ex, kg)
    expect(sided.right).toMatchObject({ reps: '12', rir: '2' })
    expect(sided.reps).toBe('10')
  })
  it('Cardio: Minuten und Kilometer', () => {
    const c: LoggedSet = { reps: 0, weight: 0, minutes: 30, km: 5 }
    const row = setToRow(c, { cardio: true }, kg)
    expect(row.minutes).toBe('30')
    expect(rowToSet(row, { cardio: true }, 0, kg)).toEqual(c)
  })
  it('Pfund: Anzeige in lb, gespeichert in kg (Rundung auf Wunschgenauigkeit)', () => {
    const row = setToRow({ weight: 45.36, reps: 5 }, ex, lb)
    expect(Number(row.weight)).toBeCloseTo(100, 0)
    expect(rowToSet(row, ex, 0, lb).weight).toBeCloseTo(45.36, 1)
  })
  it('Links/rechts: die schwächere Seite steht oben (auch nach Bearbeiten der rechten Seite)', () => {
    const row = setToRow(sets[4], ex, kg)
    const edited = { ...row, right: { ...row.right!, reps: '5' } }
    const s = rowToSet(edited, ex, 0, kg)
    expect(s.reps).toBe(5)
    expect(s.sides?.r.reps).toBe(5)
  })
})
