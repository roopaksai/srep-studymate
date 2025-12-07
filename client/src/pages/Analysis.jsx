"use client"

import { useState, useRef } from "react"
import axios from "axios"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import "./Analysis.css"

const Analysis = () => {
  const [reports, setReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [answerScriptDoc, setAnswerScriptDoc] = useState(null)
  const fileInputRef = useRef(null)
  const { token } = useAuth()

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  const handleFileUpload = async (file) => {
    if (!file) return

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "answer-script")

      const docResponse = await axios.post(`${API_URL}/documents/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })

      setAnswerScriptDoc(docResponse.data)

      // Generate analysis report
      const reportResponse = await axios.post(
        `${API_URL}/analysis/generate`,
        { answerScriptDocumentId: docResponse.data._id },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      setReports([reportResponse.data, ...reports])
      setSelectedReport(reportResponse.data)
      fileInputRef.current.value = ""
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload and analyse")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <div className="dashboard-container">
            <h1>📈 Answer Script Analysis</h1>

            {error && <div className="error-message">{error}</div>}

            <div className="upload-card">
              <h2>📋 Upload Answer Script</h2>
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
              {loading && <p className="loading">Uploading and analysing...</p>}
            </div>

            {selectedReport && (
              <div className="reports-container">
                <div className="report-list">
                  <h3>Analysis Reports</h3>
                  {reports.map((report) => (
                    <div
                      key={report._id}
                      className={`report-item ${selectedReport?._id === report._id ? "active" : ""}`}
                      onClick={() => setSelectedReport(report)}
                    >
                      <p className="report-date">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>

                <div className="report-viewer">
                  <div className="report-summary">
                    <h3>Summary</h3>
                    <p>{selectedReport.summary}</p>
                  </div>

                  <div className="report-section">
                    <h3>✓ Strengths</h3>
                    <ul className="strengths-list">
                      {selectedReport.strengths.map((strength, idx) => (
                        <li key={idx}>{strength}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="report-section">
                    <h3>✗ Weaknesses</h3>
                    <ul className="weaknesses-list">
                      {selectedReport.weaknesses.map((weakness, idx) => (
                        <li key={idx}>{weakness}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="report-section">
                    <h3>📚 Recommended Topics</h3>
                    <ul className="topics-list">
                      {selectedReport.recommendedTopics.map((topic, idx) => (
                        <li key={idx}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Analysis
