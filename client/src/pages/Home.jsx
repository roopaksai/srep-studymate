"use client"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Navbar from "../components/Navbar"
import "./Home.css"

const Home = () => {
  const navigate = useNavigate()
  const { token } = useAuth()

  const handleFeatureClick = (feature) => {
    if (!token) {
      navigate("/login")
    } else {
      navigate(`/app/${feature}`)
    }
  }

  return (
    <div>
      <Navbar isHome={true} />
      <div className="home-container">
        <div className="hero">
          <h1 className="hero-title">SREP</h1>
          <p className="hero-subtitle">your studymate to score in exams.</p>

          <div className="upload-section">
            <p className="upload-label">upload your document:</p>
            <div className={`upload-zone ${!token ? "disabled" : ""}`} onClick={() => token && navigate("/app")}>
              <span className="upload-icon">📚</span>
              <p>{token ? "Click to upload or drag file" : "Login to upload your document"}</p>
            </div>
          </div>

          <div className="features-section">
            <h2>Available Features:</h2>
            <div className="features-grid">
              <button className="feature-btn" onClick={() => handleFeatureClick("flashcards")}>
                🎴 Flashcards
              </button>
              <button className="feature-btn" onClick={() => handleFeatureClick("mock-papers")}>
                📝 Prioritised Topics
              </button>
              <button className="feature-btn" onClick={() => handleFeatureClick("mock-papers")}>
                📄 Mock Paper
              </button>
              <button className="feature-btn" onClick={() => handleFeatureClick("scheduler")}>
                📅 Scheduler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
