import { t } from '../i18n'

/**
 * „Was ist neu“: neueste Version zuerst. Zu jedem Release hier einen Eintrag ergänzen (kurze Stichpunkte,
 * deutscher Text, Übersetzung in `i18n/dictEn.ts`). Die Anzeige filtert nach der zuletzt gesehenen Version.
 */
export type ChangelogEntry = { version: string; date: string; items: string[] }

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0', date: '2026-11-24',
    items: [
      'Die App heißt jetzt TRAINRATE: WORKOUT.',
      'Neues App-Icon und neues Favicon.',
    ],
  },
  {
    version: '0.1.0', date: '2026-11-23',
    items: [
      'Erste veröffentlichte Version.',
      'Hinweis bei neuer Version: Die App aktualisiert sich auf Knopfdruck, Pläne und Daten bleiben erhalten.',
    ],
  },
]

export const changelogItems = (e: ChangelogEntry) => e.items.map((s) => t(s))
