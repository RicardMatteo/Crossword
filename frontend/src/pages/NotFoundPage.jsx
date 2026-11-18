"use client"
import { Link } from "react-router-dom"
import { useLanguage } from "../contexts/LanguageContext"
import SEO from "../components/SEO"
import "./NotFoundPage.css"

/**
 * 404 Not Found page with animated crossword grid background
 */
const NotFoundPage = () => {
  const { t } = useLanguage()

  return (
    <>
      <SEO title="Page Not Found - 404" description="The page you're looking for doesn't exist." />

      <div className="not-found-page">
        <div className="crossword-bg">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="crossword-cell"
              style={{
                animationDelay: `${Math.random() * 2}s`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
            </div>
          ))}
        </div>

        <div className="not-found-content">
          <div className="error-code">404</div>
          <h1 className="error-title">{t("pageNotFound")}</h1>
          <p className="error-description">{t("pageNotFoundDesc")}</p>

          <div className="error-actions">
            <Link to="/" className="btn btn-primary btn-large">
              {t("backToHome")}
            </Link>
            <button className="btn btn-secondary btn-large" onClick={() => window.history.back()}>
              {t("goBack")}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default NotFoundPage
