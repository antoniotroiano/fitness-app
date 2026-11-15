import { BottomSheet, Button } from '../../components/ui'

/** Satztyp wählen. Das Datenmodell lässt später Drop-, Failure- und Myo-Sätze zu. */
export function SetTypeSheet({ open, current, onPick, onClose }: {
  open: boolean; current: 'warmup' | 'work'; onPick: (t: 'warmup' | 'work') => void; onClose: () => void
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Satztyp">
      <div className="space-y-2">
        <Button variant={current === 'warmup' ? 'primary' : 'ghost'} className="w-full" onClick={() => onPick('warmup')}>W · Aufwärmsatz</Button>
        <Button variant={current === 'work' ? 'primary' : 'ghost'} className="w-full" onClick={() => onPick('work')}>Standardsatz</Button>
      </div>
    </BottomSheet>
  )
}
