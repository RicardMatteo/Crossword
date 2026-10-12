"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "../../contexts/LanguageContext"
import { useAuth } from "../../contexts/AuthContext"
import "./GameLobby.css"

/**
 * Game lobby component where players wait and owner configures game settings
 */
const GameLobby = ({ roomId, onStartGame, onLeaveGame, isOwner = false, players }) => {
  const { t } = useLanguage()
  const { getCurrentPlayerName } = useAuth()
  const [gameSettings, setGameSettings] = useState({
    gameMode: "classic",
    privacy: "public",
    ranked: false,
    maxPlayers: 4,
    difficulty: "medium",
  })

  const gameModes = [
    { value: "classic", label: "Classic" },
    { value: "speed", label: "Speed" },
    { value: "collaborative", label: "Collaborative" },
  ]

  const privacyOptions = [
    { value: "public", label: "Public" },
    { value: "private", label: "Private" },
    { value: "friends", label: "Friends Only" },
  ]

  const difficultyLevels = [
    { value: "easy", label: "Easy" },
    { value: "medium", label: "Medium" },
    { value: "hard", label: "Hard" },
  ]

  const handleSettingChange = (setting, value) => {
    setGameSettings((prev) => ({
      ...prev,
      [setting]: value,
    }))
  }

  const canStartGame = players.length >= 1
  return (
    <div className="game-lobby">
      <div className="lobby-header">
        <h1 className="lobby-title">
          {t("gameLobby")} - {roomId}
        </h1>
        <button className="btn btn-danger" onClick={onLeaveGame}>
          {t("leaveGame")}
        </button>
      </div>

      <div className="lobby-content">
        <div className="players-section">
          <h3>
            {t("playersInLobby")} ({players.length}/{gameSettings.maxPlayers})
          </h3>
          <div className="players-list">
            {players.map((player) => (
              <div key={player.name} className="player-card">
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  {player.isOwner && <span className="owner-badge">👑</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isOwner && (
          <div className="settings-section">
            <h3>{t("gameSettings")}</h3>
            <div className="settings-grid">
              <div className="setting-group">
                <label>{t("gameMode")}</label>
                <select
                  value={gameSettings.gameMode}
                  onChange={(e) => handleSettingChange("gameMode", e.target.value)}
                  className="setting-select"
                >
                  {gameModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label>{t("privacy")}</label>
                <select
                  value={gameSettings.privacy}
                  onChange={(e) => handleSettingChange("privacy", e.target.value)}
                  className="setting-select"
                >
                  {privacyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label>Difficulty</label>
                <select
                  value={gameSettings.difficulty}
                  onChange={(e) => handleSettingChange("difficulty", e.target.value)}
                  className="setting-select"
                >
                  {difficultyLevels.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label>Max Players</label>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={gameSettings.maxPlayers}
                  onChange={(e) => handleSettingChange("maxPlayers", Number.parseInt(e.target.value))}
                  className="setting-input"
                />
              </div>

              <div className="setting-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={gameSettings.ranked}
                    onChange={(e) => handleSettingChange("ranked", e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  {t("ranked")} Match
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="lobby-actions">
          {isOwner ? (
            <button
              className={`btn btn-primary btn-large ${!canStartGame ? "disabled" : ""}`}
              onClick={onStartGame}
              disabled={!canStartGame}
            >
              {canStartGame ? t("startGame") : t("waitingForPlayers")}
            </button>
          ) : (
            <div className="waiting-message">
              <p>{t("waitingForPlayers")}</p>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameLobby
