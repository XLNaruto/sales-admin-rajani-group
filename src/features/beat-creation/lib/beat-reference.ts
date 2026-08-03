import type { ComboboxOption } from '@/components/ui/combobox'
import type { BeatGrade } from '../types'

/** Beat-grade dropdown options (value → human label). */
export const BEAT_GRADES: ComboboxOption[] = [
  { value: 'local', label: 'Local' },
  { value: 'rural', label: 'Rural' },
]

const GRADE_LABELS: Record<BeatGrade, string> = {
  local: 'Local',
  rural: 'Rural',
}

/** Human label for a beat grade — `N/A` when absent, else the raw value. */
export const gradeLabel = (grade?: string | null) =>
  grade ? (GRADE_LABELS[grade as BeatGrade] ?? grade) : 'N/A'
