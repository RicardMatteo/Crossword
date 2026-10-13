"use client"

import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"
import "./AuthModal.css"

/**
 * Log in / sign up modal. Server error codes are shown through the `authErr_*` translations.
 */
const AuthModal = ({ onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { login, register } = useAuth()
  const { t } = useLanguage()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = isSignUp
      ? await register(formData)
      : await login({ email: formData.email, password: formData.password })
    setLoading(false)

    if (result.success) {
      onSuccess?.()
      onClose()
    } else {
      const key = `authErr_${result.error}`
      setError(t(key) === key ? t("authErr_generic") : t(key))
    }
  }

  const switchMode = () => {
    setIsSignUp(!isSignUp)
    setError("")
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>

        <h2>{isSignUp ? t("signup") : t("login")}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">{t("name")}</label>
              <input
                className="form-input"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                minLength={2}
                maxLength={20}
                autoComplete="username"
                autoFocus
                disabled={loading}
              />
              <small className="form-hint">{t("nameHint")}</small>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t("email")}</label>
            <input
              className="form-input"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
              autoFocus={!isSignUp}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t("password")}</label>
            <input
              className="form-input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={isSignUp ? 8 : undefined}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              disabled={loading}
            />
            {isSignUp && <small className="form-hint">{t("passwordHint")}</small>}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "..." : isSignUp ? t("signup") : t("login")}
          </button>
        </form>

        <p>
          {isSignUp ? t("alreadyAccount") : t("noAccount")}
          <button type="button" className="link-btn" onClick={switchMode} disabled={loading}>
            {isSignUp ? t("login") : t("signup")}
          </button>
        </p>
      </div>
    </div>
  )
}

export default AuthModal
