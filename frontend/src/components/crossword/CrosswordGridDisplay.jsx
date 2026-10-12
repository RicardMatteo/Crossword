"use client"
import { useLayoutEffect, useRef } from "react"
import "./CrosswordGridDisplay.css"

const cellStyle = {
  width: "5rem",
  height: "5rem",
  border: "0.2px solid #1f1f1f",
  boxSizing: "border-box",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "clamp(1rem, 3vw, 2rem)", // Responsive font size
  fontFamily: "'Roboto Condensed', sans-serif",
  textAlign: "center",
}

const MAX_CLUE_FONT_PX = 14
const MIN_CLUE_FONT_PX = 6

/**
 * Clue text that shrinks its font until it fits its box without breaking words
 */
function FitText({ text }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let size = MAX_CLUE_FONT_PX
    el.style.fontSize = `${size}px`
    while (size > MIN_CLUE_FONT_PX && (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight)) {
      size -= 0.5
      el.style.fontSize = `${size}px`
    }
  }, [text])

  return (
    <div ref={ref} className="clue-text" title={text}>
      {/* block child: an overflowing word spills right, where scrollWidth sees it */}
      <span>{text}</span>
    </div>
  )
}

/**
 * Clue cell component that displays crossword clues
 * Handles single and double clue display with proper formatting
 */
function ClueCell({ clues, definitionMap }) {
  const isDouble = clues?.length === 2

  // Helper to get definition, trying V/H swap if not found
  function getDefinition(clue) {
    const clueStr = clue?.toString()
    if (!clueStr) return ""
    if (definitionMap[clueStr]) return definitionMap[clueStr]
    // Try swapping last char V<->H
    const swapped = clueStr.endsWith("V") ? clueStr.slice(0, -1) + "H" : clueStr.slice(0, -1) + "V"
    return definitionMap[swapped] || `Not Found, ${clue}`
  }

  return (
    <div
      lang="fr"
      className="clue-cell"
      style={{
        ...cellStyle, // Use the same cellStyle as InputCell
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-primary)",
        border: "0.2px solid var(--border-color)",
      }}
    >
      {clues?.length === 1 && <FitText text={getDefinition(clues[0])} />}
      {isDouble && (
        <>
          <FitText text={getDefinition(clues[0])} />
          <hr className="clue-separator" />
          <FitText text={getDefinition(clues[1])} />
        </>
      )}
    </div>
  )
}

/**
 * Input cell component for crossword letters
 * Handles user input, focus states, and directional arrows
 */
function InputCell({ cell, rowIndex, colIndex, inputRefs, handleKeyDown, onFocus, isInWord, isFocused, arrow }) {
  return (
    <div className="cell-container">
      <input
        key={colIndex}
        type="text"
        maxLength={1}
        value={cell || ""}
        ref={inputRefs.current[rowIndex][colIndex]}
        onChange={(e) => {
          if (navigator.userAgent.toLowerCase().includes("mobile")) {
            const syntheticEvent = { ...e, key: e.target.value.slice(-1) }
            handleKeyDown(syntheticEvent, rowIndex, colIndex)
          }
        }}
        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
        onClick={() => onFocus(rowIndex, colIndex)}
        style={{
          ...cellStyle,
          padding: 0,
          backgroundColor: isInWord
            ? isFocused
              ? "var(--accent-primary)"
              : "var(--accent-secondary)"
            : "var(--bg-primary)",
          caretColor: "transparent",
          outline: "none",
          gridArea: "1/1",
          color: "var(--text-primary)",
          border: "0.2px solid var(--border-color)",
          opacity: isInWord ? (isFocused ? 1 : 0.8) : 1,
        }}
      />

      {arrow.includes("V") && <div className="down-triangle" />}
      {arrow.includes("H") && <div className="right-triangle" />}
    </div>
  )
}

/**
 * Main crossword grid display component
 * Renders the complete crossword grid with input cells and clue cells
 */
export default function CrosswordGridDisplay({
  gridStructure,
  inputGrid,
  gridClueOrder,
  inputRefs,
  focusedCell,
  handleKeyDown,
  onFocus,
  isInFocusedWord,
  definitionMap,
  arrowMap,
}) {
  return (
    <div lang="fr" className="crossword-grid">
      {gridStructure.map((row, rowIndex) => (
        <div key={rowIndex} className="crossword-row">
          {row.map((cell, colIndex) => {
            const isFocused = focusedCell.row === rowIndex && focusedCell.col === colIndex
            const isInWord = isInFocusedWord(rowIndex, colIndex)

            if (cell !== null) {
              return (
                <InputCell
                  key={colIndex}
                  cell={inputGrid[rowIndex][colIndex]}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  inputRefs={inputRefs}
                  handleKeyDown={handleKeyDown}
                  onFocus={onFocus}
                  isInWord={isInWord}
                  isFocused={isFocused}
                  arrow={arrowMap[rowIndex][colIndex]}
                />
              )
            } else {
              const clues = gridClueOrder[rowIndex]?.[colIndex]
              return <ClueCell key={colIndex} clues={clues} definitionMap={definitionMap} />
            }
          })}
        </div>
      ))}
    </div>
  )
}
