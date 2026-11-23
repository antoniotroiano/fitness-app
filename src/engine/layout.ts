import { MEASURE_GROUPS, RATIOS, type BodyKey } from './body'

/**
 * Anpassbare Listen (PLAN-6 B17): Reihenfolge und Sichtbarkeit der Dashboard-Bereiche und der Schnellaktionen im
 * Plus-Menü. Gespeichert wird nur die Wahl des Nutzers; neue Einträge einer späteren Version erscheinen hinten.
 */
export interface ListLayout { order: string[]; hidden: string[] }

export const DASHBOARD_SECTIONS = ['habits', 'body', 'volume', 'muscles', 'exercises'] as const
export const SHORTCUTS = ['weight', 'measures', 'program', 'workout'] as const
export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number]
export type Shortcut = (typeof SHORTCUTS)[number]

/** Feste Teile oben im Dashboard (Wochenringe, Rekorde), ebenfalls ausblendbar. */
export const TOP_ITEMS = ['rings', 'records'] as const
export type TopItem = (typeof TOP_ITEMS)[number]
/** Kacheln im Bereich „Körperwerte“: Gewicht, Körperfett, alle Maßstellen und Verhältnisse. Standard sichtbar: die ersten zwei. */
export const BODY_TILES: readonly BodyKey[] = ['weight', 'bodyFat', ...MEASURE_GROUPS.flatMap((g) => g.items.map((i) => i.id)), ...RATIOS.map((r) => r.id)]
export const DEFAULT_BODY_TILES: readonly BodyKey[] = ['weight', 'bodyFat']

export interface LayoutPrefs { sections: ListLayout; shortcuts: ListLayout; top: ListLayout; bodyTiles: ListLayout }

/** Gespeicherte Wahl auf die bekannten IDs bringen: Unbekanntes fällt weg, Neues kommt ans Ende, keine Doppelten. */
export function normalizeLayout(known: readonly string[], saved?: Partial<ListLayout> | null): ListLayout {
  const seen = new Set<string>()
  const order: string[] = []
  for (const id of [...(saved?.order ?? []), ...known]) {
    if (known.includes(id) && !seen.has(id)) { seen.add(id); order.push(id) }
  }
  const hidden = [...new Set(saved?.hidden ?? [])].filter((id) => known.includes(id))
  return { order, hidden }
}

const defaultBodyTiles = (): ListLayout => ({ order: [...BODY_TILES], hidden: BODY_TILES.filter((k) => !DEFAULT_BODY_TILES.includes(k)) })

export function defaultPrefs(): LayoutPrefs {
  return { sections: normalizeLayout(DASHBOARD_SECTIONS), shortcuts: normalizeLayout(SHORTCUTS), top: normalizeLayout(TOP_ITEMS), bodyTiles: defaultBodyTiles() }
}

/** Ältere Speicherstände ohne `top`/`bodyTiles` bleiben gültig: alles oben sichtbar, Körperwerte zeigen Gewicht und Körperfett. */
export function normalizePrefs(saved?: Partial<LayoutPrefs> | null): LayoutPrefs {
  return {
    sections: normalizeLayout(DASHBOARD_SECTIONS, saved?.sections),
    shortcuts: normalizeLayout(SHORTCUTS, saved?.shortcuts),
    top: normalizeLayout(TOP_ITEMS, saved?.top),
    bodyTiles: saved?.bodyTiles ? normalizeLayout(BODY_TILES, saved.bodyTiles) : defaultBodyTiles(),
  }
}

/** Sichtbare IDs in der gewählten Reihenfolge. */
export function visibleIds(layout: ListLayout): string[] {
  return layout.order.filter((id) => !layout.hidden.includes(id))
}

/** Eintrag `from` an Position `to` setzen (außerhalb der Liste: unverändert). */
export function moveItem(layout: ListLayout, from: number, to: number): ListLayout {
  if (from === to || from < 0 || to < 0 || from >= layout.order.length || to >= layout.order.length) return layout
  const order = [...layout.order]
  const [id] = order.splice(from, 1)
  order.splice(to, 0, id)
  return { ...layout, order }
}

/**
 * Beim Ziehen: Position, auf die der Zeiger zeigt. `mids` = vertikale Mitten der Zeilen (Reihenfolge der Liste),
 * `y` = Zeigerposition. Ergebnis = Index der Zeile, in deren Bereich
 * (Grenze = Mitte zwischen zwei Zeilen) der Zeiger liegt; über/unter der Liste die erste/letzte.
 */
export function dropIndex(mids: number[], y: number): number {
  let i = 0
  while (i < mids.length - 1 && y > (mids[i] + mids[i + 1]) / 2) i++
  return i
}

/** Ein-/ausblenden. Die letzte sichtbare Schnellaktion lässt sich nicht ausblenden (`keepOne`), sonst wäre das Menü leer. */
export function toggleHidden(layout: ListLayout, id: string, keepOne = false): ListLayout {
  if (!layout.order.includes(id)) return layout
  if (layout.hidden.includes(id)) return { ...layout, hidden: layout.hidden.filter((h) => h !== id) }
  if (keepOne && visibleIds(layout).length <= 1) return layout
  return { ...layout, hidden: [...layout.hidden, id] }
}
