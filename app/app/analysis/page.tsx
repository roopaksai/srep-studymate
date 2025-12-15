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
                {/* Title */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center uppercase tracking-wide">
                    Answers Report
                  </h1>

                  {/* Score, Grade, Percentage Display */}
                  {selectedReport.totalScore !== undefined && (
                    <div className="grid grid-cols-3 gap-6 mb-8">
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center border border-orange-200">
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Score</p>
                        <p className="text-4xl font-bold text-orange-600">
                          {selectedReport.totalScore}/{selectedReport.maxScore}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border border-blue-200">
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Grade</p>
                        <p className="text-4xl font-bold text-blue-600">
                          {selectedReport.grade || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border border-purple-200">
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Percentage</p>
                        <p className="text-4xl font-bold text-purple-600">
                          {((selectedReport.totalScore / (selectedReport.maxScore || 1)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mini Bar: Correct/Wrong/Skipped */}
                  {selectedReport.questionScores && selectedReport.questionScores.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6 mb-8">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Correct</span>
                            <span className="text-sm font-bold text-green-600">
                              {selectedReport.questionScores.filter(q => q.scoredMarks === q.maxMarks).length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-green-500 h-3 rounded-full"
                              style={{
                                width: `${(selectedReport.questionScores.filter(q => q.scoredMarks === q.maxMarks).length / selectedReport.questionScores.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Wrong</span>
                            <span className="text-sm font-bold text-red-600">
                              {selectedReport.questionScores.filter(q => q.scoredMarks === 0).length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-red-500 h-3 rounded-full"
                              style={{
                                width: `${(selectedReport.questionScores.filter(q => q.scoredMarks === 0).length / selectedReport.questionScores.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Partial</span>
                            <span className="text-sm font-bold text-yellow-600">
                              {selectedReport.questionScores.filter(q => q.scoredMarks > 0 && q.scoredMarks < q.maxMarks).length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-yellow-500 h-3 rounded-full"
                              style={{
                                width: `${(selectedReport.questionScores.filter(q => q.scoredMarks > 0 && q.scoredMarks < q.maxMarks).length / selectedReport.questionScores.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Question-wise Performance */}
                  {selectedReport.questionScores && selectedReport.questionScores.length > 0 && (
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">Question-wise Performance</h2>
                      <div className="space-y-4">
                        {selectedReport.questionScores.map((qs, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-bold">
                                    Q{qs.questionNumber}
                                  </span>
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    qs.scoredMarks === qs.maxMarks ? 'bg-green-100 text-green-700' :
                                    qs.scoredMarks === 0 ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {qs.scoredMarks}/{qs.maxMarks}
                                  </span>
                                </div>
                                <p className="text-gray-800 font-medium mb-2">{qs.questionText}</p>
                                <p className="text-sm text-gray-600 leading-relaxed">{qs.feedback}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths Row - Topics Only */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">💪 Strengths</h2>
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                      <div className="flex flex-wrap gap-3">
                        {selectedReport.strengths && selectedReport.strengths.length > 0 ? (
                          selectedReport.strengths.map((strength, idx) => (
                            <span key={idx} className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold border border-green-300">
                              {strength}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-600">No specific strengths identified</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Areas to Improve Row - Topics Only */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">📈 Areas to Improve</h2>
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6">
                      <div className="flex flex-wrap gap-3">
                        {selectedReport.weaknesses && selectedReport.weaknesses.length > 0 ? (
                          selectedReport.weaknesses.map((weakness, idx) => (
                            <span key={idx} className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm font-semibold border border-red-300">
                              {weakness}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-600">No specific areas to improve identified</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Buttons */}
                  <div className="flex gap-4 pt-6 border-t border-gray-200">
                    <Button 
                      onClick={() => window.print()}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-6 text-lg font-semibold shadow-lg"
                    >
                      📄 Download Report
                    </Button>
                    <Link href="/app/scheduler" className="flex-1">
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-6 text-lg font-semibold shadow-lg">
                        📅 Schedule Timetable
                      </Button>
                    </Link>
                  </div>
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
