import { HELP_CATEGORIES, type HelpCategory } from './help'
import { EN_A } from './help-en/a'
import { EN_B } from './help-en/b'
import { EN_C, EN_CATS, EN_INTRO } from './help-en/c'

/** Englische Fassung der Wissensdatenbank: Struktur, Icons und `related` stammen aus der deutschen Quelle. */
const TR = { ...EN_A, ...EN_B, ...EN_C }

export const HELP_CATEGORIES_EN: HelpCategory[] = HELP_CATEGORIES.map((c) => ({
  ...c,
  ...(EN_CATS[c.id] ?? {}),
  articles: c.articles.map((a) => ({ ...a, ...(TR[a.id] ?? {}) })),
}))

export const HELP_INTRO_EN = EN_INTRO
export const HELP_EN_TRANSLATIONS = TR
