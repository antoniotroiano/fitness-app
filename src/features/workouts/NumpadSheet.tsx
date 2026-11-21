import { useRef } from 'react'
import { cx } from '../../components/ui'
import { rirColor } from '../../components/rir'

interface Props {
  field: 'weight' | 'reps'
  label: string
  value: string
  rir: string
  onValue: (v: string) => void
  onRir: (v: string) => void
  onConfirm: () => void
  onClose: () => void
}

/** Am unteren Rand angedocktes Zahlenfeld (nicht modal, die Tabelle bleibt sichtbar). */
export function NumpadSheet({ field, label, value, rir, onValue, onRir, onConfirm, onClose }: Props) {
  // Erste Eingabe ersetzt den vorhandenen Wert
  const fresh = useRef(true)
  const isWeight = field === 'weight'

  const press = (k: string) => {
    const base = fresh.current ? '' : value
    fresh.current = false
    if (k === ',') {
      if (!isWeight || base.includes('.')) return
      onValue((base || '0') + '.')
      return
    }
    if (base.length >= (isWeight ? 6 : 3)) return
    onValue(base === '0' ? k : base + k)
  }
  const back = () => { fresh.current = false; onValue(value.slice(0, -1)) }

  const key = 'h-12 rounded-xl bg-surface2 text-xl font-medium active:bg-line'
  return (
    <div data-numpad className="fixed bottom-0 inset-x-0 z-40">
      <div className="max-w-2xl mx-auto bg-surface border-t border-x border-line rounded-t-2xl p-3 safe-bottom shadow-2xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="text-sm text-muted">{label}</div>
          <div className="text-2xl font-semibold tabular-nums">{value || '–'}</div>
          <button onClick={onClose} aria-label="Schließen" className="text-muted text-xl px-2">✕</button>
        </div>
        {!isWeight && (
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-muted mr-1">RIR</span>
            {['0', '1', '2', '3', '4', '5', '6'].map((n) => (
              <button key={n} onClick={() => onRir(n)} aria-label={`RIR ${n === '6' ? '6 oder mehr' : n}`}
                className={cx('flex-1 h-9 rounded-lg text-sm font-semibold border', rir === n ? 'text-accent-fg border-transparent' : 'border-transparent bg-surface2')}
                style={rir === n ? { background: rirColor(Number(n)), borderColor: rirColor(Number(n)) } : { color: rirColor(Number(n)) }}>
                {n === '6' ? '6+' : n}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {['1', '2', '3'].map((k) => <button key={k} className={key} onClick={() => press(k)}>{k}</button>)}
          <button className={key} onClick={back} aria-label="Löschen">⌫</button>
          {['4', '5', '6'].map((k) => <button key={k} className={key} onClick={() => press(k)}>{k}</button>)}
          <button onClick={onConfirm} aria-label="Bestätigen"
            className="row-span-3 rounded-xl bg-accent text-accent-fg text-2xl font-bold">✓</button>
          {['7', '8', '9'].map((k) => <button key={k} className={key} onClick={() => press(k)}>{k}</button>)}
          <button className={cx(key, !isWeight && 'opacity-30')} disabled={!isWeight} onClick={() => press(',')}>,</button>
          <button className={key} onClick={() => press('0')}>0</button>
          <span />
        </div>
      </div>
    </div>
  )
}
