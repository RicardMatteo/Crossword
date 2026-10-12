"use client"
import { useLanguage } from "../../contexts/LanguageContext"
import "./Hero.css"

/**
 * Hero section component for the homepage
 * Features main call-to-action buttons and animated background
 */
const Hero = ({ onCreateGame, onShowAuth, isAuthenticated }) => {
  const { t } = useLanguage()

  return (
    <section className="hero">
      <div className="hero-background">
        <div className="floating-letters">
          {"CROSSWORDMASTER".split("").map((letter, index) => (
            <span key={index} className="floating-letter" style={{ animationDelay: `${index * 0.1}s` }}>
              {letter}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-content">
        <div className="container">
          <h1 className="hero-title">
            {t("heroTitle")}
            <span className="highlight"> {t("heroTitleHighlight")}</span>
          </h1>

          <p className="hero-description">{t("heroDescription")}</p>

          <div className="hero-actions">
            <button className="btn btn-primary btn-large" onClick={onCreateGame}>
              {t("createGame")}
            </button>

            {!isAuthenticated && (
              <button className="btn btn-secondary btn-large" onClick={onShowAuth}>
                {t("signIn")}
              </button>
            )}
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Players</span>
            </div>
            <div className="stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Daily Games</span>
            </div>
            <div className="stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Puzzles Solved</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
