"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useTheme } from "../../contexts/ThemeContext"
import { useAuth } from "../../contexts/AuthContext"
import { useLanguage } from "../../contexts/LanguageContext"
import LanguageDropdown from "../ui/LanguageDropdown"
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
                <span className="user-name">Hello, {user?.name}!</span>
                <button className="logout-btn" onClick={handleLogout}>
                  {t("logout")}
                </button>
              </div>
            ) : currentPlayerName ? (
              <div className="guest-menu">
                <span className="guest-name">👤 {currentPlayerName}</span>
              </div>
            ) : (
              <div className="auth-placeholder">
                <span className="guest-text">Guest Mode</span>
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
    </nav>
  )
}

export default Navbar
