import React from 'react';

export default function ProgressGrid({ name, progress, gridStructure }) {
  return (
    <div style={{ margin: '0.5rem', display: 'inline-block' }}>
      <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{name}</div>
      <div style={{ display: 'inline-block', border: '1px solid #aaa' }}>
        {gridStructure.map((row, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {row.split('').map((cell, c) => (
              <div key={c} style={{
                width: '10px',
                height: '10px',
                backgroundColor: cell === '-' ? (progress[r]?.[c] ? 'green' : 'white') : '#ccc',
                border: '1px solid #ccc'
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}