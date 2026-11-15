import { useEffect, useState, type ReactNode } from 'react'

/** Seite, die von rechts hereinschiebt (mit abgedunkeltem Hintergrund). */
export function SlideOver({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)

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

  if (!mounted) return null
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40 transition-opacity duration-250" style={{ opacity: shown ? 1 : 0 }} onClick={onClose} />
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl bg-bg flex flex-col transition-transform duration-250 ease-out"
        style={{ transform: shown ? 'translateX(0)' : 'translateX(100%)' }}>
        <div className="flex items-center gap-2 px-4 pb-3 pt-3 safe-top border-b border-line bg-surface">
          <button onClick={onClose} aria-label="Zurück" className="text-2xl text-muted w-9">‹</button>
          <h1 className="text-lg font-bold">{title}</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 safe-bottom">{children}</div>
      </div>
    </div>
  )
}
