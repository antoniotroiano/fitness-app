import { BottomSheet } from '../../components/ui'
import { reorderWeekSlot } from '../../db/db'
import type { Program } from '../../types'
import { t } from '../../i18n'

/** Reihenfolge der Wochenslots (Workouts und Ruhetage) eines Programms ändern. */
export function WeekOrderSheet({ program, onClose }: { program: Program | null; onClose: () => void }) {
  const id = program?.id
  return (
    <BottomSheet open={!!program} onClose={onClose} title={t('Wochenplan ordnen')}>
      {program && id !== undefined && (
        <>
          <p className="text-xs text-muted mb-3">{t('Reihenfolge der Tage in der Woche.')} {program.active ? t('Ein erledigter Tag behält seinen Haken und wandert mit.') : ''}</p>
          <div className="space-y-2">
            {program.weekSlots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2">
                <span className="text-xs text-muted w-12 shrink-0">{t('Tag')} {i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-sm font-medium">{slot === 'rest' ? t('Pause') : program.days[slot].name}</span>
                <button aria-label={t('Nach oben')} disabled={i === 0} onClick={() => void reorderWeekSlot(id, i, i - 1)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 disabled:opacity-30">↑</button>
                <button aria-label={t('Nach unten')} disabled={i === program.weekSlots.length - 1} onClick={() => void reorderWeekSlot(id, i, i + 1)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-70 disabled:opacity-30">↓</button>
              </div>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  )
}
