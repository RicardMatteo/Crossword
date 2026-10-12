"use client"

import { createContext, useContext, useState, useEffect } from "react"

const ThemeContext = createContext()

/**
 * Theme provider that manages light/dark mode state
 * Persists theme preference in localStorage
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("crossword-theme")
    return savedTheme || "light"
  })

  useEffect(() => {
    localStorage.setItem("crossword-theme", theme)
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"))
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
