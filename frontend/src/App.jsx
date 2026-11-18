"use client"

import { useState, useEffect } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom"
import { ThemeProvider } from "./contexts/ThemeContext"
import { AuthProvider } from "./contexts/AuthContext"
import { LanguageProvider } from "./contexts/LanguageContext"
import Navbar from "./components/layout/Navbar"
import HomePage from "./pages/HomePage"
import GamePage from "./pages/GamePage"
import ProfilePage from "./pages/ProfilePage"
import NotFoundPage from "./pages/NotFoundPage"
import OverlayPage from "./pages/OverlayPage"
import "./styles/globals.css"

/**
 * Main App component that handles routing and global providers
 * Implements React Router for navigation and context providers for theme, auth, and language
 */
function App() {

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Stream overlay: full screen, no navigation */}
              <Route path="/overlay/:channel" element={<OverlayPage />} />
              <Route element={<SiteLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/game/:roomId" element={<GamePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  )
}

const SiteLayout = () => (
  <div className="app">
    <Navbar />
    <main className="main-content">
      <Outlet />
    </main>
  </div>
)

export default App
