import React from "react"
import ReactDOM from "react-dom/client"
import { HelmetProvider } from "react-helmet-async"
import App from "./App.jsx"

// Google Analytics integration
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("config", "GA_MEASUREMENT_ID", {
    page_title: document.title,
    page_location: window.location.href,
  })
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)
