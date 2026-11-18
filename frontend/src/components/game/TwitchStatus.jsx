"use client"
import { useLanguage } from "../../contexts/LanguageContext"
import "./Twitch.css"

/** "● Chat connecté" style indicator of the linked channel's chat connection */
export default function TwitchStatus({ status }) {
  const { t } = useLanguage()
  if (!status) return null
  return <span className={`twitch-status twitch-status-${status}`}>● {t(`twitchStatus_${status}`)}</span>
}
