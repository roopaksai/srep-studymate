"use client"

import type React from "react"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import NavigationDropdown from "@/components/NavigationDropdown"

interface Document {
  _id: string
  originalFileName: string
  type: string
  createdAt: string
}

export default function DashboardPage() {
  const { user, token, loading } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [docLoading, setDocLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchDocuments()
    }
  }, [token])

  const fetchDocuments = async () => {
    try {
      setDocLoading(true)
      const res = await fetch("/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        // Handle paginated response structure
        setDocuments(data.data || data.documents || [])
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err)
      setDocuments([]) // Ensure documents is always an array
    } finally {
      setDocLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
      e.target.value = '' // Reset file input
      return
    }

    try {
      setUploadLoading(true)
      setError("")
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "study-material")

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedDocument(data.document.id)
        await fetchDocuments()
        // Scroll to features section after upload
        setTimeout(() => {
          document.getElementById('quick-actions')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 500)
      } else {
        const error = await res.json()
        setError(error.error || "Upload failed")
      }
    } catch (err) {
      setError("Upload failed")
      console.error("Upload error:", err)
    } finally {
      setUploadLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#DEEEEE]">
      {/* Navbar */}
      <nav className="bg-[#0F172A] border-b border-[#1e293b]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <span className="text-lg sm:text-2xl font-bold text-white">SREP StudyMate</span>
          <NavigationDropdown />
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-[#64748B]">Upload documents and access your study tools</p>
        </div>

        <div className="space-y-6">
          {/* Upload Section - Row */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Upload Document</h2>
            <label className="cursor-pointer">
              <div className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-8 text-center hover:border-[#0F172A] hover:bg-[#F8FAFC] transition">
                <svg className="w-12 h-12 mx-auto mb-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-base font-medium text-[#0F172A] mb-1">
                  {uploadLoading ? "Uploading..." : "Click to upload or drag document"}
                </p>
                <p className="text-sm text-[#64748B]">PDF, TXT, or DOCX • Max 10MB</p>
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploadLoading}
                accept=".pdf,.txt,.doc,.docx"
                className="hidden"
              />
            </label>
            {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
          </div>

          {/* Quick Actions - Row */}
          {selectedDocument && (
            <div id="quick-actions" className="bg-white rounded-lg border border-[#E2E8F0] p-6">
              <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Link href={`/app/flashcards?doc=${selectedDocument}`}>
                  <Button className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white justify-start">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                    Flashcards
                  </Button>
                </Link>
                <Link href={`/app/mock-papers?doc=${selectedDocument}`}>
                  <Button className="w-full bg-[#4F46E5] hover:bg-[#4338ca] text-white justify-start">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Mock Papers
                  </Button>
                </Link>
                <Link href={`/app/analysis?doc=${selectedDocument}`}>
                  <Button className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white justify-start">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Reports
                  </Button>
                </Link>
                <Link href="/app/scheduler">
                  <Button className="w-full bg-[#F97316] hover:bg-[#ea580c] text-white justify-start">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Scheduler
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Documents List - Row */}
          <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Your Documents</h2>
            {docLoading ? (
              <p className="text-[#64748B]">Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="text-[#64748B]">No documents uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {documents.filter(doc => doc.type !== 'answer-script').map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => setSelectedDocument(doc._id)}
                    className={`p-3 sm:p-4 rounded-lg cursor-pointer transition border ${
                      selectedDocument === doc._id
                        ? "bg-[#F1F5F9] border-[#0F172A]"
                        : "border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base text-[#0F172A] truncate">{doc.originalFileName}</p>
                        <p className="text-xs sm:text-sm text-[#64748B]">{new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs bg-[#F1F5F9] text-[#334155] px-2 sm:px-3 py-1 rounded-full self-start sm:ml-3 whitespace-nowrap">{doc.type}</span>
                    </div>
                  </div>
                ))}  
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
