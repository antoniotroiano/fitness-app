/**
 * Kurzer Signalton am Ende der Pause (Web Audio, kein Asset). Browser (v. a. iOS-PWA) erlauben Ton erst nach
 * einer Nutzeraktion: der AudioContext wird deshalb beim ersten Tipp/Tastendruck angelegt und fortgesetzt.
 */
let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (ctx) return ctx
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor) ctx = new Ctor()
  } catch { /* kein Audio verfügbar */ }
  return ctx
}

/** Legt den Kontext an und setzt ihn fort; wird bei Nutzeraktionen aufgerufen. */
export function unlockAudio(): void {
  const c = context()
  if (c && c.state === 'suspended') void c.resume().catch(() => {})
}

if (typeof document !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchend'] as const) {
    document.addEventListener(ev, unlockAudio, { passive: true })
  }
}

type AudioSessionLike = { type: string }
const audioSession = (): AudioSessionLike | undefined => (typeof navigator === 'undefined' ? undefined : (navigator as unknown as { audioSession?: AudioSessionLike }).audioSession)

/**
 * Audio-Session-API (Safari ab iOS 16.4): „transient“ unterbricht laufende Musik für die Dauer des Signals kurz
 * (und sie läuft danach weiter), statt dass der Ton leise unter der Musik untergeht. Echtes Leiserstellen („Ducking“)
 * gibt es im Web nicht. Ohne API (andere Browser) bleibt es beim Mischen mit anderem Ton.
 */
function withTransientSession(ms: number): void {
  const s = audioSession()
  if (!s) return
  try {
    s.type = 'transient'
    setTimeout(() => { try { s.type = 'auto' } catch { /* ignorieren */ } }, ms)
  } catch { /* nicht unterstützt */ }
}

/** Zwei kurze Töne (880 Hz, dann 1175 Hz). Tut nichts, wenn Audio gesperrt ist. */
export function playRestEnd(): void {
  const c = context()
  if (!c || c.state !== 'running') return
  try {
    withTransientSession(900)
    const t0 = c.currentTime + 0.05
    ;[880, 1175].forEach((freq, i) => {
      const t = t0 + i * 0.22
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
      osc.connect(gain).connect(c.destination)
      osc.start(t)
      osc.stop(t + 0.2)
    })
  } catch { /* ignorieren */ }
}
