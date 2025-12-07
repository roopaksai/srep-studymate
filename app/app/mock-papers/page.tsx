"use client"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Question {
  text: string
  marks: number
}

interface MockPaper {
  id: string
  title: string
  questions: Question[]
  totalMarks: number
  createdAt: string
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

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchMockPapers()
      if (docId) {
        generateMockPaper(docId)
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

  const generateMockPaper = async (documentId: string) => {
    try {
      setGenLoading(true)
      setError("")
      const res = await fetch("/api/mock-papers/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId, title: "Mock Paper" }),
      })

      if (res.ok) {
        const data = await res.json()
        fetchMockPapers()
        setSelectedPaper(data.mockPaper)
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
                    onClick={() => setSelectedPaper(paper)}
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

            {selectedPaper ? (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedPaper.title}</h2>
                  <div className="flex gap-4 text-gray-600">
                    <span>Questions: {selectedPaper.questions.length}</span>
                    <span>Total Marks: {selectedPaper.totalMarks}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedPaper.questions.map((question, idx) => (
                    <div key={idx} className="border-l-4 border-orange-500 pl-4 py-2">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-lg text-gray-800">
                          Q{idx + 1}. {question.text}
                        </p>
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                          {question.marks} marks
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Total Duration: {selectedPaper.questions.length * 5} minutes (approximately)
                  </p>
                </div>
              </div>
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
