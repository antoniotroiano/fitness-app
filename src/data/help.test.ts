import { describe, expect, it } from 'vitest'
import { ALL_ARTICLES, HELP_CATEGORIES, findArticle, searchArticles } from './help'

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
})
