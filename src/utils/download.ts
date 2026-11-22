/** Text als Datei speichern (lokal, ohne Netzwerk). */
export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

/** Dateiname ohne Sonderzeichen (für Programmnamen). */
export const safeFileName = (s: string) => s.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'datei'
