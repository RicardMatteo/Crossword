"use client"

import { useState, useEffect } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { useAuth, authFetch } from "../contexts/AuthContext"
import { useLanguage } from "../contexts/LanguageContext"
import { formatTime } from "../components/game/GameResults"
import SEO from "../components/SEO"
import "./ProfilePage.css"

/**
 * Logged-in player's stats (saved at the end of each game) and account settings
 */
const ProfilePage = () => {
  const { user, isAuthenticated, logout, updateUserProfile, deleteAccount } = useAuth()
  const { t, language } = useLanguage()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return
    authFetch("/api/user/stats")
      .then(setStats)
      .catch((error) => console.error("Error fetching stats:", error))
  }, [isAuthenticated])

  if (!isAuthenticated) return <Navigate to="/" replace />

  const errorText = (code) => {
    const key = `authErr_${code}`
    return t(key) === key ? t("authErr_generic") : t(key)
  }
  const formatDate = (iso) => new Date(iso).toLocaleDateString(language)
  const time = (seconds) => (seconds == null ? "—" : formatTime(seconds))

  const cards = stats && [
    [t("gamesPlayed"), stats.gamesPlayed],
    [t("gamesWon"), stats.gamesWon],
    [t("winRate"), stats.gamesPlayed ? `${Math.round((100 * stats.gamesWon) / stats.gamesPlayed)}%` : "—"],
    [t("bestTime"), time(stats.bestTime)],
    [t("averageTime"), time(stats.averageTime)],
    [t("wordsFoundTotal"), stats.wordsFound],
  ]

  return (
    <>
      <SEO title={t("profile")} description="Statistiques et compte" />

      <div className="profile-page">
        <div className="container">
          <div className="profile-header">
            <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <h1>{user.name}</h1>
              <p>{user.email}</p>
              {user.createdAt && (
                <p>
                  {t("memberSince")} {formatDate(user.createdAt)}
                </p>
              )}
            </div>
            <button className="btn btn-danger" onClick={logout}>
              {t("logout")}
            </button>
          </div>

          <h2 className="profile-section-title">{t("statsTitle")}</h2>
          <div className="stats-grid">
            {cards?.map(([label, value]) => (
              <div className="stat-card" key={label}>
                <h3>{label}</h3>
                <p className="stat-number">{value}</p>
              </div>
            ))}
          </div>

          <h2 className="profile-section-title">{t("recentGames")}</h2>
          <div className="profile-card">
            {stats?.recent.length ? (
              <table className="recent-games">
                <thead>
                  <tr>
                    <th>{t("date")}</th>
                    <th>{t("gameMode")}</th>
                    <th>{t("rankLabel")}</th>
                    <th>{t("time")}</th>
                    <th>{t("words")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((game) => (
                    <tr key={game.playedAt} className={game.won ? "won" : ""}>
                      <td>{formatDate(game.playedAt)}</td>
                      <td>{game.mode === "coop" ? t("modeCoop") : t("modeClassic")}</td>
                      <td>
                        {game.mode === "coop"
                          ? `${game.percent}%`
                          : `${game.rank}/${game.playerCount} · ${game.won ? t("resultWon") : t("resultLost")}`}
                      </td>
                      <td>{game.finished ? time(game.time) : t("notFinished")}</td>
                      <td>{game.wordsFound}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="profile-empty">{stats ? t("noGamesYet") : "…"}</p>
            )}
          </div>

          <h2 className="profile-section-title">{t("accountSettings")}</h2>
          <div className="account-forms">
            <AccountForm
              title={t("changeName")}
              fields={[{ name: "name", label: t("name"), initial: user.name, minLength: 2, maxLength: 20 }]}
              submitLabel={t("save")}
              successText={t("nameChanged")}
              errorText={errorText}
              onSubmit={({ name }) => updateUserProfile({ name: name.trim() })}
            />
            <AccountForm
              title={t("changePassword")}
              fields={[
                { name: "currentPassword", label: t("currentPassword"), type: "password", autoComplete: "current-password" },
                { name: "newPassword", label: t("newPassword"), type: "password", minLength: 8, autoComplete: "new-password" },
              ]}
              submitLabel={t("save")}
              successText={t("passwordChanged")}
              errorText={errorText}
              onSubmit={(values) => updateUserProfile(values)}
              resetOnSuccess
            />
            <AccountForm
              title={t("deleteAccount")}
              description={t("deleteAccountConfirm")}
              fields={[{ name: "password", label: t("password"), type: "password", autoComplete: "current-password" }]}
              submitLabel={t("deleteAccount")}
              danger
              errorText={errorText}
              onSubmit={async ({ password }) => {
                const result = await deleteAccount(password)
                if (result.success) navigate("/")
                return result
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

/** Small form whose `onSubmit(values)` resolves to { success, error } */
const AccountForm = ({ title, description, fields, submitLabel, successText, errorText, onSubmit, resetOnSuccess, danger }) => {
  const initialValues = () => Object.fromEntries(fields.map((f) => [f.name, f.initial ?? ""]))
  const [values, setValues] = useState(initialValues)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const result = await onSubmit(values)
    setBusy(false)
    if (result.success) {
      if (resetOnSuccess) setValues(initialValues())
      if (successText) setMessage({ ok: true, text: successText })
    } else {
      setMessage({ ok: false, text: errorText(result.error) })
    }
  }

  return (
    <form className={`profile-card account-form ${danger ? "danger" : ""}`} onSubmit={handleSubmit}>
      <h3>{title}</h3>
      {description && <p className="account-form-description">{description}</p>}
      {fields.map((field) => (
        <div className="form-group" key={field.name}>
          <label className="form-label" htmlFor={`account-${field.name}`}>
            {field.label}
          </label>
          <input
            id={`account-${field.name}`}
            className="form-input"
            type={field.type || "text"}
            value={values[field.name]}
            onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
            minLength={field.minLength}
            maxLength={field.maxLength}
            autoComplete={field.autoComplete}
            required
            disabled={busy}
          />
        </div>
      ))}
      {message && <p className={message.ok ? "form-success" : "form-error"}>{message.text}</p>}
      <button type="submit" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={busy}>
        {submitLabel}
      </button>
    </form>
  )
}

export default ProfilePage
