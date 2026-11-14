import type { Muscle, MuscleId } from '../types'

export const MUSCLES: Muscle[] = [
  { id: 'chest', label: 'Brust', region: 'upper' },
  { id: 'lats', label: 'Lats', region: 'upper' },
  { id: 'upperBack', label: 'Oberer Rücken', region: 'upper' },
  { id: 'traps', label: 'Trapez', region: 'upper' },
  { id: 'shoulders', label: 'Schultern', region: 'upper' },
  { id: 'biceps', label: 'Bizeps', region: 'upper' },
  { id: 'triceps', label: 'Trizeps', region: 'upper' },
  { id: 'forearms', label: 'Unterarme', region: 'upper' },
  { id: 'quads', label: 'Quadrizeps', region: 'lower' },
  { id: 'hamstrings', label: 'Hamstrings', region: 'lower' },
  { id: 'glutes', label: 'Gesäß', region: 'lower' },
  { id: 'calves', label: 'Waden', region: 'lower' },
  { id: 'adductors', label: 'Adduktoren', region: 'lower' },
  { id: 'abductors', label: 'Abduktoren', region: 'lower' },
  { id: 'core', label: 'Core/Bauch', region: 'lower' },
]

export const muscleLabel = (id: MuscleId) => MUSCLES.find((m) => m.id === id)?.label ?? id

/** Gewichtung sekundärer Muskeln beim Zählen von Sets/Volumen */
export const SECONDARY_WEIGHT = 0.5
