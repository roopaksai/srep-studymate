"use client"

import type React from "react"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AnalysisReport {
  id: string
  summary: string
  totalScore?: number
  maxScore?: number
  grade?: string
  questionScores?: Array<{
    questionNumber: number
    questionText: string
    scoredMarks: number
    maxMarks: number
    feedback: string
  }>
  strengths: string[]
  weaknesses: string[]
  recommendedTopics: string[]
  createdAt: string
}

export default function AnalysisPage() {
  const { user, token, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const docId = searchParams.get("doc")
  const reportId = searchParams.get("report")
  const [reports, setReports] = useState<AnalysisReport[]>([])
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchReports()
    }
  }, [token])

  useEffect(() => {
    if (reportId && reports.length > 0) {
      const report = reports.find(r => r.id === reportId)
      if (report) {
        setSelectedReport(report)
      }
    }
  }, [reportId, reports])

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/analysis", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports)
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadLoading(true)
      setError("")
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "answer-script")

      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error("Upload failed")
      }

      const uploadData = await uploadRes.json()
      await generateAnalysis(uploadData.document.id)
    } catch (err) {
      setError("Upload failed")
      console.error("Upload error:", err)
    } finally {
      setUploadLoading(false)
    }
  }

  const generateAnalysis = async (documentId: string) => {
    try {
      setGenLoading(true)
      const res = await fetch("/api/analysis/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answerScriptDocumentId: documentId }),
      })

      if (res.ok) {
        const data = await res.json()
        fetchReports()
        setSelectedReport(data.report)
      }
    } catch (err) {
      setError("Analysis generation failed")
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
            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Upload Answer Script</h3>
                <label className="cursor-pointer">
                  <div className="border-2 border-dashed border-orange-300 rounded-lg p-4 text-center hover:border-orange-500 hover:bg-orange-50 transition">
                    <p className="text-sm font-semibold text-gray-700">📤 Upload</p>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadLoading}
                    accept=".pdf,.txt,.doc,.docx"
                    className="hidden"
                  />
                </label>
                {uploadLoading && <p className="text-orange-600 text-sm mt-2">Uploading...</p>}
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">Reports</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {reports.map((report, idx) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-3 rounded-lg cursor-pointer transition text-sm ${
                        selectedReport?.id === report.id
                          ? "bg-orange-100 border-2 border-orange-500"
                          : "bg-gray-50 border-2 border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <p className="font-semibold text-gray-800">Report {idx + 1}</p>
                      <p className="text-xs text-gray-600">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>}

            {selectedReport ? (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-3">Analysis Report</h2>
                      {selectedReport.totalScore !== undefined && (
                        <div className="flex items-center gap-4">
                          <div className="text-4xl font-bold text-orange-600">
                            {selectedReport.totalScore}/{selectedReport.maxScore}
                          </div>
                          <div className="text-xl text-gray-600">
                            ({((selectedReport.totalScore / (selectedReport.maxScore || 1)) * 100).toFixed(1)}%)
                          </div>
                          {selectedReport.grade && (
                            <div className="bg-orange-100 text-orange-700 px-5 py-2 rounded-full text-2xl font-bold">
                              {selectedReport.grade}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 p-5 rounded-lg mb-6">
                    <p className="text-gray-800 font-medium">{selectedReport.summary}</p>
                  </div>

                  {selectedReport.questionScores && selectedReport.questionScores.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">Question-wise Performance</h3>
                      <div className="space-y-3">
                        {selectedReport.questionScores.map((qs, idx) => (
                          <div key={idx} className="border-l-4 border-orange-500 pl-4 py-3 bg-gray-50 rounded">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 mb-1">Q{qs.questionNumber}. {qs.questionText}</p>
                                <p className="text-sm text-gray-600">{qs.feedback}</p>
                              </div>
                              <span className={`px-4 py-1 rounded-full text-sm font-bold ml-4 whitespace-nowrap ${
                                qs.scoredMarks === qs.maxMarks ? 'bg-green-100 text-green-700' :
                                qs.scoredMarks === 0 ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {qs.scoredMarks}/{qs.maxMarks}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
                    <h3 className="text-xl font-bold text-green-700 mb-4">✓ Strengths</h3>
                    <ul className="space-y-2">
                      {selectedReport.strengths.map((strength, idx) => (
                        <li key={idx} className="text-green-700 flex items-start gap-2">
                          <span className="text-green-500 font-bold mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-red-50 rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
                    <h3 className="text-xl font-bold text-red-700 mb-4">⚠ Areas to Improve</h3>
                    <ul className="space-y-2">
                      {selectedReport.weaknesses.map((weakness, idx) => (
                        <li key={idx} className="text-red-700 flex items-start gap-2">
                          <span className="text-red-500 font-bold mt-0.5">•</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-blue-50 rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
                    <h3 className="text-xl font-bold text-blue-700 mb-4">📚 Study Topics</h3>
                    <ul className="space-y-2">
                      {selectedReport.recommendedTopics.map((topic, idx) => (
                        <li key={idx} className="text-blue-700 flex items-start gap-2">
                          <span className="text-blue-500 font-bold mt-0.5">•</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
                  <Link href="/app/scheduler">
                    <Button className="w-full bg-purple-500 hover:bg-purple-600 py-6 text-lg font-semibold">
                      📅 Create Study Schedule Based on This Analysis
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <p className="text-gray-600 mb-4">No analysis reports yet</p>
                {genLoading ? (
                  <p className="text-orange-600">Generating analysis...</p>
                ) : (
                  <p className="text-gray-500">Upload an answer script to get started</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
