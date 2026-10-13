"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useLanguage } from "../contexts/LanguageContext"
import GameList from "../components/game/GameList"
import SEO from "../components/SEO"
import "./HomePage.css"

const newRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase()

/**
 * Homepage: pick a name, then create a room, join one by code, or pick a public game
 */
const HomePage = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, getCurrentPlayerName, setGuestName } = useAuth()
  const { t } = useLanguage()
  const [guestInput, setGuestInput] = useState(getCurrentPlayerName())
  // Logged-in players always play under their account name
  const name = isAuthenticated ? user.name : guestInput
  const [roomCode, setRoomCode] = useState("")
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
        setPublicGames(await response.json())
      }
    } catch (error) {
      console.error("Error fetching public games:", error)
    } finally {
      setLoading(false)
    }
  }

  const goToRoom = (roomId) => {
    const trimmed = name.trim()
    if (!trimmed || !roomId) return
    if (!isAuthenticated && trimmed !== getCurrentPlayerName()) setGuestName(trimmed)
    navigate(`/game/${roomId}`)
  }

  const hasName = name.trim() !== ""

  return (
    <>
      <SEO
        title="Mots fléchés multijoueur"
        description="Jouez une grille de mots fléchés à plusieurs, en temps réel."
        keywords="mots fléchés, multijoueur, jeu de mots"
      />

      <div className="homepage container">
        <header className="home-header">
          <h1>{t("homeTitle")}</h1>
          <p>{t("homeSubtitle")}</p>
        </header>

        <section className="home-card">
          {isAuthenticated ? (
            <p className="playing-as">
              {t("playingAs")} <strong>{user.name}</strong>
            </p>
          ) : (
            <>
              <label className="form-label" htmlFor="player-name">
                {t("yourName")}
              </label>
              <input
                id="player-name"
                className="form-input"
                placeholder={t("enterName")}
                value={guestInput}
                maxLength={20}
                onChange={(e) => setGuestInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goToRoom(newRoomId())}
                autoFocus={!hasName}
              />
            </>
          )}

          <div className="home-actions">
            <button className="btn btn-primary" disabled={!hasName} onClick={() => goToRoom(newRoomId())}>
              {t("newGame")}
            </button>

            <form
              className="join-form"
              onSubmit={(e) => {
                e.preventDefault()
                goToRoom(roomCode.trim().toUpperCase())
              }}
            >
              <input
                className="form-input"
                placeholder={t("roomCode")}
                value={roomCode}
                maxLength={12}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              <button className="btn btn-secondary" type="submit" disabled={!hasName || !roomCode.trim()}>
                {t("join")}
              </button>
            </form>
          </div>

          {!hasName && <p className="home-hint">{t("nameRequired")}</p>}
          {!isAuthenticated && hasName && <p className="home-hint">{t("loginToKeepStats")}</p>}
        </section>

        <section className="home-games">
          <GameList
            games={publicGames}
            loading={loading}
            onJoinGame={goToRoom}
            onRefresh={fetchPublicGames}
            canJoin={hasName}
          />
        </section>
      </div>
    </>
  )
}

export default HomePage
