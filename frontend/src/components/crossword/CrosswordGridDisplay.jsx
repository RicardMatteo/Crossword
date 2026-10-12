"use client"
import "./CrosswordGridDisplay.css"
// No external hyphenation package here (keeps frontend install/build stable).
// We use a small, safe fallback hyphenation that inserts soft-hyphens
// at reasonable positions if a proper hyphenation library isn't available.

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
    // decode HTML entities (in case backend sent &eacute; or similar)
    function decodeHtmlEntities(input) {
      if (!input || typeof input !== "string") return input
      try {
        const txt = document.createElement("textarea")
        txt.innerHTML = input
        return txt.value
      } catch (e) {
        return input
      }
    }

    // Simple fallback hyphenation: insert soft-hyphens at sensible breakpoints.
    // This is not linguistically perfect but prevents overflow and keeps builds
    // simple (no extra npm packages required).
    function hyphenateFallback(s) {
      if (!s || typeof s !== "string") return s
      // If shorter than 12 chars, no need to hyphenate
      const chunk = 12
      if (s.length <= chunk) return s

      // Try to break at common separators (spaces, punctuation) first
      // Otherwise insert soft-hyphens every `chunk` characters inside long words.
      return s.replace(/(\S{12,})/gu, (word) => {
        // prefer breaking on hyphen-like chars (dash, slash), preserve them
        if (/[-\/]/.test(word)) {
          return word.replace(/([\-\/])/g, "$1")
        }
        // insert soft hyphens every `chunk` chars inside the long segment
        return word.replace(new RegExp(`(.{1,${chunk}})`, "gu"), "$1\u00AD").replace(/\u00AD$/, "")
      })
    }

  if (definitionMap[clueStr]) return hyphenateFallback(decodeHtmlEntities(definitionMap[clueStr]))
    // Try swapping last char V<->H
    if (clueStr.endsWith("V")) {
      const swapped = clueStr.slice(0, -1) + "H"
  return hyphenateFallback(decodeHtmlEntities(definitionMap[swapped])) || `Not Found, ${clue}`
    }
    if (clueStr.endsWith("H")) {
      const swapped = clueStr.slice(0, -1) + "V"
  return hyphenateFallback(decodeHtmlEntities(definitionMap[swapped])) || `Not Found, ${clue}`
    }
    return `Not Found, ${clue}`
  }

  return (
    <div
      lang="fr"
      style={{
        ...cellStyle, // Use the same cellStyle as InputCell
        backgroundColor: "var(--bg-secondary)",
        padding: "4px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        overflow: "hidden",
        fontSize: "clamp(0.6rem, 2vw, 1rem)",
        lineHeight: 1.2,
        wordBreak: "break-word",
        hyphens: "auto",
        whiteSpace: "normal",
        color: "var(--text-primary)",
        border: "0.2px solid var(--border-color)",
      }}
    >
      {clues?.length === 1 && (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px",
          }}
        >
          <div className="clue-text" title={getDefinition(clues[0])}>
            {getDefinition(clues[0])}
          </div>
        </div>
      )}
      {isDouble && (
        <>
          <div
            style={{
              flex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1px",
              fontSize: "clamp(0.5rem, 1.5vw, 0.8rem)",
            }}
          >
            <div className="clue-text" title={getDefinition(clues[0])}>
              {getDefinition(clues[0])}
            </div>
          </div>
          <hr style={{ width: "90%", margin: "1px 0", border: "0.5px solid var(--border-color)" }} />
          <div
            style={{
              flex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1px",
              fontSize: "clamp(0.5rem, 1.5vw, 0.8rem)",
            }}
          >
            <div className="clue-text" title={getDefinition(clues[1])}>
              {getDefinition(clues[1])}
            </div>
          </div>
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
