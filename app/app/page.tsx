"use client"

import type React from "react"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
        setDocuments(data.documents)
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err)
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
        fetchDocuments()
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold text-white">SREP</span>
          <div className="flex items-center gap-4">
            <span className="text-white">{user.name}</span>
            <Link href="/login">
              <Button
                onClick={() => {
                  localStorage.removeItem("authToken")
                  router.push("/")
                }}
                variant="outline"
                className="bg-white text-orange-600 hover:bg-gray-100"
              >
                Logout
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Sidebar Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-3">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Features</h3>
            <Link href="/app">
              <Button className="w-full justify-start bg-orange-500 hover:bg-orange-600 text-white">Dashboard</Button>
            </Link>
            <Link href="/app/flashcards">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Flashcards
              </Button>
            </Link>
            <Link href="/app/mock-papers">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Mock Papers
              </Button>
            </Link>
            <Link href="/app/analysis">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Analysis
              </Button>
            </Link>
            <Link href="/app/scheduler">
              <Button variant="outline" className="w-full justify-start bg-transparent">
                Scheduler
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Your Document</h2>
            <label className="cursor-pointer">
              <div className="border-2 border-dashed border-orange-300 rounded-2xl p-12 text-center hover:border-orange-500 hover:bg-orange-50 transition">
                <div className="text-5xl mb-4">📄</div>
                <p className="text-lg font-semibold text-gray-700">
                  {uploadLoading ? "Uploading..." : "Click to upload or drag your document"}
                </p>
                <p className="text-sm text-gray-500">PDF, TXT, or DOCX files accepted</p>
              </div>
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploadLoading}
                accept=".pdf,.txt,.doc,.docx"
                className="hidden"
              />
            </label>
            {error && <p className="text-red-600 mt-4">{error}</p>}
          </div>

          {/* Documents List */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Documents</h2>
            {docLoading ? (
              <p className="text-gray-600">Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="text-gray-600">No documents uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    onClick={() => setSelectedDocument(doc._id)}
                    className={`p-4 rounded-lg cursor-pointer transition ${
                      selectedDocument === doc._id
                        ? "bg-orange-100 border-2 border-orange-500"
                        : "bg-gray-50 border-2 border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{doc.originalFileName}</p>
                        <p className="text-sm text-gray-600">{new Date(doc.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded-full">{doc.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {selectedDocument && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href={`/app/flashcards?doc=${selectedDocument}`}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold rounded-xl">
                    Generate Flashcards
                  </Button>
                </Link>
                <Link href={`/app/mock-papers?doc=${selectedDocument}`}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold rounded-xl">
                    Generate Mock Paper
                  </Button>
                </Link>
                <Link href={`/app/analysis?doc=${selectedDocument}`}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold rounded-xl">
                    Analyse Answer
                  </Button>
                </Link>
                <Link href="/app/scheduler">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-semibold rounded-xl">
                    Create Schedule
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
