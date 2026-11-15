import { cx } from '../../components/ui'
import { ExerciseThumb } from '../../components/ExerciseThumb'
import type { Exercise } from '../../types'

interface Item { ex: Exercise; done: boolean }

/** Horizontal scrollbare Reihe der Übungen des Workouts. */
export function ExerciseStrip({ items, current, onSelect }: { items: Item[]; current: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 -mx-4 px-4">
      {items.map(({ ex, done }) => (
        <button key={ex.id} onClick={() => onSelect(ex.id)} aria-label={ex.name} aria-current={ex.id === current}
          className={cx('relative shrink-0 rounded-2xl p-0.5 border-2', ex.id === current ? 'border-accent' : 'border-transparent opacity-70')}>
          <ExerciseThumb ex={ex} size={56} />
          {done && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-slate-900 text-xs flex items-center justify-center">✓</span>}
        </button>
      ))}
    </div>
  )
}
