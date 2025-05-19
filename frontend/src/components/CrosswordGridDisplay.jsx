import React from 'react';

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
                    {definitionMap[clues[0]?.toString()] || `Not Found, ${clues[0]}`}
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
                        {definitionMap[clues[0]?.toString()] || `Not Found, ${clues[0]}`}
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
                        {definitionMap[clues[1]?.toString()] || `Not Found, ${clues[1]}`}
                    </div>
                </>
            )}
        </div>
    );
}

function InputCell({ cell, rowIndex, colIndex, inputRefs, handleKeyDown, onFocus, isInWord, isFocused }) {
    return (
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
                outline: 'none'
            }}
        />
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
    definitionMap
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