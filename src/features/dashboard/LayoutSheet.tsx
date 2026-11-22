import { BottomSheet, Button, cx } from '../../components/ui'
import { saveLayoutPrefs } from '../../db/db'
import { defaultPrefs, moveItem, toggleHidden, type LayoutPrefs, type ListLayout } from '../../engine/layout'

export const SECTION_LABELS: Record<string, string> = {
  habits: 'Gewohnheiten', body: 'Körperwerte', volume: 'Volumen', muscles: 'Muskelgruppen', exercises: 'Übungen',
}
export const SHORTCUT_LABELS: Record<string, string> = {
  weight: 'Gewicht eintragen', measures: 'Maße eintragen', program: 'Neues Programm', workout: 'Einzelnes Workout erstellen',
}

function ListEditor({ title, layout, labels, keepOne, onChange }: {
  title: string; layout: ListLayout; labels: Record<string, string>; keepOne?: boolean; onChange: (l: ListLayout) => void
}) {
  const shown = layout.order.filter((id) => !layout.hidden.includes(id)).length
  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-muted">{title}</h3>
      {layout.order.map((id, i) => {
        const hidden = layout.hidden.includes(id)
        const locked = !hidden && !!keepOne && shown <= 1
        return (
          <div key={id} className="flex items-center gap-1 rounded-xl bg-surface2 pl-3 pr-1 py-1">
            <span className={cx('flex-1 min-w-0 truncate text-sm font-medium', hidden && 'text-muted line-through')}>{labels[id] ?? id}</span>
            <button type="button" disabled={locked} onClick={() => onChange(toggleHidden(layout, id, keepOne))}
              aria-label={`${labels[id] ?? id} ${hidden ? 'einblenden' : 'ausblenden'}`} aria-pressed={!hidden}
              className="h-9 px-2.5 rounded-full text-xs font-semibold active:opacity-70 disabled:opacity-30">{hidden ? 'Aus' : 'An'}</button>
            <button type="button" aria-label="Nach oben" disabled={i === 0} onClick={() => onChange(moveItem(layout, i, i - 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 disabled:opacity-30">↑</button>
            <button type="button" aria-label="Nach unten" disabled={i === layout.order.length - 1} onClick={() => onChange(moveItem(layout, i, i + 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 disabled:opacity-30">↓</button>
          </div>
        )
      })}
    </section>
  )
}

/** Bearbeitung von Reihenfolge und Sichtbarkeit (geteilt von Sheet im Dashboard und Seite unter Mehr). */
export function LayoutEditor({ prefs }: { prefs: LayoutPrefs }) {
  return (
    <div className="space-y-5 pb-2">
      <p className="text-xs text-muted">Ringe und Rekorde oben bleiben. Hier legst du fest, welche Bereiche das Dashboard zeigt und was das Plus-Menü anbietet.</p>
      <ListEditor title="Dashboard" layout={prefs.sections} labels={SECTION_LABELS}
        onChange={(sections) => void saveLayoutPrefs({ ...prefs, sections })} />
      <ListEditor title="Plus-Menü" layout={prefs.shortcuts} labels={SHORTCUT_LABELS} keepOne
        onChange={(shortcuts) => void saveLayoutPrefs({ ...prefs, shortcuts })} />
      <Button variant="ghost" className="w-full" onClick={() => void saveLayoutPrefs(defaultPrefs())}>Zurücksetzen</Button>
    </div>
  )
}

/** Sheet im Dashboard (PLAN-6 B17). */
export function LayoutSheet({ open, onClose, prefs }: { open: boolean; onClose: () => void; prefs: LayoutPrefs }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Anpassen" tall>
      <LayoutEditor prefs={prefs} />
    </BottomSheet>
  )
}
