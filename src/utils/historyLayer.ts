import { useEffect, useRef } from 'react'

/**
 * Overlay-Ebenen (Slide-Over, Unterseite) mit eigenem History-Eintrag: Wisch-/Browser-Zurück schließt nur die
 * oberste Ebene. Ein gemeinsamer Stapel und ein einziger popstate-Listener sorgen dafür, dass bei verschachtelten
 * Ebenen nicht alle auf denselben Wisch reagieren (frühere Ursache: Wischen schloss die Übungsseite samt Unterseite).
 */
interface Layer { close: () => void }
const stack: Layer[] = []
/** Popstate-Ereignisse, die von unseren eigenen history.go(-n)-Aufrufen stammen und ignoriert werden */
let skip = 0
let pendingBack = 0
let listening = false

function onPop() {
  if (skip > 0) { skip--; return }
  stack.pop()?.close()
}

/** Mehrere Ebenen, die im selben Zug schließen, verbrauchen die Einträge mit einem einzigen Rücksprung. */
function backLater() {
  pendingBack++
  if (pendingBack > 1) return
  queueMicrotask(() => {
    const n = pendingBack
    pendingBack = 0
    if (n <= 0) return
    skip++
    try { window.history.go(-n) } catch { skip-- }
  })
}

/** Test-Hilfe: aktuelle Tiefe des Stapels */
export const layerDepth = () => stack.length

/**
 * Solange `open`: eigener History-Eintrag. Zurück-Wischen ruft `onClose` (nur für die oberste Ebene),
 * Schließen per Knopf entfernt den Eintrag wieder. Beim Entfernen der Komponente (Routenwechsel) bleibt die History unberührt.
 */
export function useHistoryLayer(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const unmounting = useRef(false)
  // Muss vor dem History-Effekt stehen: Cleanups laufen in Deklarationsreihenfolge
  useEffect(() => { unmounting.current = false; return () => { unmounting.current = true } }, [])
  useEffect(() => {
    if (!open) return
    try { window.history.pushState(window.history.state, '') } catch { return }
    if (!listening) { window.addEventListener('popstate', onPop); listening = true }
    const layer: Layer = { close: () => onCloseRef.current() }
    stack.push(layer)
    return () => {
      const i = stack.indexOf(layer)
      if (i < 0) return // per Zurück-Wischen bereits entfernt
      stack.splice(i, 1)
      if (!unmounting.current) backLater()
    }
  }, [open])
}
