import React, { useEffect, useState, useRef } from 'react';
import CrosswordGridDisplay from '../components/CrosswordGridDisplay';
import PlayerProgress from '../components/PlayerProgress';
import { getWordBounds, isLongEnough,generateArrowMap } from '../utils/gridUtils';
import { fetchGridData, submitWord } from '../utils/apiUtils';
import useWebSocket from '../hooks/useWebSocket';

export default function CrosswordPage({ roomId }) {
    const [gridStructure, setGridStructure] = useState([]);
    const [inputGrid, setInputGrid] = useState([]);
    const [gridClueOrder, setGridClueOrder] = useState([]);
    const inputRefs = useRef([]);
    const [focusedCell, setFocusedCell] = useState({ row: 0, col: 0 });
    const [direction, setDirection] = useState('H');
    const [definitionMap, setDefinitionMap] = useState({});
    const [placedWords, setPlacedWords] = useState([]);
    const [playerName, setPlayerName] = useState(localStorage.getItem('name') || '');
    const [arrowMap,setArrowMap] = useState([[]]);

    const { token, progressOtherPlayers, progress } = useWebSocket(roomId, playerName);

    useEffect(() => {
        const loadGrid = async () => {
            try {
                const data = await fetchGridData(roomId);

                if (!data || !data.grid_structure) {
                    console.error("Invalid grid data:", data);
                    return;
                }
                setGridStructure(data.grid_structure);
                const initialGrid = data.grid_structure.map(row =>
                    row.split('').map(c => (c === '-' ? '' : null))
                );
                const arrowMapInit = data.grid_structure.map(row =>
                    row.split('').map( _ => '')
                );
                console.log("ArrowMapinit",arrowMapInit);
                if (progress) {
                    initialGrid.forEach((rowArr, r) => {
                        rowArr.forEach((cell, c) => {
                            if (cell === null && progress[r]?.[c]) {
                                initialGrid[r][c] = progress[r][c];
                            }
                        });
                    });
                }
                setInputGrid(initialGrid);
                setPlacedWords(data.placed_words);
                setArrowMap(generateArrowMap(arrowMapInit,data.placed_words));
                console.log("arrowMap",arrowMap);

                inputRefs.current = initialGrid.map(row =>
                    row.map(() => React.createRef())
                );

                const clueGrid = data.grid_structure.map(row => row.split('').map(() => null));
                let clueIndex = 0;
                for (let row = 0; row < data.grid_structure.length; row++) {
                    const line = data.grid_structure[row];
                    for (let col = 0; col < line.length; col++) {
                        if (line[col] === '/' || line[col] === '#') {
                            clueGrid[row][col] = data.grid_def_order[clueIndex];
                            clueIndex++;
                        }
                    }
                }
                setGridClueOrder(clueGrid);


                const defMap = {};
                data.placed_words.forEach(word => {
                    const key = `${word.number}${word.direction}`;
                    defMap[key] = word.clue;
                });
                console.log("Definition map:", defMap);
                setDefinitionMap(defMap);
            } catch (error) {
                // Handle error (e.g., show error message to user)
                console.error("Error loading grid data:", error);
            }
        };

        loadGrid();
    }, []);

    useEffect(() => {
    if (progress && gridStructure.length > 0) {
        setInputGrid(prevGrid => {
            const newGrid = [...prevGrid];
            Object.keys(progress).forEach(r => {
                Object.keys(progress[r]).forEach(c => {
                    if (prevGrid[r] && prevGrid[r][c] !== null && progress[r][c] !== null) {
                        newGrid[r][c] = progress[r][c].toUpperCase();
                        const ref = inputRefs.current[r][c];
                        if (ref?.current) {
                            ref.current.readOnly = true;
                            ref.current.value = newGrid[r][c]; // Set the value to prevent user from changing it
                            ref.current.style.color = 'teal'; // Change color to indicate it's frozen
                        }
                    }
                });
            });
            return newGrid;
        });
    }
}, [progress, gridStructure]);

    async function hashWord(word) {
        const encoder = new TextEncoder();
        const data = encoder.encode(word.toUpperCase());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async function checkCompletedWords(row, col) {
        const directions = ['H', 'V'];
        for (const dir of directions) {
            const { start, end } = getWordBounds(inputGrid, row, col, dir);
            let word = '';
            for (let i = start; i <= end; i++) {
                const r = dir === 'H' ? row : i;
                const c = dir === 'H' ? i : col;
                word += inputGrid[r][c] || '';
            }
            if (!word || word.includes(' ')) continue;
            const hash = await hashWord(word);
            const match = placedWords.find(p =>
                p.hash === hash &&
                p.row === (dir === 'H' ? row : start) &&
                p.col === (dir === 'H' ? start : col) &&
                p.direction === dir
            );

            if (match) {
                try {
                    const result = await submitWord({
                        row: match.row,
                        col: match.col,
                        direction: match.direction,
                        guess: word,
                        token: token,
                        room_id: roomId,
                        length: match.length
                    });
                    console.log("Word submission result:", result);
                    if (result.valid) {
                        freezeWord(match, word);
                    }
                } catch (err) {
                    console.error("Error submitting word:", err);
                }
            }
        }
    }

    function freezeWord(wordData, word) {
        const { row, col, direction, length } = wordData;

        for (let i = 0; i < length; i++) {
            const r = direction === 'H' ? row : row + i;
            const c = direction === 'H' ? col + i : col;

            const ref = inputRefs.current[r][c];
            if (ref?.current) {
                ref.current.readOnly = true;
                // CLear the input value to prevent user from changing it
                ref.current.value = ''; // Clear the input value
                ref.current.value = word[i].toUpperCase(); // To prevent the value from being changed before the freeze
                ref.current.style.color = 'teal'; 
            }
            const copy = [...inputGrid];
            copy[r][c] = word[i].toUpperCase();
            setInputGrid(copy);
        }
    }

    const updateCell = (row, col, value) => {
        // check if reading only
        const ref = inputRefs.current[row][col];
        if (ref?.current?.readOnly) {
            return; // Do not update the cell if it's read only
        }
        if (value !== '' && (!/^[a-zA-Z]$/.test(value))) return;
        const upper = value.toUpperCase().slice(-1);
        const copy = [...inputGrid];
        copy[row][col] = upper;


        setInputGrid(copy);
        checkCompletedWords(row, col);
        moveFocus(row, col, direction, value === '' || value === undefined);
    };

    const moveFocus = (row, col, dir, backward = false) => {
        let nextRow = row;
        let nextCol = col;
        let increment = backward ? -1 : 1;

        do {
            if (dir === 'H') nextCol += increment;
            else nextRow += increment;
            if (inputRefs.current[nextRow]?.[nextCol]?.current === null) {
                break;
            }
        } while (
            (inputRefs.current[nextRow]?.[nextCol]?.current === undefined ||
                inputRefs.current[nextRow]?.[nextCol]?.current.readOnly) &&
            nextRow >= 0 && nextCol >= 0 &&
            nextRow < gridStructure.length && nextCol < gridStructure[0].length
        );

        if (
            inputRefs.current[nextRow]?.[nextCol]?.current &&
            inputGrid[nextRow][nextCol] !== null
        ) {
            inputRefs.current[nextRow][nextCol].current.focus();
            setInValidDirection(row, col);
            setFocusedCell({ row: nextRow, col: nextCol });
        }
    };

    const handleKeyDown = (e, row, col) => {
        let nextRow = row;
        let nextCol = col;

        if (e.key === 'ArrowRight') {
            setDirection('H');
            do nextCol++; while (inputGrid[row]?.[nextCol] === null);
        } else if (e.key === 'ArrowLeft') {
            setDirection('H');
            do nextCol--; while (inputGrid[row]?.[nextCol] === null && nextCol >= 0);
        } else if (e.key === 'ArrowDown') {
            setDirection('V');
            do nextRow++; while (inputGrid[nextRow]?.[col] === null);
        } else if (e.key === 'ArrowUp') {
            setDirection('V');
            do nextRow--; while (inputGrid[nextRow]?.[col] === null && nextRow >= 0);
        } else if (e.key === 'Backspace') {
            updateCell(row, col, '');
            moveFocus(row, col, direction, true);
            if (direction === 'H') {
                do nextCol--; while (nextCol >= 0 && (inputGrid[row]?.[nextCol] === null || inputRefs.current[row][nextCol].current.readOnly));
            } else {
                do nextRow--; while (nextRow >= 0 && (inputGrid[nextRow]?.[col] === null || inputRefs.current[nextRow][col].current.readOnly));
            }
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            updateCell(row, col, e.key);
            return;
        } else {
            return;
        }

        e.preventDefault();
        if (
            inputRefs.current[nextRow]?.[nextCol]?.current &&
            inputGrid[nextRow][nextCol] !== null
        ) {
            inputRefs.current[nextRow][nextCol].current.focus();
            setInValidDirection(nextRow, nextCol);
            setFocusedCell({ row: nextRow, col: nextCol });
        } else {
            setInValidDirection(row, col);
        }
    };

    const isInFocusedWord = (r, c) => {
        const { row, col } = focusedCell;
        if (direction === 'H') {
            if (r !== row) return false;
            const { start, end } = getWordBounds(inputGrid, row, col, 'H');
            return c >= start && c <= end;
        } else {
            if (c !== col) return false;
            const { start, end } = getWordBounds(inputGrid, row, col, 'V');
            return r >= start && r <= end;
        }
    };

    const onFocus = (row, col) => {
        // Check if the cell is already focused
        if (focusedCell.row === row && focusedCell.col === col &&
            isLongEnough(inputGrid, row, col, direction === 'H' ? 'V' : 'H')
        ) {
            // Change the direction
            setDirection(direction === 'H' ? 'V' : 'H');
        }

        setInValidDirection(row, col);
        setFocusedCell({ row, col });

    }

    const setInValidDirection = (row, col) => {
        if (!isLongEnough(inputGrid, row, col, direction)) {
            // If the word is not long enough, set the direction to the opposite
            setDirection(direction === 'H' ? 'V' : 'H');
        }
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', marginRight: '2rem' }}>
                {!playerName && (
                    <div>
                        <input placeholder="Votre nom" value={playerName} onChange={e => {
                            setPlayerName(e.target.value);
                            localStorage.setItem('name', e.target.value);
                        }} />
                    </div>
                )}
                <h3>Joueur : {playerName}</h3>
                <CrosswordGridDisplay
                    gridStructure={inputGrid}
                    inputGrid={inputGrid}
                    gridClueOrder={gridClueOrder}
                    inputRefs={inputRefs}
                    focusedCell={focusedCell}
                    handleKeyDown={handleKeyDown}
                    onFocus={onFocus}
                    isInFocusedWord={isInFocusedWord}
                    definitionMap={definitionMap}
                    arrowMap = {arrowMap}
                />
            </div>
            <PlayerProgress progressOtherPlayers={progressOtherPlayers} gridStructure={gridStructure} />
        </div>
    );
}