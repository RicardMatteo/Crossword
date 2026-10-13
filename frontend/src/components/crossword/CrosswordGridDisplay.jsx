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
// Below this share of the cell width, splitting a word over two lines reads better
const READABLE_FONT_RATIO = 0.13
const MIN_READABLE_FONT_PX = 10

const VOWELS = "aeiouyàâäéèêëîïôöùûüœæ"
// Consonant pairs that start a French syllable together (ta-ble, ca-cher)
const ONSETS = new Set(["bl", "br", "ch", "cl", "cr", "dr", "fl", "fr", "gl", "gn", "gr", "ph", "pl", "pr", "th", "tr", "vr"])
const isVowel = (ch) => VOWELS.includes(ch.toLowerCase())
const isLetter = (ch) => ch.toLowerCase() !== ch.toUpperCase()

/** Adds soft hyphens between French syllables (rough rules, good enough for clues) */
function hyphenate(text) {
  return text.replace(/\p{L}{6,}/gu, (word) => {
    let out = ""
    let last = 0
    for (let i = 2; i < word.length - 2; i++) {
      const [a, b, c] = [word[i - 1], word[i], word[i + 1]]
      if (!isLetter(a) || !isLetter(b)) continue
      const onset = (x, y) => ONSETS.has((x + y).toLowerCase())
      // vowel | consonant (or onset) + vowel: em-pe-reur, é-loi-gnés
      const vcv = isVowel(a) && !isVowel(b) && (isVowel(c) || (onset(b, c) && isVowel(word[i + 2] || "")))
      // consonant | consonant + vowel, unless they form an onset: in-ter, tech-ni
      const cc = !isVowel(a) && !isVowel(b) && isVowel(c) && !onset(a, b) && [...word.slice(last, i)].some(isVowel)
      if ((vcv || cc) && i - last >= 2) {
        out += word.slice(last, i) + "\u00ad"
        last = i
      }
    }
    return out + word.slice(last)
  })
}

/**
 * Clue text that shrinks its font until it fits its box. Whole words are kept
 * while the text stays readable; past that, long words are split across lines.
 */
function FitText({ text, share }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const overflows = () => el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
    const shrink = (from, to) => {
      let size = from
      el.style.fontSize = `${size}px`
      while (size > to && overflows()) {
        size -= 0.5
        el.style.fontSize = `${size}px`
      }
    }
    // React's text node: swapped for its hyphenated version when words must be split
    const textNode = el.firstChild.firstChild
    const fit = () => {
      const cellWidth = el.clientWidth
      const max = Math.max(MAX_CLUE_FONT_PX, cellWidth * 0.17)
      const readable = Math.max(MIN_READABLE_FONT_PX, cellWidth * READABLE_FONT_RATIO)
      el.classList.remove("is-broken")
      if (textNode) textNode.nodeValue = text
      shrink(max, readable)
      if (overflows()) {
        el.classList.add("is-broken")
        if (textNode) textNode.nodeValue = hyphenate(text)
        shrink(max, MIN_CLUE_FONT_PX)
      }
    }
    fit()
    // Refit when the cell is resized (window resize, grid scaled to its container)
    let lastSize = `${el.clientWidth}x${el.clientHeight}`
    const observer = new ResizeObserver(() => {
      const size = `${el.clientWidth}x${el.clientHeight}`
      if (size !== lastSize) {
        lastSize = size
        fit()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [text])

  return (
    <div ref={ref} className="clue-text" title={text} style={share ? { flexGrow: share } : undefined}>
      {/* block child: an overflowing word spills right, where scrollWidth sees it */}
      <span>{text}</span>
    </div>
  )
}

// Damped so a short clue still keeps enough room for one readable line
const clueShare = (text) => text.length + 12

/**
 * Clue cell component that displays crossword clues
 * Handles single and double clue display with proper formatting
 */
function ClueCell({ clues, definitionMap }) {
  const isDouble = clues?.length === 2

  const getDefinition = (key) => definitionMap[key] ?? ""

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
          {/* the longer clue of the two gets more of the cell's height */}
          <FitText text={getDefinition(clues[0])} share={clueShare(getDefinition(clues[0]))} />
          <hr className="clue-separator" />
          <FitText text={getDefinition(clues[1])} share={clueShare(getDefinition(clues[1]))} />
        </>
      )}
    </div>
  )
}

/**
 * Input cell component for crossword letters
 * Handles user input, focus states, and directional arrows
 */
const statusColors = { found: "var(--success-color)", missed: "var(--danger-color)", revealed: "var(--warning-color)" }

function InputCell({ cell, rowIndex, colIndex, inputRefs, handleKeyDown, onFocus, isInWord, isFocused, arrow, status }) {
  return (
    <div className="cell-container">
      <input
        key={colIndex}
        type="text"
        maxLength={1}
        value={cell || ""}
        readOnly={status !== undefined}
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
          color: statusColors[status] || "var(--text-primary)",
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
  cellStatus, // optional grid of "found" / "missed" / "revealed" / "empty": shows a read-only grid
}) {
  return (
    <div lang="fr" className="crossword-grid" style={{ "--cols": gridStructure[0]?.length || 1 }}>
      {gridStructure.map((row, rowIndex) => (
        <div key={rowIndex} className="crossword-row">
          {row.map((cell, colIndex) => {
            const isFocused = focusedCell.row === rowIndex && focusedCell.col === colIndex
            const isInWord = !cellStatus && isInFocusedWord(rowIndex, colIndex)

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
                  status={cellStatus?.[rowIndex]?.[colIndex] ?? undefined}
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
