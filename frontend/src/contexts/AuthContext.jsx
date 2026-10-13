"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

const AuthContext = createContext()

const USER_KEY = "crossword-user"
const TOKEN_KEY = "crossword-auth-token"

// Read the saved session synchronously so the very first render already knows
// the player's name (pages like GamePage read it in their initial state)
const loadSavedUser = () => {
  const savedUser = localStorage.getItem(USER_KEY)
  if (!savedUser || !localStorage.getItem(TOKEN_KEY)) return null
  try {
    return JSON.parse(savedUser)
  } catch (error) {
    console.error("Error parsing saved user data:", error)
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const getAuthToken = () => localStorage.getItem(TOKEN_KEY)

/**
 * Call the API with the session token. Throws an Error whose message is the
 * server's error code (e.g. "name_taken"), used as an `authErr_*` translation key.
 */
export const authFetch = async (url, { method = "GET", body } = {}) => {
  const headers = { "Content-Type": "application/json" }
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let response
  try {
    response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new Error("generic")
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(typeof data.detail === "string" ? data.detail : "generic")
    error.status = response.status
    throw error
  }
  return data
}

/**
 * Accounts are optional: a guest plays with a name of their choice, a logged-in
 * player plays under their account name and gets their results saved.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadSavedUser)
  const [guestName, setGuestName] = useState(() => localStorage.getItem("crossword-guest-name") || "")
  const isAuthenticated = user !== null

  const saveSession = (newUser, token) => {
    setUser(newUser)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    if (token) localStorage.setItem(TOKEN_KEY, token)
  }

  const clearSession = useCallback(() => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }, [])

  // The saved session may have expired or been revoked (password changed elsewhere)
  useEffect(() => {
    if (!getAuthToken()) return
    authFetch("/api/auth/me")
      .then((data) => saveSession(data.user))
      .catch((error) => error.status === 401 && clearSession())
  }, [clearSession])

  const run = async (request) => {
    try {
      const data = await request()
      saveSession(data.user, data.token)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const login = ({ email, password }) =>
    run(() => authFetch("/api/auth/login", { method: "POST", body: { email, password } }))

  const register = ({ name, email, password }) =>
    run(() => authFetch("/api/auth/register", { method: "POST", body: { name, email, password } }))

  // { name } and/or { currentPassword, newPassword }
  const updateUserProfile = (changes) => run(() => authFetch("/api/user/update", { method: "PUT", body: changes }))

  const logout = async () => {
    await authFetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    clearSession()
  }

  const deleteAccount = async (password) => {
    try {
      await authFetch("/api/user/delete", { method: "POST", body: { password } })
      clearSession()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const setGuestNameAndSave = (name) => {
    setGuestName(name)
    localStorage.setItem("crossword-guest-name", name)
  }

  const getCurrentPlayerName = () => {
    return user?.name || guestName || ""
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        guestName,
        login,
        register,
        logout,
        updateUserProfile,
        deleteAccount,
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
