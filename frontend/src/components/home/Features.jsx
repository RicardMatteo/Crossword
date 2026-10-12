"use client"

import { useLanguage } from "../../contexts/LanguageContext"
import "./Features.css"

/**
 * Features section showcasing the main benefits of the crossword platform
 */
const Features = () => {
  const { t } = useLanguage()

  const features = [
    {
      icon: "🎯",
      title: t("smartDifficulty"),
      description: t("smartDifficultyDesc"),
    },
    {
      icon: "👥",
      title: t("multiplayerFun"),
      description: t("multiplayerDesc"),
    },
    {
      icon: "📱",
      title: t("crossPlatform"),
      description: t("crossPlatformDesc"),
    },
    {
      icon: "🏆",
      title: t("achievements"),
      description: t("achievementsDesc"),
    },
    {
      icon: "🎨",
      title: t("customThemes"),
      description: t("customThemesDesc"),
    },
    {
      icon: "⚡",
      title: t("realTimePlay"),
      description: t("realTimePlayDesc"),
    },
  ]

  return (
    <section className="features">
      <div className="container">
        <div className="features-header">
          <h2 className="section-title">{t("whyChoose")}</h2>
          <p className="section-description">{t("featuresDesc")}</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
