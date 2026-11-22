import { describe, expect, it } from 'vitest'
import { EN } from './dictEn'
import { en } from './en'
import { deBase } from './de'
import { t } from './index'

const placeholders = (s: string) => [...s.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(',')

describe('i18n', () => {
  it('Übersetzungen haben dieselben Platzhalter wie der deutsche Text', () => {
    for (const [de, en_] of Object.entries(EN)) expect(placeholders(en_), de).toBe(placeholders(de))
  })

  it('en.ts hat dieselbe Struktur wie deBase', () => {
    const shape = (o: unknown): unknown =>
      typeof o === 'function' ? 'fn' : typeof o === 'object' && o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, shape(v)])) : 'str'
    expect(shape(en)).toEqual(shape(deBase))
  })

  it('t ersetzt Platzhalter und liefert ohne Übersetzung den deutschen Text', () => {
    expect(t('Woche {0}', 3)).toBe('Woche 3')
    expect(t('{0} · Block {1}', 'A', 2)).toBe('A · Block 2')
    expect(t('Ein Text ohne Eintrag')).toBe('Ein Text ohne Eintrag')
  })
})
