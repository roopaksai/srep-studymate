"use client"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import NavigationDropdown from "@/components/NavigationDropdown"

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

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-[#DEEEEE]">Loading...</div>

  return (
    <div className="min-h-screen bg-[#DEEEEE]">
      <nav className="bg-[#2563EB] border-b border-[#1d4ed8]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/app">
            <span className="text-2xl font-bold text-white cursor-pointer">SREP StudyMate</span>
          </Link>
          <NavigationDropdown />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#0F172A] mb-1">Flashcards</h1>
          <p className="text-[#64748B]">Study with AI-generated flashcards</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-5">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3 uppercase tracking-wide">Your Sets</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {flashcardSets.length === 0 ? (
                  <p className="text-sm text-[#64748B] text-center py-4">No sets yet</p>
                ) : (
                  flashcardSets.map((set) => (
                    <div
                      key={set.id}
                      onClick={() => {
                        setSelectedSet(set)
                        setCurrentCardIndex(0)
                        setIsFlipped(false)
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition border ${
                        selectedSet?.id === set.id
                          ? "bg-blue-50 border-[#2563EB] text-[#2563EB]"
                          : "border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <p className="font-medium text-sm truncate">{set.title}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{set.cards.length} cards</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">{error}</div>}

            {selectedSet ? (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0F172A]">{selectedSet.title}</h2>
                    <p className="text-sm text-[#64748B] mt-1">
                      Card {currentCardIndex + 1} of {selectedSet.cards.length}
                    </p>
                  </div>
                  <Button
                    onClick={regenerateFlashcards}
                    disabled={genLoading}
                    variant="outline"
                    className="border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9]"
                  >
                    {genLoading ? "Regenerating..." : "↻ Regenerate"}
                  </Button>
                </div>

                {/* Flip Card */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="bg-[#2563EB] rounded-lg p-8 sm:p-12 min-h-[320px] sm:min-h-96 flex items-center justify-center cursor-pointer transform transition hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                >
                  <div className="text-center text-white">
                    <p className="text-xs font-semibold mb-4 uppercase tracking-wider opacity-90">{isFlipped ? "Answer" : "Question"}</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-semibold leading-relaxed">
                      {isFlipped
                        ? selectedSet.cards[currentCardIndex].answer
                        : selectedSet.cards[currentCardIndex].question}
                    </p>
                    <p className="text-sm opacity-75 mt-6">Tap to flip</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex justify-between items-center mt-6 gap-4">
                  <Button
                    onClick={() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1))}
                    disabled={currentCardIndex === 0}
                    variant="outline"
                    className="border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] disabled:opacity-40"
                  >
                    ← Previous
                  </Button>
                  <span className="text-sm text-[#64748B] font-medium">
                    {currentCardIndex + 1} / {selectedSet.cards.length}
                  </span>
                  <Button
                    onClick={() => setCurrentCardIndex(Math.min(selectedSet.cards.length - 1, currentCardIndex + 1))}
                    disabled={currentCardIndex === selectedSet.cards.length - 1}
                    className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white disabled:opacity-40"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <p className="text-[#334155] font-medium mb-2">No flashcard sets yet</p>
                {genLoading ? (
                  <p className="text-[#2563EB]">Generating flashcards...</p>
                ) : (
                  <p className="text-[#64748B] text-sm">Upload a document and generate flashcards to get started</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
