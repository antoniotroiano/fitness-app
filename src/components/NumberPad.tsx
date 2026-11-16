import { cx } from './ui'

const key = 'h-12 rounded-xl bg-surface2 text-xl font-medium active:bg-line'

/** Eingebettetes Zahlenfeld (Ziffern, Komma, Löschen). Die Eingabelogik liegt beim Aufrufer. */
export function NumberPad({ onDigit, onComma, onBack, allowComma = true }: {
  onDigit: (d: string) => void; onComma: () => void; onBack: () => void; allowComma?: boolean
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
        <button key={k} type="button" className={key} onClick={() => onDigit(k)}>{k}</button>
      ))}
      <button type="button" className={cx(key, !allowComma && 'opacity-30')} disabled={!allowComma} onClick={onComma}>,</button>
      <button type="button" className={key} onClick={() => onDigit('0')}>0</button>
      <button type="button" className={key} onClick={onBack} aria-label="Löschen">⌫</button>
    </div>
  )
}

/** Wendet eine Tasteneingabe auf einen Textwert an (erste Eingabe ersetzt den alten Wert). */
export function applyKey(value: string, k: string, fresh: boolean, maxLen = 6): string {
  const base = fresh ? '' : value
  if (k === 'back') return fresh ? '' : value.slice(0, -1)
  if (k === ',') return base.includes('.') ? base : `${base || '0'}.`
  if (base.length >= maxLen) return base
  return base === '0' ? k : base + k
}
