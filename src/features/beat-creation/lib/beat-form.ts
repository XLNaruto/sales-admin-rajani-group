import { z } from 'zod'

/** The beat form (name / grade / distributors). */
export const beatSchema = z.object({
  beatName: z.string().min(2, 'Enter the beat name'),
  beatGrade: z.enum(['local', 'rural'], {
    message: 'Select a beat grade',
  }),
  distributorIds: z.array(z.string()).min(1, 'Select at least one distributor'),
})

export type BeatFormValues = z.infer<typeof beatSchema>

export const beatDefaults: BeatFormValues = {
  beatName: '',
  beatGrade: 'local',
  distributorIds: [],
}
