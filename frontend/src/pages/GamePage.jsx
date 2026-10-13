"use client"

import React, { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { useLanguage } from "../contexts/LanguageContext"
import CrosswordGridDisplay from "../components/crossword/CrosswordGridDisplay"
import PlayerProgress from "../components/crossword/PlayerProgress"
import TeamProgress from "../components/crossword/TeamProgress"
import { getWordBounds, isLongEnough, generateArrowMap } from "../utils/gridUtils"
import { fetchGridData, submitWord } from "../utils/apiUtils"
import useWebSocket from "../hooks/useWebSocket"
import SEO from "../components/SEO"
import LoadingSpinner from "../components/ui/LoadingSpinner"
import "./GamePage.css"
import GameLobby from "../components/game/GameLobby"
import GameResults, { formatTime } from "../components/game/GameResults"

/**
 * Main game page component that handles crossword gameplay
 * Integrates grid display, player progress, WebSocket communication, and game logic
 */
export default function GamePage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { getCurrentPlayerName, setGuestName } = useAuth()
  const { t } = useLanguage()

  // Game state
  const [gridStructure, setGridStructure] = useState([])
  const [inputGrid, setInputGrid] = useState([])
  const [gridClueOrder, setGridClueOrder] = useState([])
  const inputRefs = useRef([])
  const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 })
  const [direction, setDirection] = useState("H")
  const [definitionMap, setDefinitionMap] = useState({})
  const [placedWords, setPlacedWords] = useState([])
  const [arrowMap, setArrowMap] = useState([[]])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Player state
  const [playerName, setPlayerName] = useState(getCurrentPlayerName())
  const [showNameInput, setShowNameInput] = useState(!getCurrentPlayerName())

  // WebSocket connection
  const {
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
  } = useWebSocket(
    roomId,
    showNameInput ? null : playerName, // only connect once the name is confirmed
  )

  // The server drives the phase: lobby -> playing (owner starts) -> finished (end rule met)
  const gamePhase = result ? "finished" : gameStarted ? "playing" : "lobby"
  const isCoop = gameRules?.mode === "coop"

  // Seconds left before the "delay" rule ends the game
  const [secondsLeft, setSecondsLeft] = useState(null)
  useEffect(() => {
    if (!endsAt) {
      setSecondsLeft(null)
      return
    }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt])

  // Load grid data on component mount
  useEffect(() => {
    const loadGrid = async () => {
      try {
        setLoading(true)
        setError(null)

        // wait for WebSocket to establish connection
        if (!token) {
          console.log("WebSocket token not available yet, waiting...")
          return
        }

        const data = await fetchGridData(roomId)

        if (!data || !data.grid_structure) {
          throw new Error("Invalid grid data received")
        }

        setGridStructure(data.grid_structure)

        // Initialize input grid
        const initialGrid = data.grid_structure.map((row) => row.split("").map((c) => (c === "-" ? "" : null)))

        // Initialize arrow map
        const arrowMapInit = data.grid_structure.map((row) => row.split("").map((_) => ""))

        // Apply existing progress if available
        if (progress) {
          initialGrid.forEach((rowArr, r) => {
            rowArr.forEach((cell, c) => {
              if (cell === null && progress[r]?.[c]) {
                initialGrid[r][c] = progress[r][c]
              }
            })
          })
        }

        setInputGrid(initialGrid)
        setPlacedWords(data.placed_words)
        setArrowMap(generateArrowMap(arrowMapInit, data.placed_words))

        // Initialize input refs
        inputRefs.current = initialGrid.map((row) => row.map(() => React.createRef()))

        // Setup clue grid
        const clueGrid = data.grid_structure.map((row) => row.split("").map(() => null))
        let clueIndex = 0
        for (let row = 0; row < data.grid_structure.length; row++) {
          const line = data.grid_structure[row]
          for (let col = 0; col < line.length; col++) {
            if (line[col] === "/" || line[col] === "#") {
              clueGrid[row][col] = data.grid_def_order[clueIndex]
              clueIndex++
            }
          }
        }
        setGridClueOrder(clueGrid)

        // Setup definition map
        const defMap = {}
        data.placed_words.forEach((word) => {
          const key = `${word.number}${word.direction}`
          defMap[key] = word.clue
        })
        setDefinitionMap(defMap)
      } catch (error) {
        console.error("Error loading grid data:", error)
        setError("Failed to load game data. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    if (roomId) {
      loadGrid()
    }
  }, [roomId, token, round])

  // Apply progress from WebSocket
  useEffect(() => {
    if (progress && gridStructure.length > 0) {
      setInputGrid((prevGrid) => {
        const newGrid = [...prevGrid]
        Object.keys(progress).forEach((r) => {
          Object.keys(progress[r]).forEach((c) => {
            if (prevGrid[r] && prevGrid[r][c] !== null && progress[r][c] !== null) {
              newGrid[r][c] = progress[r][c].toUpperCase()
              const ref = inputRefs.current[r][c]
              if (ref?.current) {
                ref.current.readOnly = true
                ref.current.value = newGrid[r][c]
                ref.current.style.color = "var(--success-color)"
              }
            }
          })
        })
        return newGrid
      })
    }
  }, [progress, gridStructure])

  // Hash word for validation
  async function hashWord(word) {
    const encoder = new TextEncoder()
    const data = encoder.encode(word.toUpperCase())
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  // Check completed words and submit if valid
  async function checkCompletedWords(row, col) {
    const directions = ["H", "V"]
    for (const dir of directions) {
      const { start, end } = getWordBounds(inputGrid, row, col, dir)
      let word = ""
      for (let i = start; i <= end; i++) {
        const r = dir === "H" ? row : i
        const c = dir === "H" ? i : col
        word += inputGrid[r][c] || ""
      }
      if (!word || word.includes(" ")) continue

      const hash = await hashWord(word)
      const match = placedWords.find(
        (p) =>
          p.hash === hash &&
          p.row === (dir === "H" ? row : start) &&
          p.col === (dir === "H" ? start : col) &&
          p.direction === dir,
      )

      if (match) {
        try {
          const result = await submitWord({
            row: match.row,
            col: match.col,
            direction: match.direction,
            guess: word,
            token: token,
            room_id: roomId,
            length: match.length,
          })

          if (result.valid) {
            freezeWord(match, word)
          }
        } catch (err) {
          console.error("Error submitting word:", err)
        }
      }
    }
  }

  // Freeze word when correctly guessed
  function freezeWord(wordData, word) {
    const { row, col, direction, length } = wordData

    for (let i = 0; i < length; i++) {
      const r = direction === "H" ? row : row + i
      const c = direction === "H" ? col + i : col

      const ref = inputRefs.current[r][c]
      if (ref?.current) {
        ref.current.readOnly = true
        ref.current.value = word[i].toUpperCase()
        ref.current.style.color = "var(--success-color)"
      }
      const copy = [...inputGrid]
      copy[r][c] = word[i].toUpperCase()
      setInputGrid(copy)
    }
  }

  // Update cell value
  const updateCell = (row, col, value) => {
    const ref = inputRefs.current[row][col]
    if (ref?.current?.readOnly) {
      return
    }
    if (value !== "" && !/^[a-zA-Z]$/.test(value)) return

    const upper = value.toUpperCase().slice(-1)
    const copy = [...inputGrid]
    copy[row][col] = upper

    setInputGrid(copy)
    checkCompletedWords(row, col)
    moveFocus(row, col, direction, value === "" || value === undefined)
  }

  // Move focus to next cell
  const moveFocus = (row, col, dir, backward = false) => {
    let nextRow = row
    let nextCol = col
    const increment = backward ? -1 : 1

    do {
      if (dir === "H") nextCol += increment
      else nextRow += increment
      if (inputRefs.current[nextRow]?.[nextCol]?.current === null) {
        break
      }
    } while (
      (inputRefs.current[nextRow]?.[nextCol]?.current === undefined ||
        inputRefs.current[nextRow]?.[nextCol]?.current.readOnly) &&
      nextRow >= 0 &&
      nextCol >= 0 &&
      nextRow < gridStructure.length &&
      nextCol < gridStructure[0].length
    )

    if (inputRefs.current[nextRow]?.[nextCol]?.current && inputGrid[nextRow][nextCol] !== null) {
      inputRefs.current[nextRow][nextCol].current.focus()
      setInValidDirection(row, col)
      setFocusedCell({ row: nextRow, col: nextCol })
    }
  }

  // Handle keyboard input
  const handleKeyDown = (e, row, col) => {
    let nextRow = row
    let nextCol = col

    if (e.key === "ArrowRight") {
      setDirection("H")
      do nextCol++
      while (inputGrid[row]?.[nextCol] === null)
    } else if (e.key === "ArrowLeft") {
      setDirection("H")
      do nextCol--
      while (inputGrid[row]?.[nextCol] === null && nextCol >= 0)
    } else if (e.key === "ArrowDown") {
      setDirection("V")
      do nextRow++
      while (inputGrid[nextRow]?.[col] === null)
    } else if (e.key === "ArrowUp") {
      setDirection("V")
      do nextRow--
      while (inputGrid[nextRow]?.[col] === null && nextRow >= 0)
    } else if (e.key === "Backspace") {
      updateCell(row, col, "")
      moveFocus(row, col, direction, true)
      if (direction === "H") {
        do nextCol--
        while (nextCol >= 0 && (inputGrid[row]?.[nextCol] === null || inputRefs.current[row][nextCol].current.readOnly))
      } else {
        do nextRow--
        while (nextRow >= 0 && (inputGrid[nextRow]?.[col] === null || inputRefs.current[nextRow][col].current.readOnly))
      }
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      updateCell(row, col, e.key)
      return
    } else {
      return
    }

    e.preventDefault()
    if (inputRefs.current[nextRow]?.[nextCol]?.current && inputGrid[nextRow][nextCol] !== null) {
      inputRefs.current[nextRow][nextCol].current.focus()
      setInValidDirection(nextRow, nextCol)
      setFocusedCell({ row: nextRow, col: nextCol })
    } else {
      setInValidDirection(row, col)
    }
  }

  // Check if cell is in focused word
  const isInFocusedWord = (r, c) => {
    const { row, col } = focusedCell
    if (direction === "H") {
      if (r !== row) return false
      const { start, end } = getWordBounds(inputGrid, row, col, "H")
      return c >= start && c <= end
    } else {
      if (c !== col) return false
      const { start, end } = getWordBounds(inputGrid, row, col, "V")
      return r >= start && r <= end
    }
  }

  // Handle cell focus
  const onFocus = (row, col) => {
    if (
      focusedCell.row === row &&
      focusedCell.col === col &&
      isLongEnough(inputGrid, row, col, direction === "H" ? "V" : "H")
    ) {
      setDirection(direction === "H" ? "V" : "H")
    }

    setInValidDirection(row, col)
    setFocusedCell({ row, col })
  }

  // Set valid direction
  const setInValidDirection = (row, col) => {
    if (!isLongEnough(inputGrid, row, col, direction)) {
      setDirection(direction === "H" ? "V" : "H")
    }
  }

  // Handle player name change
  const handlePlayerNameChange = (newName) => {
    setPlayerName(newName)
    setGuestName(newName)
    setShowNameInput(false)
  }

  const handleStartGame = () => {
    startGame()
  }

  const handleLeaveGame = () => {
    navigate("/")
  }

  const handlePlayAgain = () => {
    restartGame()
  }

  // Revealed grid once the game is over: solution letters, coloured by what this player found
  const revealedGrid = result && inputGrid.map((row, r) => row.map((cell, c) => (cell === null ? null : result.solution[r][c])))
  const cellStatus =
    result &&
    inputGrid.map((row, r) =>
      row.map((cell, c) => (cell === null ? null : result.found?.[r]?.[c] ? "found" : "missed")),
    )

  const iFinished = finishedPlayers.some((p) => p.name === playerName)
  const statusMessages = []
  if (gamePhase === "playing") {
    finishedPlayers
      .filter((p) => p.name !== playerName)
      .forEach((p) => statusMessages.push(t("playerFinished").replace("{name}", p.name).replace("{time}", formatTime(p.time))))
    if (iFinished) statusMessages.push(t("youFinished"))
    if (secondsLeft !== null) statusMessages.push(t("endsIn").replace("{s}", secondsLeft))
  }

  // Update the return statement to conditionally render based on gamePhase:
  if (joinError) {
    return (
      <div className="game-error">
        <h2>{joinError === "room_full" ? t("roomFull") : t("joinFailed")}</h2>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          {t("backToHome")}
        </button>
      </div>
    )
  }

  if (gamePhase === "lobby" && showNameInput) {
    return (
      <div className="game-page">
        <div className="name-input-container">
          <input
            className="form-input"
            placeholder={t("enterName")}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && playerName.trim() && handlePlayerNameChange(playerName.trim())}
            autoFocus
          />
          <button
            className="btn btn-primary"
            onClick={() => playerName.trim() && handlePlayerNameChange(playerName.trim())}
            disabled={!playerName.trim()}
          >
            OK
          </button>
        </div>
      </div>
    )
  }

  if (gamePhase === "lobby") {
    return (
      <GameLobby
        roomId={roomId}
        onStartGame={handleStartGame}
        onLeaveGame={handleLeaveGame}
        isOwner={isGameOwner}
        players={players}
        settings={settings}
        onChangeSettings={updateSettings}
      />
    )
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="game-error">
        <h2>Game Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          {t("backToHome")}
        </button>
      </div>
    )
  }

  return (
    <>
      <SEO
        title={`Crossword Game - Room ${roomId}`}
        description={`Play crossword puzzle in room ${roomId} with friends`}
        keywords="crossword, multiplayer, puzzle, game"
      />

      <div className="game-page">
        {gamePhase === "finished" && (
          <GameResults
            ranking={result.ranking}
            duration={result.duration}
            isCoop={isCoop}
            playerName={playerName}
            isOwner={isGameOwner}
            onPlayAgain={handlePlayAgain}
            onLeave={handleLeaveGame}
          />
        )}

        <div className="game-header">
          <div className="game-info">
            <h1 className="game-title">
              {t("roomLabel")} {roomId}
            </h1>
            <div className="player-info">
              {showNameInput ? (
                <div className="name-input-container">
                  <input
                    className="form-input"
                    placeholder={t("enterName")}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && playerName.trim() && handlePlayerNameChange(playerName.trim())
                    }
                    autoFocus
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => playerName.trim() && handlePlayerNameChange(playerName.trim())}
                    disabled={!playerName.trim()}
                  >
                    OK
                  </button>
                </div>
              ) : (
                <span className="current-player">
                  {t("playerLabel")} {playerName}
                </span>
              )}
            </div>
          </div>

          <div className="game-controls">
            <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(window.location.href)}>
              {t("shareRoom")}
            </button>
            <button className="btn btn-danger" onClick={() => navigate("/")}>
              {t("leaveGame")}
            </button>
          </div>
        </div>

        {gamePhase === "playing" && gameRules && (
          <div className="game-status">
            <span className="game-rule">
              {isCoop ? t("modeInfo_coop") : t(`endRuleInfo_${gameRules.endRule}`).replace("{s}", gameRules.endDelay)}
            </span>
            {statusMessages.map((message) => (
              <strong key={message}>{message}</strong>
            ))}
          </div>
        )}

        <div className="game-content">
          <div className="crossword-section">
            <CrosswordGridDisplay
              key={round} // fresh inputs each round (frozen letters are set on the DOM)
              gridStructure={inputGrid}
              inputGrid={revealedGrid || inputGrid}
              cellStatus={cellStatus}
              gridClueOrder={gridClueOrder}
              inputRefs={inputRefs}
              focusedCell={focusedCell}
              handleKeyDown={handleKeyDown}
              onFocus={onFocus}
              isInFocusedWord={isInFocusedWord}
              definitionMap={definitionMap}
              arrowMap={arrowMap}
            />
          </div>

          <div className="progress-section">
            {isCoop ? (
              <TeamProgress teamProgress={teamProgress} players={players} playerName={playerName} />
            ) : (
              <PlayerProgress progressOtherPlayers={progressOtherPlayers} gridStructure={gridStructure} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
