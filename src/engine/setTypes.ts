/**
 * Drop- und Myo-Sätze: Vorbelegung des nächsten Segments. Heuristiken aus der gängigen Praxis:
 * Drop-Satz ≈ 20 % weniger Gewicht (typisch 10–30 %), danach etwas weniger Wdh. als der Hauptsatz;
 * Myo-Mini-Sätze mit gleichem Gewicht nach 10–20 s Pause, je etwa ein Drittel der Wdh. des Aktivierungssatzes
 * (Borge Fagerli, Myo-Reps: 3–5 Wdh. nach einem 12–20er-Satz). Werte sind nur Vorschläge, der Nutzer trägt ein,
 * was er geschafft hat.
 */
export const DROP_FACTOR = 0.8
/** Wdh. des ersten Drop-Segments relativ zum Hauptsatz */
const DROP_REPS = 0.75
/** Pause vor einem Myo-Mini-Satz in Sekunden */
export const MYO_REST_SEC = 15

export interface SegmentBase {
  /** Gewicht in kg, null = leer */
  weight: number | null
  reps: number
  /** Die Vorlage ist selbst schon ein Segment (weiteres Segment derselben Art) */
  segment: boolean
}

/**
 * Nächstes Segment nach `prev`: Drop senkt das Gewicht (gerundet über `snap`, höchstens auf 0), Myo behält es.
 * Wdh.: nach dem Hauptsatz Drop 75 %, Myo ein Drittel (mind. 2); nach einem Segment wie das Segment davor.
 */
export function nextSegment(kind: 'drop' | 'myo', prev: SegmentBase, snap: (kg: number) => number): { weight: number | null; reps: number | null } {
  const weight = prev.weight == null ? null : kind === 'drop' && prev.weight > 0 ? Math.max(0, Math.min(snap(prev.weight * DROP_FACTOR), prev.weight)) : prev.weight
  if (prev.reps <= 0) return { weight, reps: null }
  const reps = prev.segment ? prev.reps : kind === 'drop' ? Math.max(1, Math.round(prev.reps * DROP_REPS)) : Math.max(2, Math.round(prev.reps / 3))
  return { weight, reps }
}
