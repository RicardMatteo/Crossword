import { Helmet } from "react-helmet-async"

/**
 * SEO component for managing meta tags and page titles
 * Implements dynamic meta tags for better search engine optimization
 */
const SEO = ({
  title = "CrosswordMaster",
  description = "Play crosswords online with friends",
  keywords = "crossword, puzzle, game",
  image = "/og-image.jpg",
  url = window.location.href,
}) => {
  const fullTitle = title.includes("CrosswordMaster") ? title : `${title} | CrosswordMaster`

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="CrosswordMaster Team" />
      <link rel="canonical" href={url} />
    </Helmet>
  )
}

export default SEO
