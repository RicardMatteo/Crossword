"use client"
import { useLanguage } from "../../contexts/LanguageContext"
import "./PlayerProgress.css"

/**
 * Coop side panel: completion of the shared grid and letters found by each teammate
 */
export default function TeamProgress({ teamProgress, players, playerName }) {
  const { t } = useLanguage()
  const percent = teamProgress?.percent ?? 0
  const contributions = teamProgress?.contributions ?? {}

  return (
    <div className="player-progress">
      <h4 className="progress-title">{t("teamProgress")}</h4>
      <div className="team-bar" aria-label={`${percent}%`}>
        <div className="team-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="team-percent">{percent}%</p>
      <ul className="team-list">
        {players.map(({ name }) => (
          <li key={name} className={name === playerName ? "is-me" : ""}>
            <span>{name}</span>
            <span>
              {contributions[name] ?? 0} {t("lettersShort")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
