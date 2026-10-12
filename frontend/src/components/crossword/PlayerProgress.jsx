"use client"
import { useLanguage } from "../../contexts/LanguageContext"
import ProgressGrid from "./ProgressGrid"
import "./PlayerProgress.css"

/**
 * Component displaying progress of other players in the game
 * Shows mini grids representing each player's completion status
 */
export default function PlayerProgress({ progressOtherPlayers, gridStructure }) {
  const { t } = useLanguage()

  return (
    <div className="player-progress">
      <h4 className="progress-title">{t("otherPlayersProgress")}</h4>
      <div className="progress-container">
        {Object.entries(progressOtherPlayers).map(([name, grid]) => (
          <ProgressGrid key={name} name={name} progress={grid} gridStructure={gridStructure} />
        ))}
        {Object.keys(progressOtherPlayers).length === 0 && <p className="no-players">{t("noOtherPlayers")}</p>}
      </div>
    </div>
  )
}
