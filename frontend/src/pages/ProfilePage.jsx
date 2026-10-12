"use client"

import { useAuth } from "../contexts/AuthContext"
import SEO from "../components/SEO"
import "./ProfilePage.css"

/**
 * User profile page displaying statistics and settings
 */
const ProfilePage = () => {
  const { user, logout } = useAuth()

  const stats = {
    gamesPlayed: 42,
    gamesWon: 28,
    averageTime: "12:34",
    bestTime: "8:45",
    wordsGuessed: 1247,
    accuracy: "89%",
  }

  return (
    <>
      <SEO title="Profile" description="View your crossword game statistics and settings" />

      <div className="profile-page">
        <div className="container">
          <div className="profile-header">
            <div className="profile-avatar">{user?.name?.charAt(0).toUpperCase() || "U"}</div>
            <div className="profile-info">
              <h1>{user?.name || "Guest User"}</h1>
              <p>{user?.email || "No email provided"}</p>
            </div>
            <button className="btn btn-danger" onClick={logout}>
              Logout
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>Games Played</h3>
              <p className="stat-number">{stats.gamesPlayed}</p>
            </div>
            <div className="stat-card">
              <h3>Games Won</h3>
              <p className="stat-number">{stats.gamesWon}</p>
            </div>
            <div className="stat-card">
              <h3>Win Rate</h3>
              <p className="stat-number">{Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%</p>
            </div>
            <div className="stat-card">
              <h3>Average Time</h3>
              <p className="stat-number">{stats.averageTime}</p>
            </div>
            <div className="stat-card">
              <h3>Best Time</h3>
              <p className="stat-number">{stats.bestTime}</p>
            </div>
            <div className="stat-card">
              <h3>Words Guessed</h3>
              <p className="stat-number">{stats.wordsGuessed}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ProfilePage
