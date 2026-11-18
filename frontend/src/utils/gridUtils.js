/**
 * Utility functions for crossword grid operations
 * Handles word bounds calculation, validation, and arrow map generation
 */

export function getWordBounds(inputGrid, row, col, dir) {
  let start = dir === "H" ? col : row
  let end = start

  while (start > 0 && (dir === "H" ? inputGrid[row][start - 1] : inputGrid[start - 1][col]) !== null) start--

  while (
    (dir === "H" ? inputGrid[row][end + 1] : inputGrid[end + 1]?.[col]) !== undefined &&
    (dir === "H" ? inputGrid[row][end + 1] : inputGrid[end + 1][col]) !== null
  )
    end++

  return { start, end }
}

export function isLongEnough(inputGrid, row, col, dir) {
  const { start, end } = getWordBounds(inputGrid, row, col, dir)
  return end - start > 0
}

export function generateArrowMap(arrowMapInit, placedWords) {
  const arrowMap = arrowMapInit
  placedWords.map((word) => {
    arrowMap[word.row][word.col] += word.direction
  })
  return arrowMap
}

/**
 * Clue cell defining a word: the one just before its first letter in its own
 * direction (left of an H word, above a V word), otherwise the other neighbour
 * (arrow turning: above an H word, left of a V word).
 */
function clueCellOf(word, isClue) {
  const { row, col, direction } = word
  const inLine = direction === "H" ? [row, col - 1] : [row - 1, col]
  const turning = direction === "H" ? [row - 1, col] : [row, col - 1]
  return isClue(...inLine) ? inLine : turning
}

/**
 * Display data of a grid from the API: `cells` ("" for a letter cell, null for a
 * clue cell), clue keys per clue cell (top first), clue texts by key and arrows.
 * Clues are placed from the words' positions: the word numbers are not reliable
 * (two neighbouring words may be numbered either way round).
 */
export function buildGridView({ grid_structure, placed_words }) {
  const cells = grid_structure.map((row) => row.split("").map((c) => (c === "-" ? "" : null)))
  const arrowMap = generateArrowMap(
    grid_structure.map((row) => row.split("").map(() => "")),
    placed_words,
  )
  const isClue = (r, c) => cells[r]?.[c] === null

  const clueOrder = grid_structure.map((row) => row.split("").map(() => null))
  const definitionMap = {}
  placed_words.forEach((word) => {
    const key = `${word.row},${word.col},${word.direction}`
    definitionMap[key] = word.clue
    const [r, c] = clueCellOf(word, isClue)
    if (!isClue(r, c)) return
    // Top half: the word starting to the right; bottom half: the word starting below
    const startsRight = word.row === r && word.col === c + 1
    const slots = (clueOrder[r][c] ??= [])
    if (startsRight) slots.unshift(key)
    else slots.push(key)
  })

  return { cells, arrowMap, clueOrder, definitionMap }
}
