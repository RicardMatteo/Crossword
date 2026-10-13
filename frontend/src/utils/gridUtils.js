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
 * Display data of a grid from the API: `cells` ("" for a letter cell, null for a
 * clue cell), clue numbers per clue cell, clue texts by "<number><direction>" and arrows
 */
export function buildGridView({ grid_structure, grid_def_order, placed_words }) {
  const cells = grid_structure.map((row) => row.split("").map((c) => (c === "-" ? "" : null)))
  const arrowMap = generateArrowMap(
    grid_structure.map((row) => row.split("").map(() => "")),
    placed_words,
  )

  const clueOrder = grid_structure.map((row) => row.split("").map(() => null))
  let clueIndex = 0
  grid_structure.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      if (line[col] === "/" || line[col] === "#") {
        clueOrder[row][col] = grid_def_order[clueIndex]
        clueIndex++
      }
    }
  })

  const definitionMap = {}
  placed_words.forEach((word) => {
    definitionMap[`${word.number}${word.direction}`] = word.clue
  })

  return { cells, arrowMap, clueOrder, definitionMap }
}
