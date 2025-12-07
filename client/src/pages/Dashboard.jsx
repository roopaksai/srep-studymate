"use client"

import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import "./Dashboard.css"

const Dashboard = () => {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedDoc, setSelectedDoc] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const { token } = useAuth()

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  const handleFileUpload = async (file) => {
    if (!file) return

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "study-material")

      const response = await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setDocuments([...documents, response.data])
      setSelectedDoc(response.data)
      fileInputRef.current.value = ""
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateFlashcards = async () => {
    if (!selectedDoc) {
      setError("Please select a document first")
      return
    }

    try {
      await axios.post(
        `${API_URL}/flashcards/generate`,
        { documentId: selectedDoc._id, title: `Flashcards from ${selectedDoc.originalFileName}` },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      navigate("/app/flashcards")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate flashcards")
    }
  }

  const handleGenerateMockPaper = async () => {
    if (!selectedDoc) {
      setError("Please select a document first")
      return
    }

    try {
      await axios.post(
        `${API_URL}/mock-papers/generate`,
        { documentId: selectedDoc._id, title: `Mock Paper from ${selectedDoc.originalFileName}` },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      navigate("/app/mock-papers")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate mock paper")
    }
  }

  const handleGenerateSchedule = async () => {
    navigate("/app/scheduler")
  }

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <div className="dashboard-container">
            <h1>Dashboard</h1>

            {error && <div className="error-message">{error}</div>}

            <div className="upload-card">
              <h2>📚 Upload Your Document</h2>
              <div className="upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  className="file-input"
                />
                <label className="upload-label">
                  <span className="upload-icon">📤</span>
                  <p>Click to upload or drag and drop</p>
                  <span className="file-hint">TXT or PDF</span>
                </label>
              </div>
              {loading && <p className="loading">Uploading...</p>}
            </div>

            {selectedDoc && (
              <div className="document-card">
                <h3>Document Selected</h3>
                <p className="doc-name">{selectedDoc.originalFileName}</p>
                <p className="doc-preview">{selectedDoc.extractedText.substring(0, 100)}...</p>
                <div className="action-buttons">
                  <button className="action-btn primary" onClick={handleGenerateFlashcards}>
                    🎴 Generate Flashcards
                  </button>
                  <button className="action-btn primary" onClick={handleGenerateMockPaper}>
                    📝 Generate Mock Paper
                  </button>
                  <button className="action-btn" onClick={() => navigate("/app/analysis")}>
                    📈 Analyse Answer Script
                  </button>
                  <button className="action-btn" onClick={handleGenerateSchedule}>
                    📅 Create Schedule
                  </button>
                </div>
              </div>
            )}

            {documents.length > 1 && (
              <div className="documents-list">
                <h3>Your Documents</h3>
                <div className="doc-list">
                  {documents.map((doc) => (
                    <div
                      key={doc._id}
                      className={`doc-item ${selectedDoc?._id === doc._id ? "selected" : ""}`}
                      onClick={() => setSelectedDoc(doc)}
                    >
                      {doc.originalFileName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Dashboard
