"use client"

import type React from "react"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import NavigationDropdown from "@/components/NavigationDropdown"
import BottomNavigation from "@/components/BottomNavigation"
import { DashboardSkeleton, DocumentSkeleton } from "@/components/SkeletonLoaders"
import FileUploadZone from "@/components/FileUploadZone"
import EmptyState from "@/components/EmptyState"
import PullToRefresh from "@/components/PullToRefresh"
import ThemeToggle from "@/components/ThemeToggle"
import QuickStats from "@/components/QuickStats"
import ProgressTracking from "@/components/ProgressTracking"
import toast from "react-hot-toast"
import { motion } from "framer-motion"
import { LayoutGrid, List } from "lucide-react"

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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [flashcardsCount, setFlashcardsCount] = useState(0)
  const [papersCount, setPapersCount] = useState(0)
  const [activities, setActivities] = useState<any[]>([])
  const [goals] = useState([
    { id: "1", title: "Weekly Study Hours", target: 20, current: 12, unit: "hours", color: "blue-500", darkColor: "blue-700" },
    { id: "2", title: "Practice Tests", target: 5, current: 3, unit: "tests", color: "indigo-500", darkColor: "indigo-700" },
    { id: "3", title: "Topics Mastered", target: 10, current: 7, unit: "topics", color: "green-500", darkColor: "green-700" },
  ])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchDocuments()
      fetchStats()
      fetchActivities()
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

  const fetchStats = async () => {
    try {
      const [flashcardsRes, papersRes] = await Promise.all([
        fetch("/api/flashcards", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/mock-papers", { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      if (flashcardsRes.ok) {
        const data = await flashcardsRes.json()
        setFlashcardsCount((data.data || data.flashcardSets || []).length)
      }
      
      if (papersRes.ok) {
        const data = await papersRes.json()
        setPapersCount((data.data || data.mockPapers || []).length)
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err)
    }
  }

  const fetchActivities = async () => {
    try {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentActivities: any[] = []
      
      // Add recent documents
      const docsRes = await fetch("/api/documents", { headers: { Authorization: `Bearer ${token}` } })
      if (docsRes.ok) {
        const data = await docsRes.json()
        const docs = (data.data || data.documents || [])
          .filter((doc: any) => new Date(doc.createdAt) > sevenDaysAgo)
          .map((doc: any) => ({
            type: "document",
            title: `Uploaded ${doc.originalFileName}`,
            timestamp: new Date(doc.createdAt)
          }))
        recentActivities.push(...docs)
      }
      
      // Add recent flashcards
      const flashcardsRes = await fetch("/api/flashcards", { headers: { Authorization: `Bearer ${token}` } })
      if (flashcardsRes.ok) {
        const data = await flashcardsRes.json()
        const sets = (data.data || data.flashcardSets || [])
          .filter((set: any) => new Date(set.createdAt) > sevenDaysAgo)
          .map((set: any) => ({
            type: "flashcard",
            title: `Created ${set.title}`,
            timestamp: new Date(set.createdAt)
          }))
        recentActivities.push(...sets)
      }
      
      // Sort by timestamp descending
      recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setActivities(recentActivities)
    } catch (err) {
      console.error("Failed to fetch activities:", err)
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!file) return

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`)
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
        toast.success('Document uploaded successfully!')
        await fetchDocuments()
        // Scroll to features section after upload
        setTimeout(() => {
          document.getElementById('quick-actions')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 500)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Upload failed')
      }
    } catch (err) {
      toast.error('Upload failed. Please try again.')
      console.error("Upload error:", err)
    } finally {
      setUploadLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#DEEEEE]">
        <nav className="bg-[#0F172A] border-b border-[#1e293b]">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
            <span className="text-lg sm:text-2xl font-bold text-white">SREP StudyMate</span>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <DashboardSkeleton />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleRefresh = async () => {
    await Promise.all([fetchDocuments(), fetchStats(), fetchActivities()])
    toast.success('Dashboard refreshed!')
  }

  return (
    <div className="min-h-screen bg-[#DEEEEE] dark:bg-gray-900">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-slate-600 to-slate-800 dark:from-slate-700 dark:to-slate-900 border-b border-slate-500 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex justify-between items-center">
          <span className="text-lg sm:text-2xl font-bold text-white">SREP StudyMate</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NavigationDropdown />
          </div>
        </div>
      </nav>

      {/* Main Content with Pull to Refresh */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-7xl mx-auto px-4 py-4 pb-24">
          <div className="mb-4">
            <h1 className="text-2xl font-extrabold text-[#0F172A] dark:text-white mb-1 tracking-tight leading-tight">Dashboard</h1>
            <p className="text-sm text-[#64748B] dark:text-gray-400">Track your progress and study materials</p>
          </div>

          <div className="space-y-4">
            {/* Upload Section - First Priority */}
            <motion.div 
              whileTap={{ scale: 0.99 }}
              className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-[#E2E8F0]/50 dark:border-gray-700/50 p-5 shadow-lg active:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Glass Shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <h2 className="relative text-lg font-bold text-[#0F172A] dark:text-white mb-4 tracking-tight leading-tight">Upload Document</h2>
              <div className="relative">
                <FileUploadZone
                  onUpload={handleFileUpload}
                  loading={uploadLoading}
                  accept=".pdf,.txt,.doc,.docx"
                  maxSize={10}
                />
              </div>
            </motion.div>

            {/* Quick Actions */}
            {selectedDocument && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                id="quick-actions" 
                className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-[#E2E8F0]/50 dark:border-gray-700/50 p-5 shadow-lg active:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Glass Shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                <h3 className="relative text-lg font-bold text-[#0F172A] dark:text-white mb-4 tracking-tight leading-tight">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                <Link href={`/app/flashcards?doc=${selectedDocument}`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-xl cursor-pointer group active:scale-95 transition-transform"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 opacity-100" />
                    <div className="relative p-4 text-white min-h-[90px] flex flex-col justify-between">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      <div>
                        <h4 className="text-lg font-bold tracking-tight mb-0.5">Flashcards</h4>
                        <p className="text-sm opacity-90">Generate study cards</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
                <Link href={`/app/mock-papers?doc=${selectedDocument}`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-xl cursor-pointer group active:scale-95 transition-transform"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 opacity-100" />
                    <div className="relative p-4 text-white min-h-[90px] flex flex-col justify-between">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <h4 className="text-lg font-bold tracking-tight mb-0.5">Mock Papers</h4>
                        <p className="text-sm opacity-90">Practice tests</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
                <Link href={`/app/analysis?doc=${selectedDocument}`}>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-xl cursor-pointer group active:scale-95 transition-transform"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-700 opacity-100" />
                    <div className="relative p-4 text-white min-h-[90px] flex flex-col justify-between">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <div>
                        <h4 className="text-lg font-bold tracking-tight mb-0.5">Reports</h4>
                        <p className="text-sm opacity-90">Performance analysis</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
                <Link href="/app/scheduler">
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="relative overflow-hidden rounded-xl cursor-pointer group active:scale-95 transition-transform"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-700 opacity-100" />
                    <div className="relative p-4 text-white min-h-[90px] flex flex-col justify-between">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <h4 className="text-lg font-bold tracking-tight mb-0.5">Scheduler</h4>
                        <p className="text-sm opacity-90">Plan your study</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </div>
              </motion.div>
            )}

            {/* Documents List */}
            <motion.div 
              whileTap={{ scale: 0.99 }}
              className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-[#E2E8F0]/50 dark:border-gray-700/50 p-5 shadow-lg active:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Glass Shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-white tracking-tight leading-tight">Your Documents</h2>
                <div className="flex items-center gap-2 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-md rounded-xl p-1.5 border border-gray-200/30 dark:border-gray-600/30">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2.5 rounded-lg transition-all duration-200 ${
                      viewMode === "list"
                        ? "bg-white/90 dark:bg-gray-600/90 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-300"
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2.5 rounded-lg transition-all duration-200 ${
                      viewMode === "grid"
                        ? "bg-white/90 dark:bg-gray-600/90 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-300"
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {docLoading ? (
                <div className="space-y-2">
                  <DocumentSkeleton />
                  <DocumentSkeleton />
                  <DocumentSkeleton />
                </div>
              ) : documents.length === 0 ? (
                <EmptyState type="documents" />
              ) : viewMode === "list" ? (
                <div className="space-y-2.5">
                  {documents.filter(doc => doc.type !== 'answer-script').map((doc) => (
                    <motion.div
                      key={doc._id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDocument(doc._id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border backdrop-blur-md ${
                        selectedDocument === doc._id
                          ? "bg-[#F1F5F9]/90 dark:bg-gray-700/90 border-[#0F172A] dark:border-blue-500 shadow-md"
                          : "bg-white/60 dark:bg-gray-800/60 border-[#E2E8F0]/50 dark:border-gray-600/50 active:bg-[#F8FAFC]/80 dark:active:bg-gray-700/80 active:shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#0F172A] dark:text-white mb-1 leading-snug">{doc.originalFileName}</p>
                          <p className="text-xs text-[#64748B] dark:text-gray-400 font-medium">{new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className="text-xs bg-[#F1F5F9] dark:bg-gray-700 text-[#334155] dark:text-gray-300 px-2.5 py-1 rounded-full whitespace-nowrap font-semibold flex-shrink-0">{doc.type}</span>
                      </div>
                    </motion.div>
                  ))}  
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {documents.filter(doc => doc.type !== 'answer-script').map((doc) => (
                    <motion.div
                      key={doc._id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedDocument(doc._id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border relative overflow-hidden min-h-[100px] backdrop-blur-md ${
                        selectedDocument === doc._id
                          ? "bg-gradient-to-br from-slate-50/90 to-slate-100/90 dark:from-gray-700/90 dark:to-gray-800/90 border-[#0F172A] dark:border-blue-500 shadow-lg"
                          : "bg-white/60 dark:bg-gray-800/60 border-[#E2E8F0]/50 dark:border-gray-600/50 active:shadow-md"
                      }`}
                    >
                      {/* Gradient overlay */}
                      <div className={`absolute inset-0 bg-gradient-to-br from-slate-500/5 to-slate-700/5 ${selectedDocument === doc._id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`} />
                      
                      <div className="relative flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <svg className="w-5 h-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#0F172A] dark:text-white mb-2 line-clamp-2 leading-tight">{doc.originalFileName}</p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-[#64748B] dark:text-gray-400 font-medium">{new Date(doc.createdAt).toLocaleDateString()}</p>
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg font-semibold whitespace-nowrap">{doc.type}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}  
                </div>
              )}
            </motion.div>

            {/* Quick Stats - Compact */}
            <div>
              <QuickStats 
                documentsCount={documents.filter(d => d.type !== 'answer-script').length}
                flashcardsCount={flashcardsCount}
                papersCount={papersCount}
              />
            </div>

            {/* Study Goals */}
            <ProgressTracking goals={goals} />
          </div>
        </div>
      </PullToRefresh>
      <BottomNavigation />
    </div>
  )
}
