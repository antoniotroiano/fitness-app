import { LANG } from '../i18n'
import { HELP_CATEGORIES, HELP_INTRO } from './help'
import { HELP_CATEGORIES_EN, HELP_INTRO_EN } from './helpEn'

/** Kategorien und Einleitung in der Sprache der App (Artikel gibt es auf Deutsch und Englisch). */
export const CATS = LANG === 'en' ? HELP_CATEGORIES_EN : HELP_CATEGORIES
export const INTRO = LANG === 'en' ? HELP_INTRO_EN : HELP_INTRO
