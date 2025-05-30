import React from 'react';
import "./GridDisplay.css"

const cellStyle = {
    width: '5rem',
    height: '5rem',
    border: '0.2px solid #1f1f1f',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontFamily: "'Roboto Condensed', sans-serif",
    textAlign: 'center'
};

function ClueCell({ clues, definitionMap }) {
    const isDouble = clues?.length === 2;

    // Helper to get definition, trying V/H swap if not found
    function getDefinition(clue) {
        const clueStr = clue?.toString();
        if (!clueStr) return '';
        if (definitionMap[clueStr]) return definitionMap[clueStr];
        // Try swapping last char V<->H
        if (clueStr.endsWith('V')) {
            const swapped = clueStr.slice(0, -1) + 'H';
            return definitionMap[swapped] || `Not Found, ${clue}`;
        }
        if (clueStr.endsWith('H')) {
            const swapped = clueStr.slice(0, -1) + 'V';
            return definitionMap[swapped] || `Not Found, ${clue}`;
        }
        return `Not Found, ${clue}`;
    }

    return (
        <div
            lang="fr"
            style={{
                ...cellStyle,
                backgroundColor: '#e6f3ff',
                padding: '2px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                overflow: 'hidden',
                fontSize: 'clamp(0.05rem, 1vw, 0.8rem)',
                lineHeight: 1,
                wordBreak: 'break-all',
                hyphens: 'auto',
                whiteSpace: 'normal',
                textOverflow: 'ellipsis',
            }}
        >
            {clues?.length === 1 && (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px'
                }}>
                    {getDefinition(clues[0])}
                </div>
            )}
            {isDouble && (
                <>
                    <div style={{
                        flex: 1,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.1rem'
                    }}>
                        {getDefinition(clues[0])}
                    </div>
                    <hr style={{ width: '110%', margin: '1px 0', border: '0.2px #1f1f1f solid' }} />
                    <div style={{
                        flex: 1,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.1rem'
                    }}>
                        {getDefinition(clues[1])}
                    </div>
                </>
            )}
        </div>
    );
}

function InputCell({ cell, rowIndex, colIndex, inputRefs, handleKeyDown, onFocus, isInWord, isFocused , arrow}) {
    return (
        <div className="cell-container">


            <input
                key={colIndex}
                type="text"
                maxLength={1}
                value={cell || ''}
                ref={inputRefs.current[rowIndex][colIndex]}
                onChange={(e) => {
                    if (navigator.userAgent.toLowerCase().includes('mobile')) {
                        const syntheticEvent = { ...e, key: e.target.value.slice(-1) };
                        handleKeyDown(syntheticEvent, rowIndex, colIndex);
                    }
                }}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                onClick={() => onFocus(rowIndex, colIndex)}
                style={{
                    ...cellStyle,
                    padding: 0,
                    backgroundColor: isInWord ? (isFocused ? '#ffa94d' : '#ffe8cc') : 'white',
                    caretColor: 'transparent',
                    outline: 'none',
                    gridArea: '1/1',
                }}
                
                
                />

                {arrow.includes('V') && <div className="down-triangle"/> }
                {arrow.includes('H') && <div className="right-triangle"/> }
        </div>
    );
}


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
    arrowMap
}) {
    return (
        <div lang='fr' style={{ display: 'inline-block', marginBottom: '2rem' }}>
            {gridStructure.map((row, rowIndex) => (
                <div key={rowIndex} style={{ display: 'flex' }}>
                    {row.map((cell, colIndex) => {
                        const isFocused = focusedCell.row === rowIndex && focusedCell.col === colIndex;
                        const isInWord = isInFocusedWord(rowIndex, colIndex);

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
                                    arrow = {arrowMap[rowIndex][colIndex]}
                                />
                            );
                        } else {
                            const clues = gridClueOrder[rowIndex]?.[colIndex];
                            return (
                                <ClueCell key={colIndex} clues={clues} definitionMap={definitionMap} />
                            );
                        }
                    })}
                </div>
            ))}
        </div>
    );
}