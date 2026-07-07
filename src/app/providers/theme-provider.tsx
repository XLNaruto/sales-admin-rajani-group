import { useEffect, type ReactNode } from 'react'
import { useUiStore } from '@/stores/ui-store'

/** Applies the current theme to <html> as a `.dark` class. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <>{children}</>
}
