import { useEffect, useRef } from 'react'
import { cx } from '../../components/ui'
import { ExercisePhoto } from '../../components/ExerciseMedia'
import type { Exercise } from '../../types'

interface Item { ex: Exercise; done: boolean }

/** Horizontal scrollbare Reihe der Übungen des Workouts. Die aktive Übung wird zentriert, die übrigen sind abgedunkelt. */
export function ExerciseStrip({ items, current, onSelect }: { items: Item[]; current: string; onSelect: (id: string) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    refs.current[current]?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [current])

  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
      {items.map(({ ex, done }) => {
        const active = ex.id === current
        return (
          <button key={ex.id} ref={(el) => { refs.current[ex.id] = el }} onClick={() => onSelect(ex.id)}
            aria-label={done ? `${ex.name} (erledigt)` : ex.name} aria-current={active}
            className={cx('relative shrink-0 rounded-2xl p-0.5 border-2 transition-all',
              active ? 'border-accent' : 'border-transparent opacity-40 grayscale')}>
            <ExercisePhoto ex={ex} size={56} />
            {done && (
              <span className="absolute inset-0.5 rounded-xl bg-black/55 text-white flex items-center justify-center text-2xl font-bold">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
