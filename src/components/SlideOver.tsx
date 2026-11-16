import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Seite, die von rechts hereinschiebt (mit abgedunkeltem Hintergrund).
 * Hat einen eigenen History-Eintrag: Wisch-/Browser-Zurück schließt zuerst das Panel.
 */
export function SlideOver({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const pushed = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const unmounting = useRef(false)
  // Muss vor dem History-Effekt stehen: Cleanups laufen in Deklarationsreihenfolge
  useEffect(() => { unmounting.current = false; return () => { unmounting.current = true } }, [])

  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
      return () => cancelAnimationFrame(t)
    }
    setShown(false)
    const t = setTimeout(() => setMounted(false), 260)
    return () => clearTimeout(t)
  }, [open])

  // History-Eintrag solange das Panel offen ist
  useEffect(() => {
    if (!open) return
    try { window.history.pushState(window.history.state, '') } catch { return }
    pushed.current = true
    const onPop = () => { pushed.current = false; onCloseRef.current() }
    window.addEventListener('popstate', onPop, { once: true })
    return () => {
      window.removeEventListener('popstate', onPop)
      if (pushed.current && !unmounting.current) {
        pushed.current = false
        // Schließen per Button/Hintergrund: den eigenen Eintrag wieder entfernen
        try { window.history.back() } catch { /* ignore */ }
      }
    }
  }, [open])

  if (!mounted) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-250" style={{ opacity: shown ? 1 : 0 }} onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-bg flex flex-col transition-transform duration-250 ease-out"
        style={{ transform: shown ? 'translateX(0)' : 'translateX(100%)' }}>
        <header className="safe-top shrink-0 bg-bg border-b border-line">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={onClose} aria-label="Zurück" className="text-accent text-xl -ml-1">‹</button>
            <h1 className="font-bold text-lg flex-1 truncate">{title}</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 safe-bottom">{children}</div>
      </div>
    </div>
  )
}
