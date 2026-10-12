"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useLanguage } from "../contexts/LanguageContext"
import AuthModal from "../components/auth/AuthModal"
import GameList from "../components/game/GameList"
import Hero from "../components/home/Hero"
import Features from "../components/home/Features"
import SEO from "../components/SEO"
import "./HomePage.css"

/**
 * Homepage component with hero section, authentication, and game management
 * Displays public games, allows creating/joining games, and handles user authentication
 */
const HomePage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, getCurrentPlayerName, setGuestName } = useAuth()
  const { t } = useLanguage()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [tempName, setTempName] = useState("")
  const [publicGames, setPublicGames] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchPublicGames()
  }, [])

  const fetchPublicGames = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/public_games")
      if (response.ok) {
        const games = await response.json()
        setPublicGames(games)
      }
    } catch (error) {
      console.error("Error fetching public games:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGame = () => {
    const currentName = getCurrentPlayerName()

    if (!currentName) {
      setShowNameModal(true)
      return
    }

    // Generate random room ID
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    navigate(`/game/${roomId}`)
  }

  const handleJoinGame = (roomId) => {
    const currentName = getCurrentPlayerName()

    if (!currentName) {
      setShowNameModal(true)
      return
    }

    navigate(`/game/${roomId}`)
  }

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      setGuestName(tempName.trim())
      setShowNameModal(false)
      setTempName("")
      // Retry the action that required a name
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
      navigate(`/game/${roomId}`)
    }
  }

  return (
    <>
      <SEO
        title="CrosswordMaster - Play Crosswords Online"
        description="Join the ultimate online crossword experience. Create or join multiplayer crossword games with friends and players worldwide."
        keywords="crossword, puzzle, online game, multiplayer, word game"
      />

      <div className="homepage">
        <Hero
          onCreateGame={handleCreateGame}
          onShowAuth={() => setShowAuthModal(true)}
          isAuthenticated={isAuthenticated}
        />

        <Features />

        <section className="games-section">
          <div className="container">
            <h2 className="section-title">{t("publicGames")}</h2>
            <GameList games={publicGames} loading={loading} onJoinGame={handleJoinGame} onRefresh={fetchPublicGames} />
          </div>
        </section>

        {showAuthModal && (
          <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />
        )}

        {showNameModal && (
          <div className="auth-modal-overlay" onClick={() => setShowNameModal(false)}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowNameModal(false)}>
                ×
              </button>
              <h2>{t("enterName")}</h2>
              <div className="form-group">
                <label className="form-label">{t("name")}</label>
                <input
                  className="form-input"
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder={t("enterName")}
                  onKeyPress={(e) => e.key === "Enter" && handleNameSubmit()}
                  autoFocus
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={handleNameSubmit}
                disabled={!tempName.trim()}
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default HomePage
