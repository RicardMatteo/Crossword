"use client"

import "./GameList.css"

/**
 * Component displaying list of public games
 * Allows users to join existing games or refresh the list
 */
const GameList = ({ games, loading, onJoinGame, onRefresh }) => {
  if (loading) {
    return (
      <div className="game-list-loading">
        <div className="spinner"></div>
        <p>Loading games...</p>
      </div>
    )
  }

  return (
    <div className="game-list">
      <div className="game-list-header">
        <h3>Available Games</h3>
        <button className="btn btn-secondary" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      {games.length === 0 ? (
        <div className="no-games">
          <p>No public games available</p>
          <p>Create a new game to get started!</p>
        </div>
      ) : (
        <div className="games-grid">
          {games.map((game) => (
            <div key={game.id} className="game-card">
              <h4>Room: {game.id}</h4>
              <p>Players: {game.playerCount}/4</p>
              <p>Status: {game.status}</p>
              <button className="btn btn-primary" onClick={() => onJoinGame(game.id)}>
                Join Game
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GameList
