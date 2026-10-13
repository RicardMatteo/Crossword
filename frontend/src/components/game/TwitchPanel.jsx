"use client"
import { useLanguage } from "../../contexts/LanguageContext"
import TwitchStatus from "./TwitchStatus"
import "./Twitch.css"

/**
 * Twitch plays side panel: chat connection, last words found by viewers and best viewers
 */
export default function TwitchPanel({ twitch }) {
  const { t } = useLanguage()

  return (
    <div className="player-progress twitch-panel">
      <div className="twitch-panel-header">
        <span className="twitch-channel">📺 twitch.tv/{twitch.channel}</span>
        <TwitchStatus status={twitch.status} />
      </div>

      <h5>{t("twitchFeed")}</h5>
      {twitch.feed?.length ? (
        <ul className="twitch-list">
          {twitch.feed.map(({ viewer, word }, i) => (
            <li key={`${i}-${viewer}-${word}`}>
              <span>{viewer}</span>
              <span className="twitch-word">{word}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="twitch-empty">{t("twitchWaitingWords")}</p>
      )}

      {twitch.top?.length > 0 && (
        <>
          <h5>{t("twitchTopViewers")}</h5>
          <ol className="twitch-list">
            {twitch.top.map(({ name, words }) => (
              <li key={name}>
                <span>{name}</span>
                <span>
                  {words} {t(words > 1 ? "wordsShort" : "wordShort")}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
