import { useEffect, useState } from 'react'
import { BottomSheet, Button, Segmented } from '../../components/ui'
import type { Program } from '../../types'
import { BLOCK_WEEK_OPTIONS, blockWeeksOf } from '../../engine/periodization'
import { MAX_BLOCKS, applySettings, settingsOf, type ProgramSettings } from '../../engine/programAdmin'
import { IdentityFields } from '../wizard/shared'

const BLOCK_COUNTS = [1, 2, 3, 4, 6]

/** Programm-Einstellungen (PLAN-6 B4): Name, Icon, Farbe, Blocklänge, Deload, Programm-Ende. */
export function ProgramSettingsSheet({ program, onClose, onSave }: {
  program: Program | null; onClose: () => void; onSave: (p: Program) => void
}) {
  const [s, setS] = useState<ProgramSettings | null>(null)
  useEffect(() => { if (program) setS(settingsOf(program)) }, [program])
  const cfg = program?.config
  const counts = s?.blocks && !BLOCK_COUNTS.includes(s.blocks) ? [...BLOCK_COUNTS, s.blocks].sort((a, b) => a - b).filter((n) => n <= MAX_BLOCKS) : BLOCK_COUNTS
  const set = (v: Partial<ProgramSettings>) => setS((x) => (x ? { ...x, ...v } : x))

  return (
    <BottomSheet open={!!program} onClose={onClose} title="Programm-Einstellungen" tall>
      {program && s && (
        <div className="space-y-5">
          <IdentityFields name={s.name} icon={s.icon} color={s.color} onChange={set} />
          {cfg ? (
            <>
              <div>
                <div className="text-sm font-medium mb-2">Trainingswochen pro Block: {s.blockWeeks ?? blockWeeksOf(cfg)}</div>
                <Segmented value={String(s.blockWeeks ?? blockWeeksOf(cfg))} onChange={(v) => set({ blockWeeks: Number(v) })}
                  options={BLOCK_WEEK_OPTIONS.map((n) => ({ value: String(n), label: `${n}` }))} />
                <p className="text-xs text-muted mt-2">Gilt ab sofort für den ganzen Verlauf. Bereits geloggte Einheiten behalten ihre Programmwoche, nur die Blockgrenzen verschieben sich.</p>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Deload-Woche</div>
                <Segmented value={!s.deload ? 'off' : s.deloadFirst ? 'start' : 'end'}
                  onChange={(v) => set({ deload: v !== 'off', deloadFirst: v === 'start' })}
                  options={[{ value: 'end', label: 'Am Ende' }, { value: 'start', label: 'Am Anfang' }, { value: 'off', label: 'Keine' }]} />
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Programm-Ende</div>
                <Segmented value={s.blocks ? String(s.blocks) : 'inf'} onChange={(v) => set({ blocks: v === 'inf' ? undefined : Number(v) })}
                  options={[{ value: 'inf', label: 'Endlos' }, ...counts.map((n) => ({ value: String(n), label: n === 1 ? '1 Block' : `${n} Blöcke` }))]} />
                <p className="text-xs text-muted mt-2">Nach dem letzten Block fragt die App, ob du einen weiteren Block anhängen oder das Programm abschließen willst.</p>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted">Eigener Plan ohne Periodisierung: Blocklänge und Deload entfallen.</p>
          )}
          <Button className="w-full" disabled={!s.name.trim()} onClick={() => onSave(applySettings(program, s))}>Speichern</Button>
        </div>
      )}
    </BottomSheet>
  )
}
