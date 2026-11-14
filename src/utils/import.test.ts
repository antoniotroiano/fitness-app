import { describe, expect, it } from 'vitest'
import { parseWeightImport } from '../db/db'
import { cmToDisplay, displayToCm, displayToKg, kgToDisplay } from './units'

describe('Gewichts-Import', () => {
  it('liest Apple-Health-XML (kg und lb)', () => {
    const xml = `<HealthData>
      <Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" startDate="2026-03-01 07:00:00 +0100" value="81.4"/>
      <Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" startDate="2026-03-02 07:00:00 +0100" value="180"/>
      <Record type="HKQuantityTypeIdentifierStepCount" unit="count" startDate="2026-03-02 07:00:00 +0100" value="999"/>
    </HealthData>`
    expect(parseWeightImport(xml)).toEqual([
      { date: '2026-03-01', kg: 81.4 }, { date: '2026-03-02', kg: 81.6 },
    ])
  })
  it('liest CSV mit Komma und Semikolon', () => {
    expect(parseWeightImport('Datum,kg\n2026-01-01,80.5\n2026-01-02;79,9\nmüll')).toEqual([
      { date: '2026-01-01', kg: 80.5 }, { date: '2026-01-02', kg: 79.9 },
    ])
  })
})

describe('Einheiten', () => {
  it('Rundreise kg/lb und cm/in', () => {
    expect(kgToDisplay(displayToKg(180, 'lb'), 'lb')).toBe(180)
    expect(cmToDisplay(displayToCm(30, 'in'), 'in')).toBe(30)
  })
})
