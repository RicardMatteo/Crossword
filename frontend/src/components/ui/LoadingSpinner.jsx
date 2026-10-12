import "./LoadingSpinner.css"

/**
 * Loading spinner component with customizable size and color
 */
const LoadingSpinner = ({ size = "medium", color = "primary" }) => {
  return (
    <div className="loading-container">
      <div className={`loading-spinner ${size} ${color}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-text">Loading CrosswordMaster...</p>
    </div>
  )
}

export default LoadingSpinner
