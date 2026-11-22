/**
 * Anpassbare Listen (PLAN-6 B17): Reihenfolge und Sichtbarkeit der Dashboard-Bereiche und der Schnellaktionen im
 * Plus-Menü. Gespeichert wird nur die Wahl des Nutzers; neue Einträge einer späteren Version erscheinen hinten.
 */
export interface ListLayout { order: string[]; hidden: string[] }

export const DASHBOARD_SECTIONS = ['habits', 'body', 'volume', 'muscles', 'exercises'] as const
export const SHORTCUTS = ['weight', 'measures', 'program', 'workout'] as const
export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number]
export type Shortcut = (typeof SHORTCUTS)[number]

export interface LayoutPrefs { sections: ListLayout; shortcuts: ListLayout }

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

export function defaultPrefs(): LayoutPrefs {
  return { sections: normalizeLayout(DASHBOARD_SECTIONS), shortcuts: normalizeLayout(SHORTCUTS) }
}

export function normalizePrefs(saved?: Partial<LayoutPrefs> | null): LayoutPrefs {
  return { sections: normalizeLayout(DASHBOARD_SECTIONS, saved?.sections), shortcuts: normalizeLayout(SHORTCUTS, saved?.shortcuts) }
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

/** Ein-/ausblenden. Die letzte sichtbare Schnellaktion lässt sich nicht ausblenden (`keepOne`), sonst wäre das Menü leer. */
export function toggleHidden(layout: ListLayout, id: string, keepOne = false): ListLayout {
  if (!layout.order.includes(id)) return layout
  if (layout.hidden.includes(id)) return { ...layout, hidden: layout.hidden.filter((h) => h !== id) }
  if (keepOne && visibleIds(layout).length <= 1) return layout
  return { ...layout, hidden: [...layout.hidden, id] }
}
