"use client"

/**
 * Custom hook for WebSocket connection management
 * Handles real-time multiplayer communication for crossword games
 */

import { useState, useEffect, useRef } from "react"

const useWebSocket = (roomId, playerName) => {
  const [token, setToken] = useState(localStorage.getItem(`token-${roomId}`) || null)
  const wsRef = useRef(null)
  const reconnectRef = useRef({ attempts: 0, timeoutId: null })
  const [progressOtherPlayers, setProgressOtherPlayers] = useState({})
  const [progress, setProgress] = useState({})
  const [isGameOwner, setIsGameOwner] = useState(false)
  const [players, setPlayers] = useState([])
  const [gameStarted, setGameStarted] = useState(false)
  // { mode, endRule, endDelay } announced by the server when the game starts
  const [gameRules, setGameRules] = useState(null)
  // [{ name, time }] in finishing order
  const [finishedPlayers, setFinishedPlayers] = useState([])
  // Timestamp (ms) at which the "delay" rule ends the game
  const [endsAt, setEndsAt] = useState(null)
  // { ranking, solution, found, duration } once the game is over
  const [result, setResult] = useState(null)
  // Lobby settings shared by the server: { mode, endRule, endDelay, isPublic, maxPlayers }
  const [settings, setSettings] = useState(null)
  // Set when the server refuses us (e.g. "room_full"): no reconnection then
  const [joinError, setJoinError] = useState(null)
  // Coop only: { percent, contributions: { name: letters } } of the shared grid
  const [teamProgress, setTeamProgress] = useState(null)
  // Incremented on each new round so the page reloads the grid
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (!playerName || !roomId) {
      console.log("playerName ou roomId manquant, WebSocket non ouverte")
      return
    }

    let stopped = false

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}`

    function connect() {
      if (stopped) return
      if (wsRef.current) return
      console.log("Connexion WebSocket à :", wsUrl)
      const socket = new WebSocket(wsUrl)
      wsRef.current = socket

      socket.onopen = () => {
        console.log("WebSocket ouverte")
        reconnectRef.current.attempts = 0
        // read the token at send time: the closure value is stale after the first join
        const savedToken = localStorage.getItem(`token-${roomId}`)
        socket.send(JSON.stringify({ type: "join", name: playerName, token: savedToken }))
        // ask server to send current players list to avoid missed broadcasts
        socket.send(JSON.stringify({ type: "request_players" }))
      }

      socket.onerror = (error) => {
        console.error("WebSocket error:", error)
      }

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          console.log("WebSocket message received:", msg.type)

          if (msg.type === "token") {
            localStorage.setItem(`token-${msg.room_id}`, msg.token)
            console.log("Token reçu et stocké:", msg.token, msg.room_id)
            setToken(msg.token)
          } else if (msg.type === "self_progress") {
            console.log("Ancienne progression retrouvé :", msg.progress)
            setProgress(msg.progress)
          } else if (msg.type === "settings") {
            const { type, ...rest } = msg
            setSettings(rest)
          } else if (msg.type === "team_progress") {
            // Coop: the shared grid's found letters, applied like our own progress
            setProgress(msg.progress)
            setTeamProgress({ percent: msg.percent, contributions: msg.contributions })
          } else if (msg.type === "player_progress") {
            console.log("Progression du joueur reçue:", msg.from, msg.progress)
            setProgressOtherPlayers((prev) => ({
              ...prev,
              [msg.from]: msg.progress,
            }))
          } else if (msg.type === "player_disconnected") {
            setProgressOtherPlayers((prev) => {
              const newProgress = { ...prev }
              delete newProgress[msg.from]
              return newProgress
            })
          } else if (msg.type === "game_finished") {
            setResult({ ranking: msg.ranking, solution: msg.solution, found: msg.found, duration: msg.duration })
            setEndsAt(null)
          } else if (msg.type === "game_started") {
            setGameStarted(true)
            setGameRules({ mode: msg.mode, endRule: msg.endRule, endDelay: msg.endDelay })
            setFinishedPlayers(msg.finished || [])
          } else if (msg.type === "player_finished") {
            setFinishedPlayers((prev) =>
              prev.some((p) => p.name === msg.name) ? prev : [...prev, { name: msg.name, time: msg.time }],
            )
          } else if (msg.type === "end_countdown") {
            setEndsAt(Date.now() + msg.seconds * 1000)
          } else if (msg.type === "game_reset") {
            setGameStarted(false)
            setGameRules(null)
            setFinishedPlayers([])
            setEndsAt(null)
            setResult(null)
            setTeamProgress(null)
            setProgress({})
            setProgressOtherPlayers((prev) => Object.fromEntries(Object.keys(prev).map((k) => [k, {}])))
            setRound((r) => r + 1)
          } else if (msg.type === "players") {
            console.log("Players list received:", msg.players)
            setPlayers(msg.players)
            setIsGameOwner(msg.players.some((p) => p.isOwner && p.name === playerName))
            // Ensure progressOtherPlayers has an entry for each other player (even if empty)
            const names = msg.players.map((p) => p.name).filter((n) => n !== playerName)
            setProgressOtherPlayers((prev) => {
              const newProg = { ...prev }
              names.forEach((n) => {
                if (!(n in newProg)) newProg[n] = {}
              })
              // remove entries for players no longer present
              Object.keys(newProg).forEach((k) => {
                if (!names.includes(k)) delete newProg[k]
              })
              return newProg
            })
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err)
        }
      }

      socket.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason)
        wsRef.current = null
        if (stopped) return
        if (event.code === 4000) {
          setJoinError(event.reason || "error")
          return
        }
        // exponential backoff reconnect
        reconnectRef.current.attempts += 1
        const wait = Math.min(30000, 1000 * 2 ** reconnectRef.current.attempts)
        console.warn(`WebSocket closed unexpectedly, reconnecting in ${wait}ms (attempt ${reconnectRef.current.attempts})`)
        reconnectRef.current.timeoutId = setTimeout(() => {
          reconnectRef.current.timeoutId = null
          connect()
        }, wait)
      }
    }

    connect()

    // Periodically request players list in case broadcasts are missed
    const playersInterval = setInterval(() => {
      try {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "request_players" }))
        }
      } catch (e) {
        /* ignore */
      }
    }, 15000)

    return () => {
      stopped = true
      clearInterval(playersInterval)
      if (reconnectRef.current.timeoutId) clearTimeout(reconnectRef.current.timeoutId)
      // Close even while still CONNECTING: otherwise the socket survives the cleanup
      // (React StrictMode mounts effects twice) and joins the room as a ghost player
      if (wsRef.current) {
        console.log("Cleaning up WebSocket connection")
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.close(1000, "Cleaning up")
      }
      wsRef.current = null
    }
  }, [roomId, playerName])

  const send = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }

  // Owner only: the server validates, stores and broadcasts the new settings
  const updateSettings = (changes) => send({ type: "update_settings", settings: changes })
  const startGame = () => send({ type: "start_game" })
  const restartGame = () => send({ type: "restart_game" })

  return {
    token,
    progressOtherPlayers,
    progress,
    isGameOwner,
    players,
    gameStarted,
    gameRules,
    finishedPlayers,
    endsAt,
    result,
    teamProgress,
    settings,
    joinError,
    round,
    updateSettings,
    startGame,
    restartGame,
  }
}

export default useWebSocket
