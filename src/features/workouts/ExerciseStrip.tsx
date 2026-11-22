import { useEffect, useRef } from 'react'
import { cx } from '../../components/ui'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import type { Exercise } from '../../types'
import { t } from '../../i18n'

/** `linkNext`: Supersatz mit der folgenden Übung */
interface Item { ex: Exercise; done: boolean; linkNext?: boolean }

/** Horizontal scrollbare Reihe der Übungen des Workouts. Die aktive Übung wird zentriert, die übrigen sind abgedunkelt. */
export function ExerciseStrip({ items, current, onSelect, onAdd }: { items: Item[]; current: string; onSelect: (id: string) => void; onAdd?: () => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    refs.current[current]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [current])

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
      {items.map(({ ex, done, linkNext }) => {
        const active = ex.id === current
        return (
          <button key={ex.id} ref={(el) => { refs.current[ex.id] = el }} onClick={() => onSelect(ex.id)}
            aria-label={`${ex.name}${done ? t(' (erledigt)') : ''}${linkNext ? t(', Supersatz mit der nächsten Übung') : ''}`} aria-current={active}
            className={cx('relative shrink-0 rounded-2xl p-0.5 border-2 transition-all',
              active ? 'border-accent' : 'border-transparent opacity-40 grayscale')}>
            <ExercisePhoto ex={ex} size={56} />
            {linkNext && <span aria-hidden className="absolute -right-[14px] top-1/2 -translate-y-1/2 w-[12px] h-[3px] rounded-full bg-accent" />}
            {done && (
              <span className="absolute inset-0.5 rounded-xl bg-black/55 text-white flex items-center justify-center text-2xl font-bold">✓</span>
            )}
          </button>
        )
      })}
      {onAdd && (
        <button onClick={onAdd} aria-label={t('Übung hinzufügen')}
          className="shrink-0 w-[60px] h-[60px] rounded-2xl border-2 border-dashed border-line text-muted text-2xl flex items-center justify-center active:opacity-60">+</button>
      )}
    </div>
  )
}
