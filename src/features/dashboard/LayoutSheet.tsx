import { useMemo, useRef, useState } from 'react'
import { BottomSheet, Button, cx } from '../../components/ui'
import { saveLayoutPrefs } from '../../db/db'
import { bodyLabel } from '../../engine/body'
import { BODY_TILES, defaultPrefs, dropIndex, moveItem, toggleHidden, type LayoutPrefs, type ListLayout } from '../../engine/layout'
import { t } from '../../i18n'

export const SECTION_LABELS: Record<string, string> = {
  habits: t('Gewohnheiten'), body: t('Körperwerte'), volume: t('Volumen'), muscles: t('Muskelgruppen'), exercises: t('Übungen'),
}
export const TOP_LABELS: Record<string, string> = { rings: t('Wochenringe'), records: t('Rekorde') }
export const SHORTCUT_LABELS: Record<string, string> = {
  weight: t('Gewicht eintragen'), measures: t('Maße eintragen'), program: t('Neues Programm'), workout: t('Einzelnes Workout erstellen'),
}

function ListEditor({ title, layout, labels, keepOne, collapsible, hint, onChange }: {
  title: string; layout: ListLayout; labels: Record<string, string>; keepOne?: boolean; collapsible?: boolean; hint?: string
  onChange: (l: ListLayout) => void
}) {
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const mids = useRef<number[]>([])
  // Beim Ziehen zeigt die Liste die Vorschau; gespeichert wird erst beim Loslassen
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)
  const shown = layout.order.filter((id) => !layout.hidden.includes(id)).length
  const view = drag ? moveItem(layout, drag.from, drag.over) : layout

  const start = (e: React.PointerEvent, i: number) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    mids.current = rows.current.slice(0, layout.order.length).map((r) => { const b = r?.getBoundingClientRect(); return b ? b.top + b.height / 2 : 0 })
    setDrag({ from: i, over: i })
  }
  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const over = dropIndex(mids.current, e.clientY)
    if (over !== drag.over) setDrag({ ...drag, over })
  }
  const end = (commit: boolean) => {
    if (drag && commit && drag.from !== drag.over) onChange(moveItem(layout, drag.from, drag.over))
    setDrag(null)
  }

  const body = (
    <div className="space-y-2">
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {view.order.map((id, vi) => {
        const hidden = view.hidden.includes(id)
        const locked = !hidden && !!keepOne && shown <= 1
        const i = layout.order.indexOf(id)
        const dragging = !!drag && drag.over === vi
        return (
          <div key={id} ref={(el) => { rows.current[vi] = el }}
            className={cx('flex items-center gap-1 rounded-xl bg-surface2 pl-1 pr-1 py-1', dragging && 'ring-2 ring-accent')}>
            <span role="button" tabIndex={-1} aria-label={t('Ziehen zum Sortieren')}
              onPointerDown={(e) => start(e, i)} onPointerMove={move} onPointerUp={() => end(true)} onPointerCancel={() => end(false)}
              className="w-8 h-9 shrink-0 flex items-center justify-center text-muted cursor-grab touch-none select-none">⠿</span>
            <span className={cx('flex-1 min-w-0 truncate text-sm font-medium', hidden && 'text-muted line-through')}>{labels[id] ?? id}</span>
            <button type="button" disabled={locked} onClick={() => onChange(toggleHidden(layout, id, keepOne))}
              aria-label={`${labels[id] ?? id} ${hidden ? t('einblenden') : t('ausblenden')}`} aria-pressed={!hidden}
              className="h-9 px-2.5 rounded-full text-xs font-semibold active:opacity-70 disabled:opacity-30">{hidden ? t('Aus') : t('An')}</button>
            <button type="button" aria-label={t('Nach oben')} disabled={i === 0} onClick={() => onChange(moveItem(layout, i, i - 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 disabled:opacity-30">↑</button>
            <button type="button" aria-label={t('Nach unten')} disabled={i === layout.order.length - 1} onClick={() => onChange(moveItem(layout, i, i + 1))}
              className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 disabled:opacity-30">↓</button>
          </div>
        )
      })}
    </div>
  )
  if (collapsible) {
    return (
      <details className="group">
        <summary className="cursor-pointer list-none text-xs uppercase tracking-wide text-muted flex items-center gap-1 py-1">
          <span className="transition-transform group-open:rotate-90">›</span>{title} ({shown}/{layout.order.length})
        </summary>
        <div className="pt-2">{body}</div>
      </details>
    )
  }
  return (
    <section className="space-y-2">
      <h3 className="text-xs uppercase tracking-wide text-muted">{title}</h3>
      {body}
    </section>
  )
}

/** Bearbeitung von Reihenfolge und Sichtbarkeit (geteilt von Sheet im Dashboard und Seite unter Mehr). */
export function LayoutEditor({ prefs }: { prefs: LayoutPrefs }) {
  const labels = useMemo(() => Object.fromEntries(BODY_TILES.map((k) => [k, bodyLabel(k)])), [])
  return (
    <div className="space-y-5 pb-2">
      <p className="text-xs text-muted">{t('Lege fest, was das Dashboard zeigt und was das Plus-Menü anbietet. Zum Sortieren am Griff ziehen oder die Pfeile nutzen.')}</p>
      <ListEditor title={t('Oben')} layout={prefs.top} labels={TOP_LABELS}
        onChange={(top) => void saveLayoutPrefs({ ...prefs, top })} />
      <ListEditor title="Dashboard" layout={prefs.sections} labels={SECTION_LABELS}
        onChange={(sections) => void saveLayoutPrefs({ ...prefs, sections })} />
      <ListEditor title={t('Kacheln bei Körperwerte')} layout={prefs.bodyTiles} labels={labels} collapsible
        hint={t('Welche Werte der Bereich „Körperwerte“ zeigt.')}
        onChange={(bodyTiles) => void saveLayoutPrefs({ ...prefs, bodyTiles })} />
      <ListEditor title={t('Plus-Menü')} layout={prefs.shortcuts} labels={SHORTCUT_LABELS} keepOne
        onChange={(shortcuts) => void saveLayoutPrefs({ ...prefs, shortcuts })} />
      <Button variant="ghost" className="w-full" onClick={() => void saveLayoutPrefs(defaultPrefs())}>{t('Zurücksetzen')}</Button>
    </div>
  )
}

/** Sheet im Dashboard (PLAN-6 B17). */
export function LayoutSheet({ open, onClose, prefs }: { open: boolean; onClose: () => void; prefs: LayoutPrefs }) {
  return (
    <BottomSheet open={open} onClose={onClose} title={t('Anpassen')} tall>
      <LayoutEditor prefs={prefs} />
    </BottomSheet>
  )
}
