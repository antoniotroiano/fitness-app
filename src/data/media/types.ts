/** Deutsche Zusatztexte zu einer Übung (übersetzt aus free-exercise-db-with-videos, MIT). */
export interface MediaTips {
  /** Technik-Hinweise */
  cues: string[]
  /** Häufige Fehler */
  mistakes: string[]
  /** Atmung */
  breathing: string
  /** Schrittanleitung, nur bei neu ergänzten Übungen (sonst gelten `data/instr/*`) */
  steps?: string[]
}
