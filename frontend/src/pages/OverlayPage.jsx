"use client"

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { useLanguage } from "../contexts/LanguageContext"
import CrosswordGridDisplay from "../components/crossword/CrosswordGridDisplay"
import TwitchStatus from "../components/game/TwitchStatus"
import { formatTime } from "../components/game/GameResults"
import { buildGridView } from "../utils/gridUtils"
import "./OverlayPage.css"

const LEADERBOARD_SWITCH_MS = 10000
const HINT_COUNTDOWN_FROM = 30 // show the countdown to the next revealed letter below this many seconds
const HIGHLIGHT_MS = 3000 // how long a word just found stays highlighted

/** Words found in the last few seconds (ids from the server), to highlight them on stream */
function useJustFound(recent, now) {
  const seen = useRef(null) // id -> time it was first received
  if (!recent) return []
  if (!seen.current) {
    // Page (re)loaded: the words already found are not news
    seen.current = new Map(recent.map((entry) => [entry.id, 0]))
  }
  const fresh = []
  const ids = new Set(recent.map((entry) => entry.id))
  for (const id of seen.current.keys()) if (!ids.has(id)) seen.current.delete(id)
  for (const entry of recent) {
    if (!seen.current.has(entry.id)) seen.current.set(entry.id, Date.now())
    if (now - seen.current.get(entry.id) < HIGHLIGHT_MS) fresh.push(entry)
  }
  return fresh
}

/** Live state of the channel's chat-only game, reconnecting forever (OBS sources stay open for hours) */
function useOverlayState(channel, restart) {
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let socket = null
    let stopped = false
    let attempts = 0
    let retryId = null
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const query = restart ? `?restart=${encodeURIComponent(restart)}` : ""
    const url = `${protocol}//${window.location.host}/ws/overlay/${encodeURIComponent(channel)}${query}`

    const connect = () => {
      socket = new WebSocket(url)
      socket.onopen = () => (attempts = 0)
      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === "overlay") setState({ ...msg, receivedAt: Date.now() })
      }
      socket.onclose = (event) => {
        if (stopped) return
        if (event.code === 4000) {
          setError(event.reason)
          return
        }
        attempts += 1
        retryId = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempts))
      }
    }
    connect()

    return () => {
      stopped = true
      clearTimeout(retryId)
      if (socket) {
        socket.onclose = null
        socket.close()
      }
    }
  }, [channel, restart])

  return { state, error }
}

/** Current time, refreshed every half second for the countdowns */
function useNow() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])
  return now
}

/**
 * Stream overlay / waiting screen: the channel's chat fills grid after grid.
 * Options: ?restart=<seconds before the next grid>, ?bg=transparent, ?theme=dark|light
 */
export default function OverlayPage() {
  const { channel } = useParams()
  const [params] = useSearchParams()
  const { t } = useLanguage()
  const { state, error } = useOverlayState(channel, params.get("restart"))
  const now = useNow()
  const justFound = useJustFound(state?.recent, now)
  const transparent = params.get("bg") === "transparent"
  const theme = params.get("theme")

  // Let OBS see through the page around the panels
  useEffect(() => {
    if (!transparent) return
    const previous = document.body.style.background
    document.body.style.background = "transparent"
    return () => {
      document.body.style.background = previous
    }
  }, [transparent])

  // Alternate between this grid's best viewers and the channel's all-time ones
  const [showAllTime, setShowAllTime] = useState(false)
  useEffect(() => {
    const id = setInterval(() => setShowAllTime((v) => !v), LEADERBOARD_SWITCH_MS)
    return () => clearInterval(id)
  }, [])

  // The grid only changes with the round (every state message carries it)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => state && buildGridView(state.grid), [state?.round])

  if (error) {
    return <div className="overlay overlay-message">{t("overlayInvalidChannel")}</div>
  }
  if (!state || !view) {
    return <div className="overlay overlay-message">{t("twitchStatus_connecting")}</div>
  }

  const secondsSince = (now - state.receivedAt) / 1000
  const countdown = (seconds) => (seconds == null ? null : Math.max(0, Math.ceil(seconds - secondsSince)))
  const hintIn = countdown(state.nextHintIn)
  const restartIn = countdown(state.restartIn)
  const finished = state.status === "finished"
  const top = showAllTime && state.topAllTime.length ? state.topAllTime : state.topGame

  return (
    <div className={`overlay ${transparent ? "is-transparent" : ""}`} data-theme={theme || undefined}>
      <OverlayGrid key={state.round} view={view} state={state} justFound={justFound} />

      <aside className="overlay-side">
        <header className="overlay-panel overlay-header">
          <span className="overlay-channel">📺 twitch.tv/{state.channel}</span>
          <TwitchStatus status={state.chatStatus} />
        </header>

        <div className="overlay-panel overlay-cta">
          {finished ? (
            <>
              <strong>{t("overlayGridDone").replace("{time}", formatTime(state.duration))}</strong>
              <span className="overlay-next">{t("overlayNextGrid").replace("{s}", restartIn)}</span>
            </>
          ) : justFound[0] ? (
            // The word just found replaces the call to play for a few seconds
            <div className="overlay-just-found" key={justFound[0].id}>
              <span>
                ✨ <strong>{justFound[0].viewer}</strong> {t("overlayFoundWord")}
              </span>
              <span className="overlay-just-found-word">{justFound[0].word}</span>
            </div>
          ) : (
            <>
              <strong>{t("overlayCta")}</strong>
              <span>{t("overlayRule")}</span>
            </>
          )}
        </div>

        <div className="overlay-panel">
          <div className="overlay-bar">
            <div className="overlay-bar-fill" style={{ width: `${state.percent}%` }} />
          </div>
          <div className="overlay-progress-text">
            <span>{state.percent}%</span>
            <span>
              {state.wordsFound}/{state.totalWords} {t("overlayFound")}
            </span>
          </div>
          {!finished && hintIn !== null && hintIn <= HINT_COUNTDOWN_FROM && (
            <p className="overlay-hint">💡 {t("overlayHintIn").replace("{s}", hintIn)}</p>
          )}
        </div>

        <section className="overlay-panel">
          <h2>{t("twitchFeed")}</h2>
          {state.feed.length ? (
            <ul className="overlay-list">
              {state.feed.map((entry, i) =>
                entry.hint ? (
                  <li key={i} className="overlay-feed-hint">
                    <span>💡 {t("overlayHint")}</span>
                    {entry.count > 1 && <span className="overlay-hint-count">×{entry.count}</span>}
                  </li>
                ) : (
                  <li key={i}>
                    <span>{entry.viewer}</span>
                    <span className="overlay-word">{entry.word}</span>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="overlay-empty">{t("twitchWaitingWords")}</p>
          )}
        </section>

        <section className="overlay-panel overlay-top">
          <h2>{top === state.topAllTime ? t("overlayTopAllTime") : t("overlayTopGame")}</h2>
          {top.length ? (
            <ol className="overlay-list">
              {top.map(({ name, letters, words }) => (
                <li key={name}>
                  <span>{name}</span>
                  <span className="overlay-score">
                    {letters} {t(letters > 1 ? "lettersShort" : "letterShort")}
                    <small>
                      {words} {t(words > 1 ? "wordsShort" : "wordShort")}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="overlay-empty">{t("overlayNoScores")}</p>
          )}
        </section>
      </aside>
    </div>
  )
}

/** Read-only grid scaled to fit the space left by the side panel */
function OverlayGrid({ view, state, justFound }) {
  const areaRef = useRef(null)
  const [width, setWidth] = useState(0)
  const rows = view.cells.length
  const cols = view.cells[0]?.length || 1

  useLayoutEffect(() => {
    const area = areaRef.current
    const resize = () => setWidth(Math.min(area.clientWidth, (area.clientHeight * cols) / rows))
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(area)
    return () => observer.disconnect()
  }, [rows, cols])

  const inputRefs = useRef(null)
  if (!inputRefs.current) inputRefs.current = view.cells.map((row) => row.map(() => React.createRef()))

  const revealed = new Set(state.revealed.map(([r, c]) => `${r},${c}`))
  const flashing = new Set(justFound.flatMap((entry) => entry.cells.map(([r, c]) => `${r},${c}`)))
  const cellStatus = state.letters.map((row, r) =>
    row.map((cell, c) => {
      if (cell === null) return null
      if (flashing.has(`${r},${c}`)) return "just-found"
      return revealed.has(`${r},${c}`) ? "revealed" : cell ? "found" : "empty"
    }),
  )

  return (
    <div className="overlay-grid-area" ref={areaRef}>
      <div className="overlay-grid" style={{ width }}>

        <CrosswordGridDisplay
          gridStructure={view.cells}
          inputGrid={state.letters}
          cellStatus={cellStatus}
          gridClueOrder={view.clueOrder}
          inputRefs={inputRefs}
          focusedCell={{ row: -1, col: -1 }}
          handleKeyDown={() => {}}
          onFocus={() => {}}
          isInFocusedWord={() => false}
          definitionMap={view.definitionMap}
          arrowMap={view.arrowMap}
        />
      </div>
    </div>
  )
}
