import React from 'react';

export default function PlayerProgress({ progressOtherPlayers, gridStructure }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'left' }}>
            <h4>Progression des autres joueurs</h4>
            {Object.entries(progressOtherPlayers).map(([name, grid]) => (
                <div key={name} style={{ marginBottom: '1rem' }}>
                    <strong>{name}</strong>
                    {grid.map((row, r) => (
                        <div key={r} style={{ display: 'flex' }}>
                            {row.map((cell, c) => (
                                <div key={c} style={{
                                    width: '10px',
                                    height: '10px',
                                    backgroundColor: gridStructure[r]?.[c] === '-' ? (cell ? 'green' : 'white') : '#ccc',
                                    border: '1px solid #ddd'
                                }} />
                            ))}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}