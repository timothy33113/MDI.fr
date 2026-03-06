import React, { createContext, useContext, useCallback, useEffect } from 'react'

type Theme = 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme: Theme = 'light'

  // Forcer light au montage : retirer la classe dark et nettoyer le localStorage
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    localStorage.removeItem('mdi-theme')
  }, [])

  const setTheme = useCallback(() => {}, [])
  const toggleTheme = useCallback(() => {}, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext
