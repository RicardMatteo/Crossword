"use client"

import { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

/**
 * Authentication provider that manages user state
 * Handles both authenticated users and guest users with temporary names
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing user session
    const savedUser = localStorage.getItem("crossword-user")
    const savedGuestName = localStorage.getItem("crossword-guest-name")

    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Error parsing saved user data:", error)
        localStorage.removeItem("crossword-user")
      }
    }

    if (savedGuestName) {
      setGuestName(savedGuestName)
    }

    setLoading(false)
  }, [])

  const login = async (userData) => {
    try {
      // Make actual API call to backend
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error("Login failed")
      }

      const result = await response.json()

      setUser(result.user)
      setIsAuthenticated(true)
      localStorage.setItem("crossword-user", JSON.stringify(result.user))
      localStorage.setItem("crossword-auth-token", result.token)

      return { success: true }
    } catch (error) {
      console.error("Login error:", error)
      return { success: false, error: error.message }
    }
  }

  const register = async (userData) => {
    try {
      // Make actual API call to backend
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error("Registration failed")
      }

      const result = await response.json()

      setUser(result.user)
      setIsAuthenticated(true)
      localStorage.setItem("crossword-user", JSON.stringify(result.user))
      localStorage.setItem("crossword-auth-token", result.token)

      return { success: true }
    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("crossword-user")
    localStorage.removeItem("crossword-auth-token")
    // Keep guest name for convenience
  }

  const updateUser = (updatedData) => {
    const newUserData = { ...user, ...updatedData }
    setUser(newUserData)
    localStorage.setItem("crossword-user", JSON.stringify(newUserData))
  }

  const setGuestNameAndSave = (name) => {
    setGuestName(name)
    localStorage.setItem("crossword-guest-name", name)
  }

  const getCurrentPlayerName = () => {
    return user?.name || guestName || ""
  }

  const updateUserProfile = async (userData) => {
    try {
      const token = localStorage.getItem("crossword-auth-token")
      const response = await fetch("/api/user/update", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        throw new Error("Update failed")
      }

      const result = await response.json()
      updateUser(result.user)

      return { success: true }
    } catch (error) {
      console.error("Update error:", error)
      return { success: false, error: error.message }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        guestName,
        loading,
        login,
        register,
        logout,
        updateUser,
        updateUserProfile,
        setGuestName: setGuestNameAndSave,
        getCurrentPlayerName,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
