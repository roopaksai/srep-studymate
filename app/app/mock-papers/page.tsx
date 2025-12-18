"use client"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import NavigationDropdown from "@/components/NavigationDropdown"
import BottomNavigation from "@/components/BottomNavigation"
import { ContentSkeleton, ListItemSkeleton } from "@/components/SkeletonLoaders"
import QuizProgress from "@/components/QuizProgress"
import Celebration from "@/components/Celebration"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface Question {
  text: string
  marks: number
  type?: string
  options?: string[]
  correctAnswer?: string
}

interface MockPaper {
  id: string
  documentId: string
  title: string
  paperType: 'mcq' | 'descriptive'
  questions: Question[]
  totalMarks: number
  createdAt: string
  quizCompleted?: boolean
  analysisReportId?: string
}

export default function MockPapersPage() {
  const { user, token, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const docId = searchParams.get("doc")
  const [mockPapers, setMockPapers] = useState<MockPaper[]>([])
  const [selectedPaper, setSelectedPaper] = useState<MockPaper | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState("")
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [pendingDocId, setPendingDocId] = useState<string | null>(null)
  const [quizMode, setQuizMode] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<{ questionIndex: number; selectedAnswer: string; skipped: boolean }[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [uploadingAnswer, setUploadingAnswer] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [quizScore, setQuizScore] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchMockPapers()
      if (docId) {
        setPendingDocId(docId)
        setShowTypeSelector(true)
      }
    }
  }, [token, docId])

  const fetchMockPapers = async () => {
    try {
      const res = await fetch("/api/mock-papers", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        // Handle paginated response structure
        setMockPapers(data.data || data.mockPapers || [])
      }
    } catch (err) {
      console.error("Failed to fetch mock papers:", err)
      setMockPapers([]) // Ensure array on error
    }
  }

  const generateMockPaper = async (documentId: string, questionType: 'mcq' | 'descriptive' | 'mixed', reattempt = false) => {
    try {
      setGenLoading(true)
      setError("")
      setShowTypeSelector(false)
      
      const res = await fetch("/api/mock-papers/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          documentId, 
          title: `${questionType.toUpperCase()} Mock Paper`,
          questionType,
          reattempt 
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newPaper = data.mockPaper
        const isExisting = data.isExisting
        
        // Fetch updated list and then select the new paper
        await fetchMockPapers()
        
        // Set the newly generated paper as selected
        setSelectedPaper(newPaper)
        
        // Reset quiz mode states to show the Start Quiz button
        setQuizMode(false)
        setCurrentQuestionIndex(0)
        setUserAnswers([])
        setSelectedOption(null)
        
        // Show message if existing paper was returned
        if (isExisting && !reattempt) {
          toast.success(`Using existing ${questionType} paper for this document. Click "Regenerate" to create a new one.`, { duration: 4000 })
        } else {
          toast.success('Mock paper generated successfully!')
        }
      } else {
        const err = await res.json()
        toast.error(err.error || "Generation failed")
      }
    } catch (err) {
      toast.error("Generation failed. Please try again.")
    } finally {
      setGenLoading(false)
    }
  }

  const startQuiz = () => {
    setQuizMode(true)
    setCurrentQuestionIndex(0)
    setUserAnswers([])
    setSelectedOption(null)
  }

  const handleAnswerSelect = (option: string) => {
    setSelectedOption(option)
  }

  const handleNext = () => {
    if (selectedPaper && currentQuestionIndex < selectedPaper.questions.length) {
      const newAnswer = {
        questionIndex: currentQuestionIndex,
        selectedAnswer: selectedOption || "",
        skipped: !selectedOption,
      }
      setUserAnswers([...userAnswers, newAnswer])
      
      if (currentQuestionIndex < selectedPaper.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setSelectedOption(null)
      } else {
        submitQuiz([...userAnswers, newAnswer])
      }
    }
  }

  const handleSkip = () => {
    if (selectedPaper && currentQuestionIndex < selectedPaper.questions.length) {
      const newAnswer = {
        questionIndex: currentQuestionIndex,
        selectedAnswer: "",
        skipped: true,
      }
      setUserAnswers([...userAnswers, newAnswer])
      
      if (currentQuestionIndex < selectedPaper.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setSelectedOption(null)
      } else {
        submitQuiz([...userAnswers, newAnswer])
      }
    }
  }

  const submitQuiz = async (answers: any[]) => {
    try {
      const res = await fetch("/api/mock-papers/submit-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mockPaperId: selectedPaper?.id,
          userAnswers: answers,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Calculate score
        const correctAnswers = answers.filter((a, idx) => 
          !a.skipped && selectedPaper?.questions[idx]?.correctAnswer === a.selectedAnswer
        ).length
        const scorePercent = Math.round((correctAnswers / (selectedPaper?.questions.length || 1)) * 100)
        
        setQuizScore(scorePercent)
        setShowCelebration(true)
        
        // Hide celebration and navigate after 3 seconds
        setTimeout(() => {
          setShowCelebration(false)
          toast.success('Quiz submitted successfully!')
          setQuizMode(false)
          router.push(`/app/analysis?report=${data.analysisReportId}`)
        }, 3000)
      } else {
        const err = await res.json()
        toast.error(err.error || "Quiz submission failed")
      }
    } catch (err) {
      toast.error("Quiz submission failed. Please try again.")
    }
  }

  const handleAnswerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPaper) return

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
      e.target.value = '' // Reset file input
      return
    }

    try {
      setUploadingAnswer(true)
      setError("")
      
      const formData = new FormData()
      formData.append("file", file)
      formData.append("mockPaperId", selectedPaper.id)

      const res = await fetch("/api/mock-papers/upload-answer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Answer uploaded successfully!')
        router.push(`/app/analysis?report=${data.analysisReportId}`)
      } else {
        const err = await res.json()
        toast.error(err.error || "Upload failed")
      }
    } catch (err) {
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploadingAnswer(false)
    }
  }

  const handlePaperSelection = (paper: MockPaper) => {
    setSelectedPaper(paper)
    // Reset quiz mode when selecting a different paper
    setQuizMode(false)
    setCurrentQuestionIndex(0)
    setUserAnswers([])
    setSelectedOption(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#DEEEEE]">
      <nav className="bg-gradient-to-r from-indigo-500 to-indigo-700 border-b border-indigo-400">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <Link href="/app">
            <span className="text-lg sm:text-xl font-bold text-white cursor-pointer">SREP StudyMate</span>
          </Link>
          <NavigationDropdown />
        </div>
      </nav>
      <ContentSkeleton />
      <BottomNavigation />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#DEEEEE] dark:bg-gray-900">
      <nav className="bg-gradient-to-r from-indigo-500 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900 border-b border-indigo-400 dark:border-indigo-900">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <Link href="/app">
            <span className="text-lg sm:text-xl font-bold text-white cursor-pointer">SREP StudyMate</span>
          </Link>
          <NavigationDropdown />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-white mb-1">Mock Papers</h1>
          <p className="text-sm sm:text-base text-[#64748B] dark:text-gray-400">Generate and practice with mock papers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-[#E2E8F0] dark:border-gray-700 p-4 lg:p-5 shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-white mb-3 uppercase tracking-wide">Your Papers</h3>
              <div className="space-y-2 max-h-64 lg:max-h-96 overflow-y-auto">
                {mockPapers.length === 0 ? (
                  <p className="text-sm text-[#64748B] text-center py-4">No papers yet</p>
                ) : (
                  mockPapers.map((paper) => (
                    <div
                      key={paper.id}
                      onClick={() => handlePaperSelection(paper)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedPaper?.id === paper.id
                          ? "bg-indigo-50 border-[#4F46E5] text-[#4F46E5] shadow-md"
                          : "border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:shadow-sm"
                      }`}
                    >
                      <p className="font-medium text-sm truncate">{paper.title}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {paper.questions.length} questions • {paper.totalMarks} marks
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">

            {/* Question Type Selector Modal */}
            {showTypeSelector && pendingDocId && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Select Question Type</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">Choose the type of questions for your mock paper:</p>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => generateMockPaper(pendingDocId, 'mcq')}
                      className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-[#4F46E5] rounded-lg text-left transition"
                    >
                      <div className="font-semibold text-gray-800">MCQ (Multiple Choice)</div>
                      <div className="text-sm text-gray-600">10 questions • 4 marks each</div>
                    </button>
                    
                    <button
                      onClick={() => generateMockPaper(pendingDocId, 'descriptive')}
                      className="w-full p-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-[#4F46E5] rounded-lg text-left transition"
                    >
                      <div className="font-semibold text-gray-800">Descriptive (Long Answer)</div>
                      <div className="text-sm text-gray-600">8 questions • 8-15 marks each</div>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowTypeSelector(false)
                      setPendingDocId(null)
                    }}
                    className="w-full mt-4 p-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-xl font-semibold text-gray-700 dark:text-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {selectedPaper ? (
              quizMode && selectedPaper.paperType === 'mcq' ? (
                // MCQ Quiz Interface
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">{selectedPaper.title}</h2>
                  
                  {/* Enhanced Quiz Progress */}
                  <QuizProgress 
                    current={currentQuestionIndex}
                    total={selectedPaper.questions.length}
                    answered={userAnswers.filter(a => !a.skipped).length}
                  />

                  {selectedPaper.questions[currentQuestionIndex] && (
                    <div className="space-y-6">
                      <div className="bg-indigo-50 p-4 sm:p-6 rounded-lg border border-[#E2E8F0]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-[#0F172A] flex-1 leading-relaxed">
                            {selectedPaper.questions[currentQuestionIndex].text}
                          </h3>
                          <span className="bg-[#4F46E5] text-white px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
                            {selectedPaper.questions[currentQuestionIndex].marks} marks
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {selectedPaper.questions[currentQuestionIndex].options?.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAnswerSelect(String.fromCharCode(65 + idx))}
                            className={`w-full p-4 rounded-xl text-left transition border-2 ${
                              selectedOption === String.fromCharCode(65 + idx)
                                ? "bg-indigo-100 border-[#4F46E5]"
                                : "bg-white border-[#CBD5E1] hover:border-[#4F46E5]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="font-bold text-orange-600 text-lg">{String.fromCharCode(65 + idx)}.</span>
                              <span className="text-gray-800 dark:text-white">{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-4 pt-6">
                        <Button
                          onClick={handleSkip}
                          variant="outline"
                          className="flex-1 py-6 text-lg"
                        >
                          Skip
                        </Button>
                        <Button
                          onClick={handleNext}
                          disabled={!selectedOption}
                          className="flex-1 bg-[#4F46E5] hover:bg-[#4338ca] py-6 text-lg"
                        >
                          {currentQuestionIndex < selectedPaper.questions.length - 1 ? "Next" : "Submit Quiz"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Paper View (Descriptive or MCQ not started)
                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-8">
                  <div className="mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{selectedPaper.title}</h2>
                      <div className="flex gap-2 items-center w-full sm:w-auto">
                        <span className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                          selectedPaper.paperType === 'mcq' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {selectedPaper.paperType === 'mcq' ? 'MCQ Quiz' : 'Descriptive'}
                        </span>
                        <Button
                          onClick={() => {
                            generateMockPaper(selectedPaper.documentId, selectedPaper.paperType, true)
                          }}
                          variant="outline"
                          className="text-xs sm:text-sm flex-1 sm:flex-none"
                          disabled={genLoading}
                        >
                          {genLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /><span className="hidden sm:inline ml-1">Regenerating...</span></>
                          ) : (
                            <>🔄<span className="hidden sm:inline ml-1">Regenerate</span></>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-gray-600 dark:text-gray-400">
                      <span>Questions: {selectedPaper.questions.length}</span>
                      <span>Total Marks: {selectedPaper.totalMarks}</span>
                    </div>
                  </div>

                  {selectedPaper.paperType === 'mcq' && !selectedPaper.quizCompleted ? (
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-8 rounded-xl text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Ready to Start Quiz?</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        This quiz has {selectedPaper.questions.length} multiple choice questions. 
                        You can select an answer or skip each question. Your score will be calculated automatically.
                      </p>
                      <Button
                        onClick={startQuiz}
                        className="bg-[#16A34A] hover:bg-[#15803d] px-8 py-6 text-lg"
                      >
                        Start Quiz
                      </Button>
                    </div>
                  ) : selectedPaper.paperType === 'descriptive' && !selectedPaper.analysisReportId ? (
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-8 rounded-xl mb-6">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Upload Your Answer Script</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        After completing the questions, upload your answer script (PDF/DOCX/TXT) for AI-powered analysis and scoring.
                      </p>
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-50 transition">
                          <div className="text-4xl mb-3">📄</div>
                          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {uploadingAnswer ? "Analyzing..." : "Click to upload answer script"}
                          </p>
                          <p className="text-sm text-gray-500">PDF, DOCX, or TXT files</p>
                        </div>
                        <input
                          type="file"
                          onChange={handleAnswerUpload}
                          disabled={uploadingAnswer}
                          accept=".pdf,.txt,.doc,.docx"
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : selectedPaper.analysisReportId ? (
                    <div className="bg-green-50 p-6 rounded-xl text-center mb-6">
                      <p className="text-green-700 font-semibold mb-3">✓ Analysis Complete!</p>
                      <Link href={`/app/analysis?report=${selectedPaper.analysisReportId}`}>
                        <Button className="bg-green-600 hover:bg-green-700">
                          View Analysis Report
                        </Button>
                      </Link>
                    </div>
                  ) : null}

                  {/* Only show questions for Descriptive papers, not for MCQ */}
                  {selectedPaper.paperType === 'descriptive' && (
                    <>
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Questions:</h3>
                        {selectedPaper.questions.map((question, idx) => (
                          <div key={idx} className="border-l-4 border-orange-500 pl-4 py-3 bg-gray-50 rounded">
                            <div className="flex justify-between items-start">
                              <p className="font-semibold text-gray-800 dark:text-white flex-1">
                                Q{idx + 1}. {question.text}
                              </p>
                              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold ml-4">
                                {question.marks} marks
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Estimated time: {selectedPaper.questions.length * 10} minutes
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <p className="text-gray-600 mb-4">No mock papers yet</p>
                {genLoading ? (
                  <p className="text-orange-600">Generating mock paper...</p>
                ) : (
                  <p className="text-gray-500">Upload a document and click "Generate Mock Paper" to get started</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNavigation />
      <Celebration show={showCelebration} score={quizScore} />
    </div>
  )
}
