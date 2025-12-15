"use client"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface FlashcardSet {
  id: string
  documentId: string
  title: string
  cards: { question: string; answer: string }[]
  createdAt: string
}

export default function FlashcardsPage() {
  const { user, token, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const docId = searchParams.get("doc")
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchFlashcards()
      if (docId) {
        generateFlashcards(docId)
      }
    }
  }, [token, docId])

  const fetchFlashcards = async () => {
    try {
      const res = await fetch("/api/flashcards", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        // Handle paginated response structure
        setFlashcardSets(data.data || data.flashcardSets || [])
      }
    } catch (err) {
      console.error("Failed to fetch flashcards:", err)
      setFlashcardSets([]) // Ensure array on error
    }
  }

  const generateFlashcards = async (documentId: string, reattempt = false) => {
    try {
      setGenLoading(true)
      setError("")
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId, reattempt }),
      })

      if (res.ok) {
        const data = await res.json()
        fetchFlashcards()
        setSelectedSet(data.flashcardSet)
        setCurrentCardIndex(0)
        setIsFlipped(false)
      } else {
        const err = await res.json()
        setError(err.error || "Generation failed")
      }
    } catch (err) {
      setError("Generation failed")
    } finally {
      setGenLoading(false)
    }
  }

  const regenerateFlashcards = async () => {
    if (!selectedSet) return
    
    const confirm = window.confirm(
      "Are you sure you want to regenerate these flashcards? This will delete the current set and create a new one."
    )
    if (!confirm) return

    // Use the documentId directly from the selected set
    await generateFlashcards(selectedSet.documentId, true)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      <nav className="bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/app">
            <span className="text-2xl font-bold text-white cursor-pointer">SREP</span>
          </Link>
          <span className="text-white">{user?.name}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/app">
          <Button variant="outline" className="mb-6 bg-transparent">
            ← Back to Dashboard
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Your Sets</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {flashcardSets.map((set) => (
                  <div
                    key={set.id}
                    onClick={() => {
                      setSelectedSet(set)
                      setCurrentCardIndex(0)
                      setIsFlipped(false)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedSet?.id === set.id
                        ? "bg-orange-100 border-2 border-orange-500"
                        : "bg-gray-50 border-2 border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-800">{set.title}</p>
                    <p className="text-xs text-gray-600">{set.cards.length} cards</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>}

            {selectedSet ? (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{selectedSet.title}</h2>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={regenerateFlashcards}
                        disabled={genLoading}
                        variant="outline"
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        {genLoading ? "Regenerating..." : "🔄 Regenerate"}
                      </Button>
                      <span className="text-orange-600 font-semibold">
                        Card {currentCardIndex + 1} of {selectedSet.cards.length}
                      </span>
                    </div>
                  </div>

                  {/* Flip Card */}
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-12 min-h-96 flex items-center justify-center cursor-pointer transform transition hover:scale-105 shadow-xl"
                  >
                    <div className="text-center text-white">
                      <p className="text-sm font-semibold mb-4">{isFlipped ? "ANSWER" : "QUESTION"}</p>
                      <p className="text-2xl font-bold">
                        {isFlipped
                          ? selectedSet.cards[currentCardIndex].answer
                          : selectedSet.cards[currentCardIndex].question}
                      </p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex justify-between items-center mt-8">
                    <Button
                      onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                      disabled={currentCardIndex === 0}
                      variant="outline"
                      className="px-6 py-2"
                    >
                      ← Previous
                    </Button>
                    <span className="text-gray-600">
                      {currentCardIndex + 1} / {selectedSet.cards.length}
                    </span>
                    <Button
                      onClick={() => setCurrentCardIndex(Math.min(selectedSet.cards.length - 1, currentCardIndex + 1))}
                      disabled={currentCardIndex === selectedSet.cards.length - 1}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2"
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <p className="text-gray-600 mb-4">No flashcard sets yet</p>
                {genLoading ? (
                  <p className="text-orange-600">Generating flashcards...</p>
                ) : (
                  <p className="text-gray-500">Upload a document and click "Generate Flashcards" to get started</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
