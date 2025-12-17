"use client"

import type React from "react"
import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { exportAnalysisReportToPDF } from "@/lib/pdfExport"
import NavigationDropdown from "@/components/NavigationDropdown"
import BottomNavigation from "@/components/BottomNavigation"
import { ContentSkeleton } from "@/components/SkeletonLoaders"
import toast from "react-hot-toast"

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
        // Handle paginated response structure
        setReports(data.data || data.reports || [])
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err)
      setReports([]) // Ensure array on error
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
      toast.error("Upload failed. Please try again.")
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
        toast.success('Analysis report generated successfully!')
        fetchReports()
        setSelectedReport(data.report)
      } else {
        toast.error('Analysis generation failed')
      }
    } catch (err) {
      toast.error("Analysis generation failed. Please try again.")
    } finally {
      setGenLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#DEEEEE]">
      <nav className="bg-[#16A34A] border-b border-[#15803d]">
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
    <div className="min-h-screen bg-[#DEEEEE]">
      <nav className="bg-[#16A34A] border-b border-[#15803d]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex justify-between items-center">
          <Link href="/app">
            <span className="text-lg sm:text-xl font-bold text-white cursor-pointer">SREP StudyMate</span>
          </Link>
          <NavigationDropdown />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-1">Reports & Analysis</h1>
          <p className="text-sm sm:text-base text-[#64748B]">Upload answer scripts and get detailed analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-[#E2E8F0] p-5 shadow-md hover:shadow-lg transition-shadow duration-300">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3 uppercase tracking-wide">Your Reports</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {reports.length === 0 ? (
                  <p className="text-sm text-[#64748B] text-center py-4">No reports yet</p>
                ) : (
                  reports.map((report, idx) => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                        selectedReport?.id === report.id
                          ? "bg-green-50 border-[#16A34A] text-[#16A34A] shadow-md"
                          : "border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:shadow-sm"
                      }`}
                    >
                      <p className="font-medium text-sm">Report {idx + 1}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">

            {selectedReport ? (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 sm:p-8 space-y-6 shadow-md hover:shadow-lg transition-shadow duration-300">
                {/* Title */}
                <div className="text-center border-b border-[#E2E8F0] pb-6">
                  <h2 className="text-2xl font-bold text-[#0F172A]">Performance Analysis</h2>
                  <p className="text-sm text-[#64748B] mt-1">Detailed breakdown of your results</p>
                </div>

                {/* Score, Grade, Percentage Display */}
                {selectedReport.totalScore !== undefined && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-5 text-center border border-[#E2E8F0]">
                      <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Score</p>
                      <p className="text-3xl font-bold text-[#16A34A]">
                        {selectedReport.totalScore}/{selectedReport.maxScore}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 text-center border border-blue-200">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Grade</p>
                        <p className="text-3xl sm:text-4xl font-bold text-blue-600">
                          {selectedReport.grade || 'N/A'}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 sm:p-6 text-center border border-purple-200">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">Percentage</p>
                        <p className="text-3xl sm:text-4xl font-bold text-purple-600">
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
                              {selectedReport.questionScores.filter(q => q.scoredMarks === q.maxMarks && q.feedback !== "Question skipped").length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-green-500 h-3 rounded-full"
                              style={{
                                width: `${(selectedReport.questionScores.filter(q => q.scoredMarks === q.maxMarks && q.feedback !== "Question skipped").length / selectedReport.questionScores.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Wrong</span>
                            <span className="text-sm font-bold text-red-600">
                              {selectedReport.questionScores.filter(q => q.scoredMarks === 0 && q.feedback !== "Question skipped").length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-red-500 h-3 rounded-full"
                              style={{
                                width: `${(selectedReport.questionScores.filter(q => q.scoredMarks === 0 && q.feedback !== "Question skipped").length / selectedReport.questionScores.length) * 100}%`
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600">Skipped</span>
                            <span className="text-sm font-bold text-gray-600">
                              {selectedReport.questionScores.filter(q => q.feedback === "Question skipped").length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-gray-400 h-3 rounded-full"
                              style={{
                                width: `${(selectedReport.questionScores.filter(q => q.feedback === "Question skipped").length / selectedReport.questionScores.length) * 100}%`
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
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#E2E8F0]">
                    <Button 
                      onClick={() => exportAnalysisReportToPDF(selectedReport)}
                      className="flex-1 bg-[#0F172A] hover:bg-[#1e293b] text-white py-4 font-semibold"
                    >
                      Download PDF Report
                    </Button>
                    <Link 
                      href={`/app/scheduler?weakTopics=${encodeURIComponent(JSON.stringify(selectedReport.weaknesses))}`} 
                      className="flex-1"
                    >
                      <Button className="w-full bg-[#F97316] hover:bg-[#ea580c] text-white py-4 font-semibold">
                        Create Study Schedule
                      </Button>
                    </Link>
                  </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#E2E8F0] p-12 text-center shadow-md">
                <svg className="w-16 h-16 mx-auto mb-4 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-[#334155] font-medium mb-2">No analysis reports yet</p>
                {genLoading ? (
                  <p className="text-[#16A34A]">Generating analysis...</p>
                ) : (
                  <p className="text-[#64748B] text-sm">Upload an answer script to get started</p>
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
