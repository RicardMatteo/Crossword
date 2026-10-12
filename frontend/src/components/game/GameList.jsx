"use client"

import { useLanguage } from "../../contexts/LanguageContext"
import "./GameList.css"

/**
 * List of public games waiting for players
 */
const GameList = ({ games, loading, onJoinGame, onRefresh, canJoin = true }) => {
  const { t } = useLanguage()

  return (
    <div className="game-list">
      <div className="game-list-header">
        <h2>{t("publicGames")}</h2>
        <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
          {t("refresh")}
        </button>
      </div>

      {games.length === 0 ? (
        <p className="no-games">{loading ? t("loading") : t("noPublicGames")}</p>
      ) : (
        <ul className="games-rows">
          {games.map((game) => (
            <li key={game.id} className="game-row">
              <div>
                <span className="game-row-id">{game.id}</span>
                <span className="game-row-meta">
                  {game.owner} · {game.playerCount} {t("playersShort")}
                </span>
              </div>
              <button className="btn btn-primary" onClick={() => onJoinGame(game.id)} disabled={!canJoin}>
                {t("join")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default GameList
