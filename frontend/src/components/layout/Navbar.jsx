"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useTheme } from "../../contexts/ThemeContext"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"
import LanguageDropdown from "../ui/LanguageDropdown"
import AuthModal from "../auth/AuthModal"
import "./Navbar.css"

/**
 * Navigation bar component with responsive design
 * Includes theme toggle, language toggle, user authentication status, and navigation links
 */
const Navbar = () => {
  const { theme, toggleTheme } = useTheme()
  const { user, isAuthenticated, logout, getCurrentPlayerName } = useAuth()
  const { language, toggleLanguage, t } = useLanguage()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

  const isActive = (path) => location.pathname === path
  const currentPlayerName = getCurrentPlayerName()

  const handleLogout = () => {
    logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">🧩</span>
          CrosswordMaster
        </Link>

        <div className={`navbar-menu ${isMobileMenuOpen ? "active" : ""}`}>
          <Link
            to="/"
            className={`navbar-link ${isActive("/") ? "active" : ""}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {t("home")}
          </Link>

          {isAuthenticated && (
            <Link
              to="/profile"
              className={`navbar-link ${isActive("/profile") ? "active" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t("profile")}
            </Link>
          )}

          <div className="navbar-actions">
            <LanguageDropdown />

            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>

            {isAuthenticated ? (
              <div className="user-menu">
                <Link to="/profile" className="user-name" onClick={() => setIsMobileMenuOpen(false)}>
                  👤 {user.name}
                </Link>
                <button className="logout-btn" onClick={handleLogout}>
                  {t("logout")}
                </button>
              </div>
            ) : (
              <div className="guest-menu">
                {currentPlayerName && <span className="guest-name">{currentPlayerName}</span>}
                <button
                  className="btn btn-primary login-btn"
                  onClick={() => {
                    setShowAuth(true)
                    setIsMobileMenuOpen(false)
                  }}
                >
                  {t("login")}
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </nav>
  )
}

export default Navbar
