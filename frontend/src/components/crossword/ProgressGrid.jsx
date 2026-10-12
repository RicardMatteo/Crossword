"use client"

/**
 * Individual progress grid component showing a player's completion status
 * Displays a miniature version of the crossword grid with filled cells
 */
export default function ProgressGrid({ name, progress, gridStructure }) {
  return (
    <div className="progress-grid-container">
      <div className="progress-player-name">{name}</div>
      <div className="progress-grid">
        {gridStructure.map((row, r) => (
          <div key={r} className="progress-row">
            {row.split("").map((cell, c) => (
              <div
                key={c}
                className="progress-cell"
                style={{
                  backgroundColor:
                    cell === "-"
                      ? progress[r]?.[c]
                        ? "var(--success-color)"
                        : "var(--bg-primary)"
                      : "var(--bg-secondary)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
