import type { Muscle, MuscleId } from '../types'

/** 22 Muskelgruppen. Reihenfolge = Anzeige in Filtern und Listen. */
export const MUSCLES: Muscle[] = [
  { id: 'chest', label: 'Brust', region: 'upper' },
  { id: 'upperBack', label: 'Oberer Rücken', region: 'upper' },
  { id: 'lats', label: 'Lats', region: 'upper' },
  { id: 'biceps', label: 'Bizeps', region: 'upper' },
  { id: 'triceps', label: 'Trizeps', region: 'upper' },
  { id: 'frontDelts', label: 'Vordere Schulter', region: 'upper' },
  { id: 'sideDelts', label: 'Seitliche Schulter', region: 'upper' },
  { id: 'lowerBack', label: 'Unterer Rücken', region: 'upper' },
  { id: 'abs', label: 'Bauch', region: 'lower' },
  { id: 'traps', label: 'Trapez', region: 'upper' },
  { id: 'rearDelts', label: 'Hintere Schulter', region: 'upper' },
  { id: 'forearms', label: 'Unterarme', region: 'upper' },
  { id: 'obliques', label: 'Seitliche Bauchmuskeln', region: 'lower' },
  { id: 'neck', label: 'Nacken', region: 'upper' },
  { id: 'serratus', label: 'Serratus', region: 'upper' },
  { id: 'quads', label: 'Quadrizeps', region: 'lower' },
  { id: 'glutes', label: 'Gesäß', region: 'lower' },
  { id: 'hamstrings', label: 'Hamstrings', region: 'lower' },
  { id: 'calves', label: 'Waden', region: 'lower' },
  { id: 'abductors', label: 'Abduktoren', region: 'lower' },
  { id: 'adductors', label: 'Adduktoren', region: 'lower' },
  { id: 'tibialis', label: 'Schienbein', region: 'lower' },
]

export const muscleLabel = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.label ?? id

/** Gewichtung sekundärer Muskeln beim Zählen von Sets/Volumen */
export const SECONDARY_WEIGHT = 0.5
