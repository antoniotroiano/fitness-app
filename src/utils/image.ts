import { t } from '../i18n'
/** Eigene Übungsbilder werden verkleinert gespeichert (Performance, Backup-Größe). */
export const IMAGE_MAX_SIDE = 480
/** Obergrenze der gespeicherten Data-URL in Zeichen (≈ 100 kB) */
export const IMAGE_MAX_CHARS = 140_000

/** Zielgröße: längste Seite höchstens `max`, nie vergrößern, Seitenverhältnis bleibt. */
export function fitSize(w: number, h: number, max = IMAGE_MAX_SIDE): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/** Bilddatei → verkleinerte JPEG-Data-URL. Wirft bei Nicht-Bildern oder wenn das Ergebnis trotz Qualitätsstufen zu groß bleibt. */
export async function shrinkImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(t('Bitte wähle eine Bilddatei.'))
  const bmp = await createImageBitmap(file)
  try {
    const { w, h } = fitSize(bmp.width, bmp.height)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error(t('Das Bild konnte nicht verarbeitet werden.'))
    ctx.fillStyle = '#fff' // PNG mit Transparenz: weißer Grund statt schwarz
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bmp, 0, 0, w, h)
    for (const q of [0.8, 0.65, 0.5]) {
      const url = canvas.toDataURL('image/jpeg', q)
      if (url.length <= IMAGE_MAX_CHARS) return url
    }
    throw new Error(t('Das Bild ist zu groß, bitte ein kleineres wählen.'))
  } finally {
    bmp.close()
  }
}
