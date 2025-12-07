"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import "./Flashcards.css"

const Flashcards = () => {
  const [flashcards, setFlashcards] = useState([])
  const [selectedSet, setSelectedSet] = useState(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { token } = useAuth()

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  useEffect(() => {
    fetchFlashcards()
  }, [])

  const fetchFlashcards = async () => {
    try {
      const response = await axios.get(`${API_URL}/flashcards`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setFlashcards(response.data)
      if (response.data.length > 0) {
        setSelectedSet(response.data[0])
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch flashcards")
    } finally {
      setLoading(false)
    }
  }

  const handleNextCard = () => {
    if (selectedSet && currentCardIndex < selectedSet.cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
      setIsFlipped(false)
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

  const currentCard = selectedSet?.cards[currentCardIndex]
  const progress = selectedSet ? ((currentCardIndex + 1) / selectedSet.cards.length) * 100 : 0

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <div className="dashboard-container">
            <h1>🎴 Flashcards</h1>

            {error && <div className="error-message">{error}</div>}

            {flashcards.length === 0 ? (
              <div className="empty-state">
                <p>No flashcards yet. Upload a document to generate flashcards!</p>
              </div>
            ) : (
              <div className="flashcards-container">
                <div className="sets-list">
                  <h3>Flashcard Sets</h3>
                  {flashcards.map((set) => (
                    <div
                      key={set._id}
                      className={`set-item ${selectedSet?._id === set._id ? "active" : ""}`}
                      onClick={() => {
                        setSelectedSet(set)
                        setCurrentCardIndex(0)
                        setIsFlipped(false)
                      }}
                    >
                      <p className="set-title">{set.title}</p>
                      <p className="set-count">{set.cards.length} cards</p>
                    </div>
                  ))}
                </div>

                {selectedSet && (
                  <div className="cards-viewer">
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="progress-text">
                      Card {currentCardIndex + 1} of {selectedSet.cards.length}
                    </p>

                    <div className="card-flip" onClick={() => setIsFlipped(!isFlipped)}>
                      <div className={`flip-card ${isFlipped ? "flipped" : ""}`}>
                        <div className="flip-card-inner">
                          <div className="flip-card-front">
                            <p className="card-label">Question</p>
                            <p className="card-content">{currentCard?.question}</p>
                          </div>
                          <div className="flip-card-back">
                            <p className="card-label">Answer</p>
                            <p className="card-content">{currentCard?.answer}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="flip-hint">Click to flip</p>

                    <div className="navigation-buttons">
                      <button onClick={handlePreviousCard} disabled={currentCardIndex === 0}>
                        ← Previous
                      </button>
                      <button onClick={handleNextCard} disabled={currentCardIndex === selectedSet.cards.length - 1}>
                        Next →
                      </button>
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

export default Flashcards
