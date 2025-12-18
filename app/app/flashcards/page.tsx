"use client"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import NavigationDropdown from "@/components/NavigationDropdown"
import BottomNavigation from "@/components/BottomNavigation"
import { FlashcardSkeleton, ListItemSkeleton } from "@/components/SkeletonLoaders"
import toast from "react-hot-toast"
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion"

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
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null)

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

  // Auto-advance timer - when answer is shown, auto-move to next card after 6 seconds
  useEffect(() => {
    // Clear any existing timer
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
    }

    // Only start timer if card is flipped (showing answer)
    if (isFlipped && selectedSet && currentCardIndex < selectedSet.cards.length - 1) {
      const timer = setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 1)
        setIsFlipped(false)
      }, 6000) // 6 seconds
      setAutoAdvanceTimer(timer)
    }

    // Cleanup timer on unmount or when dependencies change
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer)
      }
    }
  }, [isFlipped, currentCardIndex, selectedSet])

  const fetchFlashcards = async () => {
    try {
      const res = await fetch("/api/flashcards?limit=5", {
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
        toast.success('Flashcards generated successfully!')
        fetchFlashcards()
        setSelectedSet(data.flashcardSet)
        setCurrentCardIndex(0)
        setIsFlipped(false)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Generation failed')
      }
    } catch (err) {
      toast.error('Generation failed. Please try again.')
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

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right' && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1)
      setIsFlipped(false)
    } else if (direction === 'left' && currentCardIndex < selectedSet!.cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1)
      setIsFlipped(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#DEEEEE]">
        <nav className="bg-gradient-to-r from-blue-500 to-blue-700 border-b border-blue-400">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
            <span className="text-lg sm:text-xl font-bold text-white">SREP StudyMate</span>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <FlashcardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#DEEEEE] dark:bg-gray-900">
      <nav className="bg-gradient-to-r from-blue-500 to-blue-700 dark:from-blue-700 dark:to-blue-900 border-b border-blue-400 dark:border-blue-900">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <Link href="/app">
            <span className="text-lg sm:text-xl font-bold text-white cursor-pointer">SREP StudyMate</span>
          </Link>
          <NavigationDropdown />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-white mb-1">Flashcards</h1>
          <p className="text-sm sm:text-base text-[#64748B] dark:text-gray-400">Study with AI-generated flashcards</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-[#E2E8F0] dark:border-gray-700 p-5 shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white mb-3 uppercase tracking-wide">Your Sets</h3>
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
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedSet?.id === set.id
                          ? "bg-blue-50 dark:bg-blue-900/30 border-[#2563EB] dark:border-blue-500 text-[#2563EB] dark:text-blue-400 shadow-md"
                          : "border-[#E2E8F0] dark:border-gray-600 hover:border-[#CBD5E1] dark:hover:border-gray-500 hover:bg-[#F8FAFC] dark:hover:bg-gray-700 hover:shadow-sm"
                      }`}
                    >
                      <p className="font-medium text-sm truncate dark:text-white">{set.title}</p>
                      <p className="text-xs text-[#64748B] dark:text-gray-400 mt-0.5">{set.cards.length} cards</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedSet ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-[#E2E8F0] dark:border-gray-700 p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0F172A] dark:text-white">{selectedSet.title}</h2>
                    <p className="text-sm text-[#64748B] dark:text-gray-400 mt-1">
                      Card {currentCardIndex + 1} of {selectedSet.cards.length}
                    </p>
                  </div>
                  <Button
                    onClick={regenerateFlashcards}
                    disabled={genLoading}
                    variant="outline"
                    className="border-[#CBD5E1] dark:border-gray-600 text-[#334155] dark:text-gray-300 hover:bg-[#F1F5F9] dark:hover:bg-gray-700"
                  >
                    {genLoading ? "Regenerating..." : "↻ Regenerate"}
                  </Button>
                </div>

                {/* Flip Card with Swipe Gestures */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={(e, info: PanInfo) => {
                    if (Math.abs(info.offset.x) > 100) {
                      handleSwipe(info.offset.x > 0 ? 'right' : 'left')
                    }
                  }}
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="bg-[#2563EB] dark:bg-blue-700 rounded-lg p-8 sm:p-12 min-h-[320px] sm:min-h-96 flex items-center justify-center cursor-pointer shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(37,99,235,0.4)] dark:hover:shadow-[0_25px_50px_-12px_rgba(29,78,216,0.6)] touch-none"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isFlipped ? 'answer' : 'question'}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: -90, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-center text-white"
                    >
                      <p className="text-xs font-semibold mb-4 uppercase tracking-wider opacity-90">{isFlipped ? "Answer" : "Question"}</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-semibold leading-relaxed">
                        {isFlipped
                          ? selectedSet.cards[currentCardIndex].answer
                          : selectedSet.cards[currentCardIndex].question}
                      </p>
                      <p className="text-sm opacity-75 mt-6">Tap to flip • Swipe to navigate</p>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

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
                    onClick={() => {
                      setCurrentCardIndex(Math.min(selectedSet.cards.length - 1, currentCardIndex + 1))
                      setIsFlipped(false)
                    }}
                    disabled={currentCardIndex === selectedSet.cards.length - 1}
                    className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white disabled:opacity-40"
                  >
                    Next →
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-12 text-center shadow-md">
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
      <BottomNavigation />
    </div>
  )
}
