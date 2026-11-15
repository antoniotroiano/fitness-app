import { describe, expect, it } from 'vitest'
import { ALL_EXERCISES, EXERCISES } from './exercises'
import { MUSCLES } from './muscles'
import { generate } from '../engine/planGenerator'
import type { Equipment, ProgramConfig } from '../types'

describe('Übungsdatenbank', () => {
  it('hat eindeutige IDs und Namen', () => {
    const ids = ALL_EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    const names = ALL_EXERCISES.map((e) => e.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })
  it('hat mindestens 150 Kraftübungen', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(150)
  })
  it('jede Kraftübung hat einen Hauptmuskel, sekundäre doppeln ihn nicht', () => {
    for (const e of EXERCISES) {
      expect(e.primary.length).toBeGreaterThan(0)
      expect(e.secondary.filter((s) => e.primary.includes(s))).toEqual([])
    }
  })
  it('jeder Muskel hat mehrere Übungen und mindestens eine Isolation oder Verbundübung', () => {
    for (const m of MUSCLES) {
      const list = EXERCISES.filter((e) => e.primary[0] === m.id)
      expect(list.length, m.id).toBeGreaterThanOrEqual(3)
    }
  })
})

const cfg = (equipment: Equipment[]): ProgramConfig => ({
  mode: 'auto', goal: 'both', days: 4, split: 'ulfb', time: '60-90', repScheme: 'static',
  focus: {}, deload: true, experience: 'intermediate', name: 'T', icon: 'x', color: '#000', equipment,
})

describe('Generator mit eingeschränktem Equipment', () => {
  const sets: Equipment[][] = [
    ['dumbbell', 'bodyweight'], ['machine', 'cable'], ['barbell', 'dumbbell'], ['dumbbell', 'band', 'bodyweight'],
    ['smith', 'cable'],
  ]
  for (const eq of sets) {
    it(`liefert für jeden Tag Übungen: ${eq.join(', ')}`, () => {
      const { program } = generate(cfg(eq), ALL_EXERCISES)
      for (const d of program.days) expect(d.exercises.length).toBeGreaterThan(2)
    })
  }
})

import { INSTRUCTIONS } from './instructions'

describe('Anleitungen', () => {
  it('jede Kraftübung hat eine Anleitung', () => {
    const missing = EXERCISES.filter((e) => !(INSTRUCTIONS[e.id]?.length >= 2)).map((e) => e.id)
    expect(missing).toEqual([])
  })
  it('keine verwaisten Anleitungen', () => {
    const ids = new Set(EXERCISES.map((e) => e.id))
    expect(Object.keys(INSTRUCTIONS).filter((id) => !ids.has(id))).toEqual([])
  })
})
