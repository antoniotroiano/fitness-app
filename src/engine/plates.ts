/** Scheibenrechner für Langhanteln: welche Scheiben pro Seite auf die Stange gehören. Alles in kg. */

/** Übliche Scheiben (kg) zur Auswahl in den Einstellungen */
export const PLATE_OPTIONS = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5]
export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25]
export const DEFAULT_BAR = 20

export interface PlateLoad {
  /** Scheiben pro Seite, schwerste zuerst */
  perSide: number[]
  /** Gewicht, das mit den Scheiben nicht erreichbar ist (gesamt, beide Seiten), 0 = exakt */
  rest: number
}

/**
 * Scheiben pro Seite für ein Gesamtgewicht (Stange inklusive): schwerste zuerst, jede Scheibe beliebig oft.
 * null, wenn das Gewicht unter der Stange liegt. Bleibt ein Rest, ist das Gewicht mit diesen Scheiben nicht exakt ladbar.
 */
export function platesFor(total: number, bar: number, plates: number[]): PlateLoad | null {
  if (!(total > 0) || total + 1e-9 < bar) return null
  let side = Math.round(((total - bar) / 2) * 1000) / 1000
  const perSide: number[] = []
  for (const p of [...plates].filter((x) => x > 0).sort((a, b) => b - a)) {
    while (side + 1e-9 >= p) { perSide.push(p); side = Math.round((side - p) * 1000) / 1000 }
  }
  return { perSide, rest: Math.round(side * 2 * 1000) / 1000 }
}
