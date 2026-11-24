import { describe, expect, it } from 'vitest'
import { checkRelease, parseChangelog } from './release-check.mjs'

const log = (...vs) => `export const CHANGELOG = [\n${vs.map((v) => `  {\n    version: '${v}', date: '2026-11-24',\n    items: [\n      'Erster Punkt.',\n      'Mit \\'Quote\\' drin.',\n    ],\n  },\n`).join('')}]\n`

describe('release-check', () => {
  it('liest Einträge samt escapten Anführungszeichen', () => {
    const e = parseChangelog(log('0.2.0', '0.1.0'))
    expect(e.map((x) => x.version)).toEqual(['0.2.0', '0.1.0'])
    expect(e[0].items).toEqual(['Erster Punkt.', "Mit 'Quote' drin."])
  })
  it('akzeptiert passende Version und liefert Notes', () => {
    const r = checkRelease('0.2.0', log('0.2.0', '0.1.0'))
    expect(r.problems).toEqual([])
    expect(r.notes).toContain('- Erster Punkt.')
  })
  it('meldet fehlenden Eintrag, nicht erhöhte Version und ungültige Version', () => {
    expect(checkRelease('0.3.0', log('0.2.0')).problems.join()).toMatch(/Kein Changelog-Eintrag für 0\.3\.0/)
    expect(checkRelease('0.1.0', log('0.2.0', '0.1.0')).problems.join()).toMatch(/neuer als package\.json/)
    expect(checkRelease('0.2.0-beta', log('0.2.0')).problems.join()).toMatch(/x\.y\.z/)
  })
  it('meldet unbekanntes Format', () => {
    expect(checkRelease('0.2.0', 'export const CHANGELOG = []').problems.join()).toMatch(/keine Einträge/)
  })
})
