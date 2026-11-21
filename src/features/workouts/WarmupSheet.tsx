import type { Equipment, WarmupStep } from '../../types'
import { BottomSheet, Button, cx } from '../../components/ui'
import { stepsToSets } from '../../engine/warmup'
import { kgToDisplay } from '../../utils/units'
import { SchemeTable } from './sheets'
import { de } from '../../i18n/de'

/** "Set Calculator": Aufwärmsätze der Übung, umschaltbar zwischen Smart (berechnet) und Scheme (editierbar). */
export function WarmupSheet({ open, onClose, mode, smart, scheme, hasOverride, workWeight, equipment, unit, onMode, onScheme, onResetScheme }: {
  open: boolean; onClose: () => void
  mode: 'smart' | 'scheme' | 'none'
  smart: WarmupStep[]; scheme: WarmupStep[]; hasOverride: boolean
  workWeight: number | null; equipment: Equipment; unit: 'kg' | 'lb'
  onMode: (m: 'smart' | 'scheme') => void
  onScheme: (s: WarmupStep[]) => void; onResetScheme: () => void
}) {
  const steps = mode === 'scheme' ? scheme : mode === 'smart' ? smart : []
  const weights = steps.map((s) => {
    const w = stepsToSets([s], workWeight, equipment)[0]?.weight
    return w ? `${kgToDisplay(w, unit)} ${unit}` : null
  })
  const seg = (m: 'smart' | 'scheme', label: string) => (
    <button role="tab" aria-selected={mode === m} onClick={() => onMode(m)}
      className={cx('px-3 py-1.5 rounded-lg text-xs', mode === m ? 'bg-surface font-semibold shadow-sm' : 'text-muted')}>{label}</button>
  )
  const header = (
    <div className="flex items-center gap-3 min-h-8">
      <h2 className="font-bold text-lg flex-1 min-w-0 truncate">{de.logger.calculator}</h2>
      <div role="tablist" aria-label="Aufwärm-Modus" className="flex gap-1 p-1 rounded-xl bg-surface2">
        {seg('smart', 'Smart')}{seg('scheme', de.common.scheme)}
      </div>
      <button type="button" onClick={onClose} aria-label="Schließen"
        className="w-8 h-8 shrink-0 rounded-full bg-surface2 text-muted flex items-center justify-center text-sm">✕</button>
    </div>
  )
  return (
    <BottomSheet open={open} onClose={onClose} header={header}>
      {mode === 'none' && <p className="text-sm text-muted mb-3">Aufwärmen ist für diese Übung ausgeschaltet. Wähle Smart oder Scheme, um es zu aktivieren.</p>}
      {mode === 'smart' && (
        <p className="text-xs text-muted mb-3">Smart berechnet die Sätze aus der Schwere des Arbeitsgewichts und der Frische des Muskels. Zum Ändern auf Scheme wechseln.</p>
      )}
      {mode !== 'none' && <SchemeTable steps={steps} editable={mode === 'scheme'} onChange={onScheme} weights={weights} />}
      {mode === 'scheme' && hasOverride && (
        <Button variant="ghost" className="w-full mt-4" onClick={onResetScheme}>Auf Standard zurücksetzen</Button>
      )}
    </BottomSheet>
  )
}
