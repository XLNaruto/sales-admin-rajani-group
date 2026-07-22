import { z } from 'zod'

/** The beat form (name / grade / distributor). */
export const beatSchema = z.object({
  beatName: z.string().min(2, 'Enter the beat name'),
  beatGrade: z.enum(['urban', 'semi_urban', 'metro', 'non_metro', 'rural'], {
    message: 'Select a beat grade',
  }),
  distributorId: z.string().min(1, 'Select a distributor'),
})

export type BeatFormValues = z.infer<typeof beatSchema>

export const beatDefaults: BeatFormValues = {
  beatName: '',
  beatGrade: 'urban',
  distributorId: '',
}
