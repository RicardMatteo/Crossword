"use client"

import { useLanguage } from "../../contexts/LanguageContext"
import "./GameLobby.css"

const END_DELAYS = [15, 30, 60, 90, 120, 180, 300]
const MAX_PLAYERS = [2, 3, 4, 5, 6, 7, 8]

/**
 * Game lobby: players wait while the owner edits the settings.
 * Settings live on the server; everyone sees them, only the owner can change them.
 */
const GameLobby = ({ roomId, onStartGame, onLeaveGame, isOwner = false, players, settings, onChangeSettings }) => {
  const { t } = useLanguage()

  const gameModes = [
    { value: "classic", label: t("modeClassic") },
    { value: "coop", label: t("modeCoop") },
  ]

  const endRules = [
    { value: "first", label: t("endRuleFirst") },
    { value: "all", label: t("endRuleAll") },
    { value: "delay", label: t("endRuleDelay") },
  ]

  const select = (key, options, parse = (v) => v) => (
    <select
      value={String(settings[key])}
      onChange={(e) => onChangeSettings({ [key]: parse(e.target.value) })}
      className="setting-select"
      disabled={!isOwner}
    >
      {options.map((option) => (
        <option key={option.value} value={String(option.value)}>
          {option.label}
        </option>
      ))}
    </select>
  )

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
            {t("playersInLobby")} ({players.length}
            {settings && `/${settings.maxPlayers}`})
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

        <div className="settings-section">
          <h3>{t("gameSettings")}</h3>
          {settings && (
            <div className="settings-grid">
              <div className="setting-group">
                <label>{t("gameMode")}</label>
                {select("mode", gameModes)}
              </div>

              <div className="setting-group">
                <label>{t("privacy")}</label>
                {select(
                  "isPublic",
                  [
                    { value: true, label: t("privacyPublic") },
                    { value: false, label: t("privacyPrivate") },
                  ],
                  (v) => v === "true",
                )}
              </div>

              {/* Coop ends when the shared grid is complete: no end rule to pick */}
              {settings.mode === "classic" && (
                <div className="setting-group">
                  <label>{t("endRule")}</label>
                  {select("endRule", endRules)}
                </div>
              )}

              {settings.mode === "classic" && settings.endRule === "delay" && (
                <div className="setting-group">
                  <label>{t("endDelaySeconds")}</label>
                  {select(
                    "endDelay",
                    END_DELAYS.map((s) => ({ value: s, label: `${s} s` })),
                    Number,
                  )}
                </div>
              )}

              <div className="setting-group">
                <label>{t("maxPlayers")}</label>
                {select(
                  "maxPlayers",
                  MAX_PLAYERS.filter((n) => n >= players.length).map((n) => ({ value: n, label: String(n) })),
                  Number,
                )}
              </div>
            </div>
          )}
          {settings && !settings.isPublic && <p className="setting-hint">{t("privateHint")}</p>}
        </div>

        <div className="lobby-actions">
          {isOwner ? (
            <button className="btn btn-primary btn-large" onClick={onStartGame}>
              {t("startGame")}
            </button>
          ) : (
            <div className="waiting-message">
              <p>{t("waitingForOwnerStart")}</p>
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
