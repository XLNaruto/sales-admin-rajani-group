import type { ComboboxOption } from '@/components/ui/combobox'
import type { BeatGrade } from '../types'

/** Beat-grade dropdown options (value → human label). */
export const BEAT_GRADES: ComboboxOption[] = [
  { value: 'urban', label: 'Urban' },
  { value: 'semi_urban', label: 'Semi Urban' },
  { value: 'metro', label: 'Metro' },
  { value: 'non_metro', label: 'Non Metro' },
  { value: 'rural', label: 'Rural' },
]

const GRADE_LABELS: Record<BeatGrade, string> = {
  urban: 'Urban',
  semi_urban: 'Semi Urban',
  metro: 'Metro',
  non_metro: 'Non Metro',
  rural: 'Rural',
}

/** Human label for a beat grade (falls back to the raw value). */
export const gradeLabel = (grade: string) =>
  GRADE_LABELS[grade as BeatGrade] ?? grade
