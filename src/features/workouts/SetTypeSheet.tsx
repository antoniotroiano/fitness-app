import type { ReactNode } from 'react'
import { BottomSheet, cx } from '../../components/ui'
import type { Row } from './state'
import { t } from '../../i18n'

export type SetTypeChoice = 'warmup' | 'work' | 'failure' | 'drop' | 'myo' | 'addSegment'

/** Kürzel in der Satz-Spalte */
export const SET_BADGE = { warmup: 'W', failure: 'F', drop: 'D', myo: 'M' } as const

function Option({ badge, title, text, active, onClick, tone }: {
  badge: ReactNode; title: string; text: string; active?: boolean; onClick: () => void; tone?: string
}) {
  return (
    <button onClick={onClick}
      className={cx('w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left active:opacity-70 border', active ? 'border-accent bg-surface2' : 'border-transparent bg-surface2')}>
      <span className={cx('w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold', tone ?? 'bg-surface text-fg')}>{badge}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </button>
  )
}

/**
 * Satztyp wählen. Arbeitssätze: Standard, Failure, Aufwärmen oder als Drop-/Myo-Satz fortsetzen (fügt ein
 * Segment an). Segmente (Teil eines Drop-/Myo-Satzes): weiteres Segment anhängen.
 */
export function SetTypeSheet({ open, row, onPick, onClose }: {
  open: boolean; row: Row | undefined; onPick: (t: SetTypeChoice) => void; onClose: () => void
}) {
  const seg = row?.type === 'drop' || row?.type === 'myo'
  const cur = !row ? 'work' : row.type === 'warmup' ? 'warmup' : row.failure ? 'failure' : row.type
  return (
    <BottomSheet open={open} onClose={onClose} title={seg ? (row?.type === 'drop' ? t('Drop-Satz') : t('Myo-Satz')) : t('Satztyp')}>
      <div className="space-y-2">
        {seg ? (
          <>
            <Option badge="+" title={t('Weiteres Segment')} onClick={() => onPick('addSegment')}
              text={row?.type === 'drop' ? t('Gewicht nochmals reduzieren und weitermachen') : t('Nach kurzer Pause noch ein Mini-Satz')} />
            <p className="text-xs text-muted px-1">{t('Segment entfernen: Zeile nach links wischen.')}</p>
          </>
        ) : (
          <>
            <Option badge="1" title={t('Standardsatz')} text={t('Gewicht und Wdh. im Zielbereich')} active={cur === 'work'} onClick={() => onPick('work')} />
            <Option badge={SET_BADGE.failure} tone="bg-danger/15 text-danger" title={t('Failure-Satz')} text={t('Bis zum technischen Versagen, RIR 0')}
              active={cur === 'failure'} onClick={() => onPick('failure')} />
            <Option badge={SET_BADGE.drop} tone="bg-accent/15 text-accent" title={t('Drop-Satz')} text={t('Danach mit leichterem Gewicht weiter, ohne Pause')}
              onClick={() => onPick('drop')} />
            <Option badge={SET_BADGE.myo} tone="bg-accent/15 text-accent" title={t('Myo-Satz')} text={t('Danach Mini-Sätze mit gleichem Gewicht, 10–20 s Pause')}
              onClick={() => onPick('myo')} />
            <Option badge={SET_BADGE.warmup} tone="bg-warn/15 text-warn" title={t('Aufwärmsatz')} text={t('Zählt nicht für Volumen und Progression')}
              active={cur === 'warmup'} onClick={() => onPick('warmup')} />
          </>
        )}
      </div>
    </BottomSheet>
  )
}
