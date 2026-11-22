import { describe, expect, it } from 'vitest'
import { ALL_ARTICLES, HELP_CATEGORIES, findArticle, searchArticles, type HelpBlock } from './help'
import { HELP_CATEGORIES_EN, HELP_EN_TRANSLATIONS } from './helpEn'
import { EN_CATS } from './help-en/c'

describe('Wissensdatenbank', () => {
  it('Kategorie- und Artikel-IDs sind eindeutig, Kategorien nicht leer', () => {
    const ids = ALL_ARTICLES.map((x) => x.article.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(HELP_CATEGORIES.map((c) => c.id)).size).toBe(HELP_CATEGORIES.length)
    for (const c of HELP_CATEGORIES) expect(c.articles.length, c.id).toBeGreaterThan(0)
  })
  it('verwandte Artikel existieren', () => {
    for (const { article } of ALL_ARTICLES) for (const r of article.related ?? []) expect(findArticle(r), `${article.id} → ${r}`).toBeDefined()
  })
  it('Fett-Markierungen sind paarweise gesetzt', () => {
    const texts = (b: unknown): string[] => (typeof b === 'string' ? [b] : Array.isArray(b) ? b : (b as { steps: string[] }).steps)
    for (const { article } of ALL_ARTICLES) for (const b of article.blocks) for (const x of texts(b)) expect(x.split('**').length % 2, `${article.id}: ${x}`).toBe(1)
  })
  it('Suche findet Titel und Text', () => {
    expect(searchArticles('scheibenrechner')[0]?.article.id).toBe('logging-scheiben')
    expect(searchArticles('xyzxyz')).toEqual([])
  })

  describe('englische Fassung', () => {
    const shape = (b: HelpBlock) => (typeof b === 'string' ? 'p' : Array.isArray(b) ? `l${b.length}` : `s${b.steps.length}`)
    const texts = (b: HelpBlock): string[] => (typeof b === 'string' ? [b] : Array.isArray(b) ? b : b.steps)
    const bolds = (b: HelpBlock) => texts(b).map((x) => (x.match(/\*\*/g) ?? []).length)
    it('jeder Artikel und jede Kategorie ist übersetzt, keine Übersetzung ohne Artikel', () => {
      const ids = ALL_ARTICLES.map((x) => x.article.id).sort()
      expect(Object.keys(HELP_EN_TRANSLATIONS).sort()).toEqual(ids)
      expect(Object.keys(EN_CATS).sort()).toEqual(HELP_CATEGORIES.map((c) => c.id).sort())
    })
    it('gleiche Blockstruktur und gleiche Zahl an Fett-Markierungen wie das Deutsche', () => {
      for (const { article } of ALL_ARTICLES) {
        const en = HELP_EN_TRANSLATIONS[article.id]
        expect(en.blocks.map(shape), article.id).toEqual(article.blocks.map(shape))
        expect(en.blocks.map(bolds), article.id).toEqual(article.blocks.map(bolds))
        expect(en.title.trim(), article.id).not.toBe('')
      }
    })
    it('Übersetzungen sind wirklich englisch (nicht der deutsche Text)', () => {
      for (const { article } of ALL_ARTICLES) expect(HELP_EN_TRANSLATIONS[article.id].title, article.id).not.toBe(article.title)
    })
    it('Suche und Verweise funktionieren auf Englisch', () => {
      expect(searchArticles('plate calculator', HELP_CATEGORIES_EN)[0]?.article.id).toBe('logging-scheiben')
      for (const { article } of HELP_CATEGORIES_EN.flatMap((c) => c.articles.map((a) => ({ article: a })))) for (const r of article.related ?? []) expect(findArticle(r, HELP_CATEGORIES_EN)).toBeDefined()
    })
  })
})
