"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import "./MockPapers.css"

const MockPapers = () => {
  const [papers, setPapers] = useState([])
  const [selectedPaper, setSelectedPaper] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { token } = useAuth()

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  useEffect(() => {
    fetchMockPapers()
  }, [])

  const fetchMockPapers = async () => {
    try {
      const response = await axios.get(`${API_URL}/mock-papers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPapers(response.data)
      if (response.data.length > 0) {
        setSelectedPaper(response.data[0])
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch mock papers")
    } finally {
      setLoading(false)
    }
  }

  if (loading)
    return (
      <div>
        <Navbar />
        <Sidebar />
        <div style={{ padding: "40px" }}>Loading...</div>
      </div>
    )

  const totalMarks = selectedPaper?.questions.reduce((sum, q) => sum + q.marks, 0) || 0

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <div className="dashboard-container">
            <h1>📝 Mock Papers</h1>

            {error && <div className="error-message">{error}</div>}

            {papers.length === 0 ? (
              <div className="empty-state">
                <p>No mock papers yet. Upload a document to generate mock papers!</p>
              </div>
            ) : (
              <div className="papers-container">
                <div className="papers-list">
                  <h3>Papers</h3>
                  {papers.map((paper) => (
                    <div
                      key={paper._id}
                      className={`paper-item ${selectedPaper?._id === paper._id ? "active" : ""}`}
                      onClick={() => setSelectedPaper(paper)}
                    >
                      <p className="paper-title">{paper.title}</p>
                      <p className="paper-info">{paper.questions.length} questions</p>
                    </div>
                  ))}
                </div>

                {selectedPaper && (
                  <div className="paper-viewer">
                    <div className="paper-header">
                      <h2>{selectedPaper.title}</h2>
                      <div className="paper-stats">
                        <span className="stat">Total Questions: {selectedPaper.questions.length}</span>
                        <span className="stat">Total Marks: {totalMarks}</span>
                      </div>
                    </div>

                    <div className="questions-list">
                      {selectedPaper.questions.map((question, idx) => (
                        <div key={idx} className="question-item">
                          <div className="question-header">
                            <span className="question-number">Q{idx + 1}</span>
                            <span className="question-marks">{question.marks} marks</span>
                          </div>
                          <p className="question-text">{question.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default MockPapers
