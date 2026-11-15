import { useRef, useState, type ReactNode } from 'react'

const OPEN = -72

/** Zeile mit Swipe nach links: rotes Minus erscheint rechts und löscht die Zeile. */
export function SwipeRow({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; base: number; active: boolean } | null>(null)
  // Nach einer Wischgeste feuert der Browser noch einen Klick: der darf die Zeile nicht wieder schließen
  const dragged = useRef(false)

  const down = (e: React.PointerEvent) => { dragged.current = false; start.current = { x: e.clientX, y: e.clientY, base: dx, active: false } }
  const move = (e: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const ddx = e.clientX - s.x
    const ddy = e.clientY - s.y
    if (!s.active) {
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) {
        s.active = true
        dragged.current = true
        setDragging(true)
        e.currentTarget.setPointerCapture(e.pointerId)
      } else return
    }
    setDx(Math.min(0, Math.max(OPEN, s.base + ddx)))
  }
  const up = () => {
    const s = start.current
    start.current = null
    if (!s?.active) return
    setDragging(false)
    setDx((d) => (d < OPEN / 2 ? OPEN : 0))
  }

  return (
    <div className="relative overflow-hidden" style={{ touchAction: 'pan-y' }}>
      <button aria-label="Satz löschen" onClick={onDelete} tabIndex={dx === 0 ? -1 : 0}
        style={{ visibility: dx === 0 && !dragging ? 'hidden' : 'visible' }}
        className="absolute inset-y-0 right-0 w-[72px] bg-red-500 text-white text-2xl flex items-center justify-center">−</button>
      <div className="relative bg-surface" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClickCapture={(e) => {
          if (dragged.current) { dragged.current = false; e.stopPropagation(); return }
          if (dx !== 0) { e.stopPropagation(); setDx(0) }
        }}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : 'transform 160ms ease-out' }}>
        {children}
      </div>
    </div>
  )
}
