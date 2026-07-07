import { create } from 'zustand'
import type { DistributorOnboarding } from '../types'

const EMPTY: DistributorOnboarding = {
  name: '',
  code: '',
  category: 'A',
  zone: 'North',
  gstin: '',
  contact: '',
}

interface OnboardingState {
  step: number
  data: DistributorOnboarding
  setData: (patch: Partial<DistributorOnboarding>) => void
  next: () => void
  back: () => void
  reset: () => void
}

/**
 * Feature-local wizard slice: holds step index + draft data for the
 * distributor onboarding flow. Submitted via a single mutation, then reset.
 */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 0,
  data: EMPTY,
  setData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  next: () => set((s) => ({ step: Math.min(s.step + 1, 2) })),
  back: () => set((s) => ({ step: Math.max(s.step - 1, 0) })),
  reset: () => set({ step: 0, data: EMPTY }),
}))
