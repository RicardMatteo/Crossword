export function getWordBounds(inputGrid, row, col, dir) {
    let start = dir === 'H' ? col : row;
    let end = start;

    while (
        start > 0 &&
        (dir === 'H' ? inputGrid[row][start - 1] : inputGrid[start - 1][col]) !== null
    ) start--;

    while (
        (dir === 'H' ? inputGrid[row][end + 1] : inputGrid[end + 1]?.[col]) !== undefined &&
        (dir === 'H' ? inputGrid[row][end + 1] : inputGrid[end + 1][col]) !== null
    ) end++;

    return { start, end };
}

export function isLongEnough(inputGrid, row, col, dir) {
    const { start, end } = getWordBounds(inputGrid, row, col, dir);
    return end - start > 0;
}

export function generateArrowMap(arrowMapInit,placedWords){
    const arrowMap = arrowMapInit;
    placedWords.map((word) => {
        arrowMap[word.row][word.col]+= word.direction;
    }
    );
    return arrowMap;
}