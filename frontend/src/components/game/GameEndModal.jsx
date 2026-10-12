"use client"

import { useState, useEffect } from "react"
import { useLanguage } from "../../contexts/LanguageContext"
import "./GameEndModal.css"

/**
 * Game end modal with animations and player statistics
 */
const GameEndModal = ({ isOpen, gameStats, onPlayAgain, onClose }) => {
  const { t } = useLanguage()
  const [showStats, setShowStats] = useState(false)
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    if (isOpen) {
      // Animation sequence
      setTimeout(() => setAnimationPhase(1), 500)
      setTimeout(() => setAnimationPhase(2), 1500)
      setTimeout(() => setShowStats(true), 2000)
    } else {
      setShowStats(false)
      setAnimationPhase(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  const sortedPlayers = gameStats?.players?.sort((a, b) => b.score - a.score) || []
  const winner = sortedPlayers[0]

  return (
    <div className="game-end-overlay">
      <div className="game-end-modal">
        {/* Confetti Animation */}
        <div className="confetti-container">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="modal-content">
          {animationPhase >= 1 && (
            <div className={`game-end-title ${animationPhase >= 1 ? "animate-in" : ""}`}>
              <h1>{t("gameFinished")}</h1>
              {winner && (
                <h2 className="winner-announcement">
                  🎉 {t("congratulations")} {winner.name}! 🎉
                </h2>
              )}
            </div>
          )}

          {animationPhase >= 2 && (
            <div className={`trophy-animation ${animationPhase >= 2 ? "animate-in" : ""}`}>
              <div className="trophy">🏆</div>
            </div>
          )}

          {showStats && (
            <div className="stats-section animate-in">
              <h3>{t("finalStats")}</h3>
              <div className="players-stats">
                {sortedPlayers.map((player, index) => (
                  <div key={player.id} className={`player-stat ${index === 0 ? "winner" : ""}`}>
                    <div className="player-rank">#{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">{player.name}</span>
                      <div className="player-details">
                        <span>Score: {player.score}</span>
                        <span>Words: {player.wordsFound}</span>
                        <span>Time: {player.timeElapsed}</span>
                      </div>
                    </div>
                    {index === 0 && <div className="crown">👑</div>}
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button className="btn btn-primary btn-large" onClick={onPlayAgain}>
                  {t("playAgain")}
                </button>
                <button className="btn btn-secondary btn-large" onClick={onClose}>
                  {t("backToHome")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameEndModal
