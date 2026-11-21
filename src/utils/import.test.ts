import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, parseWeightImport, settingsResetKeepingProfile, weightXmlReader } from '../db/db'
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

describe('Gewichts-Import als Stream (B7)', () => {
  const xml = `<?xml version="1.0"?><HealthData>
    <Record type="HKQuantityTypeIdentifierStepCount" unit="count" startDate="2026-03-02 07:00:00 +0100" value="999"/>
    <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Waage &amp; Co" unit="kg" startDate="2026-03-01 07:00:00 +0100" value="81.4">
      <MetadataEntry key="x" value="y"/>
    </Record>
    <Record type="HKQuantityTypeIdentifierBodyMassIndex" unit="count" startDate="2026-03-01 07:00:00 +0100" value="25"/>
    <Record type="HKQuantityTypeIdentifierBodyMass" unit="lb" startDate="2026-03-02 07:00:00 +0100" value="180"/>
  </HealthData>`
  const expected = [{ date: '2026-03-01', kg: 81.4 }, { date: '2026-03-02', kg: 81.6 }]
  const read = (chunks: string[]) => { const r = weightXmlReader(); chunks.forEach((c) => r.push(c)); return r.result() }

  it('liefert bei jeder möglichen Schnittstelle dasselbe Ergebnis wie am Stück', () => {
    expect(read([xml])).toEqual(expected)
    for (let i = 1; i < xml.length; i++) expect(read([xml.slice(0, i), xml.slice(i)]), `Schnitt bei ${i}`).toEqual(expected)
  })
  it('funktioniert mit sehr kleinen Stücken (je 3 Zeichen) und gibt den Rest nicht frei', () => {
    const chunks = xml.match(/[\s\S]{1,3}/g) ?? []
    expect(read(chunks)).toEqual(expected)
  })
  it('parseWeightImport nutzt denselben Leser', () => {
    expect(parseWeightImport(xml)).toEqual(expected)
  })
})

describe('Einstellungen zurücksetzen (B7)', () => {
  it('setzt alles auf Standard, das Profil bleibt', () => {
    const changed = { ...DEFAULT_SETTINGS, theme: 'dark' as const, weightUnit: 'lb' as const, keepAlive: true,
      name: 'Alex', birthday: '1990-05-05', sex: 'm' as never, heightCm: 180 }
    const r = settingsResetKeepingProfile(changed)
    expect(r).toMatchObject({ name: 'Alex', birthday: '1990-05-05', sex: 'm', heightCm: 180 })
    expect(r.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(r.weightUnit).toBe('kg')
    expect(r.keepAlive).toBe(false)
  })
})
