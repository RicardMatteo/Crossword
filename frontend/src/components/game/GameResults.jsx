"use client"

import { useLanguage } from "../../contexts/LanguageContext"
import "./GameResults.css"

export const formatTime = (seconds) => {
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/**
 * End-of-game ranking, shown above the revealed solution grid
 */
const GameResults = ({ ranking, duration, isCoop, playerName, isOwner, onPlayAgain, onLeave, twitchViewers }) => {
  const { t } = useLanguage()
  const winner = ranking[0]

  return (
    <section className="game-results">
      <h2>{t("gameFinished")}</h2>
      {isCoop ? (
        <p className="results-winner">{t("teamFinished").replace("{time}", formatTime(duration))}</p>
      ) : (
        winner && (
          <p className="results-winner">
            {winner.name === playerName ? t("youWin") : t("winnerIs").replace("{name}", winner.name)}
          </p>
        )
      )}

      <table className="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>{t("player")}</th>
            {!isCoop && <th>{t("time")}</th>}
            <th>{isCoop ? t("contribution") : t("completion")}</th>
            <th>{t("words")}</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((row, index) => (
            <tr key={row.name} className={row.name === playerName ? "is-me" : ""}>
              <td>{index + 1}</td>
              <td>{row.name}</td>
              {!isCoop && <td>{row.finished ? formatTime(row.time) : t("notFinished")}</td>}
              <td>{row.percent}%</td>
              <td>
                {row.wordsFound}/{row.totalWords}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {twitchViewers?.length > 0 && (
        <div className="results-twitch">
          <h3>{t("twitchTopViewers")}</h3>
          <ol>
            {twitchViewers.map(({ name, letters, words }) => (
              <li key={name}>
                {name} — {letters} {t(letters > 1 ? "lettersShort" : "letterShort")} ({words}{" "}
                {t(words > 1 ? "wordsShort" : "wordShort")})
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="results-actions">
        {isOwner ? (
          <button className="btn btn-primary" onClick={onPlayAgain}>
            {t("playAgain")}
          </button>
        ) : (
          <span className="results-waiting">{t("waitingForOwnerRestart")}</span>
        )}
        <button className="btn btn-secondary" onClick={onLeave}>
          {t("backToHome")}
        </button>
      </div>

      <p className="results-legend">{t("solutionLegend")}</p>
    </section>
  )
}

export default GameResults
