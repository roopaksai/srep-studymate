"use client"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
        setMockPapers(data.mockPapers)
      }
    } catch (err) {
      console.error("Failed to fetch mock papers:", err)
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
          setError(`Using existing ${questionType} paper for this document. Click "Regenerate" to create a new one.`)
        }
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
        setQuizMode(false)
        router.push(`/app/analysis?report=${data.analysisReportId}`)
      } else {
        const err = await res.json()
        setError(err.error || "Quiz submission failed")
      }
    } catch (err) {
      setError("Quiz submission failed")
    }
  }

  const handleAnswerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedPaper) return

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
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
        router.push(`/app/analysis?report=${data.analysisReportId}`)
      } else {
        const err = await res.json()
        setError(err.error || "Upload failed")
      }
    } catch (err) {
      setError("Upload failed")
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
              <h3 className="text-lg font-bold text-gray-800 mb-4">Mock Papers</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mockPapers.map((paper) => (
                  <div
                    key={paper.id}
                    onClick={() => handlePaperSelection(paper)}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedPaper?.id === paper.id
                        ? "bg-orange-100 border-2 border-orange-500"
                        : "bg-gray-50 border-2 border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-800">{paper.title}</p>
                    <p className="text-xs text-gray-600">
                      {paper.questions.length} questions • {paper.totalMarks} marks
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

            {/* Question Type Selector Modal */}
            {showTypeSelector && pendingDocId && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">Select Question Type</h3>
                  <p className="text-gray-600 mb-6">Choose the type of questions for your mock paper:</p>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => generateMockPaper(pendingDocId, 'mcq')}
                      className="w-full p-4 bg-orange-50 hover:bg-orange-100 border-2 border-orange-300 rounded-xl text-left transition"
                    >
                      <div className="font-semibold text-gray-800">MCQ (Multiple Choice)</div>
                      <div className="text-sm text-gray-600">10 questions • 4 marks each</div>
                    </button>
                    
                    <button
                      onClick={() => generateMockPaper(pendingDocId, 'descriptive')}
                      className="w-full p-4 bg-orange-50 hover:bg-orange-100 border-2 border-orange-300 rounded-xl text-left transition"
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
                    className="w-full mt-4 p-3 bg-gray-200 hover:bg-gray-300 rounded-xl font-semibold text-gray-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {selectedPaper ? (
              quizMode && selectedPaper.paperType === 'mcq' ? (
                // MCQ Quiz Interface
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-gray-800">{selectedPaper.title}</h2>
                      <span className="bg-orange-100 text-orange-700 px-4 py-2 rounded-full font-semibold">
                        Question {currentQuestionIndex + 1} / {selectedPaper.questions.length}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${((currentQuestionIndex + 1) / selectedPaper.questions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {selectedPaper.questions[currentQuestionIndex] && (
                    <div className="space-y-6">
                      <div className="bg-orange-50 p-6 rounded-xl">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-semibold text-gray-800 flex-1">
                            {selectedPaper.questions[currentQuestionIndex].text}
                          </h3>
                          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold ml-4">
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
                                ? "bg-orange-100 border-orange-500"
                                : "bg-gray-50 border-gray-200 hover:border-orange-300"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="font-bold text-orange-600 text-lg">{String.fromCharCode(65 + idx)}.</span>
                              <span className="text-gray-800">{option}</span>
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
                          className="flex-1 bg-orange-500 hover:bg-orange-600 py-6 text-lg"
                        >
                          {currentQuestionIndex < selectedPaper.questions.length - 1 ? "Next" : "Submit Quiz"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Paper View (Descriptive or MCQ not started)
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-2xl font-bold text-gray-800">{selectedPaper.title}</h2>
                      <div className="flex gap-2 items-center">
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          selectedPaper.paperType === 'mcq' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {selectedPaper.paperType === 'mcq' ? 'MCQ Quiz' : 'Descriptive'}
                        </span>
                        <Button
                          onClick={() => {
                            generateMockPaper(selectedPaper.documentId, selectedPaper.paperType, true)
                          }}
                          variant="outline"
                          className="text-sm"
                          disabled={genLoading}
                        >
                          {genLoading ? "Regenerating..." : "🔄 Regenerate"}
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-gray-600">
                      <span>Questions: {selectedPaper.questions.length}</span>
                      <span>Total Marks: {selectedPaper.totalMarks}</span>
                    </div>
                  </div>

                  {selectedPaper.paperType === 'mcq' && !selectedPaper.quizCompleted ? (
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-8 rounded-xl text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to Start Quiz?</h3>
                      <p className="text-gray-600 mb-6">
                        This quiz has {selectedPaper.questions.length} multiple choice questions. 
                        You can select an answer or skip each question. Your score will be calculated automatically.
                      </p>
                      <Button
                        onClick={startQuiz}
                        className="bg-orange-500 hover:bg-orange-600 px-8 py-6 text-lg"
                      >
                        Start Quiz
                      </Button>
                    </div>
                  ) : selectedPaper.paperType === 'descriptive' && !selectedPaper.analysisReportId ? (
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-8 rounded-xl mb-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Upload Your Answer Script</h3>
                      <p className="text-gray-600 mb-6">
                        After completing the questions, upload your answer script (PDF/DOCX/TXT) for AI-powered analysis and scoring.
                      </p>
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-purple-300 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-50 transition">
                          <div className="text-4xl mb-3">📄</div>
                          <p className="text-lg font-semibold text-gray-700 mb-2">
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
                        <h3 className="text-lg font-bold text-gray-800">Questions:</h3>
                        {selectedPaper.questions.map((question, idx) => (
                          <div key={idx} className="border-l-4 border-orange-500 pl-4 py-3 bg-gray-50 rounded">
                            <div className="flex justify-between items-start">
                              <p className="font-semibold text-gray-800 flex-1">
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
    </div>
  )
}
