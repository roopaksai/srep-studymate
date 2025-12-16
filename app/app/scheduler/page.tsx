"use client"

import type React from "react"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ScheduleSlot {
  date: string
  topic: string
  durationMinutes: number
  priority?: "high" | "medium" | "low"
  completed?: boolean
}

interface Schedule {
  id: string
  title: string
  startDate: string
  endDate: string
  studyHoursPerDay: number
  restDays: number[]
  slots: ScheduleSlot[]
  createdAt: string
}

export default function SchedulerPage() {
  const { user, token, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [formData, setFormData] = useState({
    title: "Study Schedule",
    startDate: "",
    endDate: "",
    topics: "",
    studyHoursPerDay: "3",
    restDays: [] as number[],
    useAI: true,
  })
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState("")
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchSchedules()
      fetchAllTopics()
      
      // Check if weak topics are passed from analysis report
      const weakTopicsParam = searchParams.get("weakTopics")
      if (weakTopicsParam) {
        try {
          const weakTopics = JSON.parse(decodeURIComponent(weakTopicsParam))
          // Convert weak topics to high-priority topics
          const topicsStr = weakTopics.map((t: string) => `${t} (High Priority)`).join(", ")
          setFormData((prev) => ({
            ...prev,
            topics: topicsStr,
            title: "Weakness Improvement Schedule",
          }))
          setShowAdvanced(false)
        } catch (err) {
          console.error("Failed to parse weak topics:", err)
        }
      }
    }
  }, [token, searchParams])

  const fetchAllTopics = async () => {
    try {
      const res = await fetch("/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const documents = data.data || data.documents || []
        // Extract all unique topics from documents
        const allTopics = documents
          .filter((doc: any) => doc.topics && doc.topics.length > 0)
          .flatMap((doc: any) => doc.topics)
          .filter((topic: string, index: number, self: string[]) => self.indexOf(topic) === index)
        
        // Only set if no weak topics from report and topics field is empty
        if (!searchParams.get("weakTopics") && formData.topics === "") {
          setFormData((prev) => ({
            ...prev,
            topics: allTopics.join(", "),
          }))
        }
      }
    } catch (err) {
      console.error("Failed to fetch topics:", err)
    }
  }

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/schedule", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules)
      }
    } catch (err) {
      console.error("Failed to fetch schedules:", err)
    }
  }

  const handleGenerateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!formData.startDate || !formData.endDate || !formData.topics) {
      setError("All fields are required")
      return
    }

    try {
      setGenLoading(true)
      
      // Parse topics - check if they have priority markers
      const topicsArray = formData.topics.split(",").map((t) => {
        const trimmed = t.trim()
        const priorityMatch = trimmed.match(/\(high priority\)|\(medium priority\)|\(low priority\)/i)
        
        if (priorityMatch) {
          const priority = priorityMatch[0].toLowerCase().includes("high")
            ? "high"
            : priorityMatch[0].toLowerCase().includes("low")
            ? "low"
            : "medium"
          const topic = trimmed.replace(/\(.*priority\)/i, "").trim()
          return { topic, priority }
        }
        
        return { topic: trimmed, priority: "medium" as const }
      })

      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          startDate: formData.startDate,
          endDate: formData.endDate,
          topics: topicsArray,
          studyHoursPerDay: parseInt(formData.studyHoursPerDay),
          restDays: formData.restDays,
          useAI: formData.useAI,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        fetchSchedules()
        setSelectedSchedule(data.schedule)
        setFormData({
          title: "Study Schedule",
          startDate: "",
          endDate: "",
          topics: "",
          studyHoursPerDay: "3",
          restDays: [],
          useAI: true,
        })
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

  const handleExportPDF = async () => {
    if (!selectedSchedule) return

    try {
      const { jsPDF } = await import("jspdf")
      const doc = new jsPDF()

      // Title
      doc.setFontSize(20)
      doc.setTextColor(128, 90, 213)
      doc.text(selectedSchedule.title || "Study Schedule", 105, 20, { align: "center" })

      // Date range
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      const dateRange = `${new Date(selectedSchedule.startDate).toLocaleDateString()} - ${new Date(selectedSchedule.endDate).toLocaleDateString()}`
      doc.text(dateRange, 105, 28, { align: "center" })

      // Stats
      const stats = getStats(selectedSchedule)
      doc.setFontSize(9)
      doc.text(`Total Hours: ${stats.totalHours}h  |  Sessions: ${stats.totalSessions}  |  Topics: ${stats.uniqueTopics}`, 105, 35, { align: "center" })

      // Table headers
      let yPos = 50
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', "bold")
      doc.text("Date", 15, yPos)
      doc.text("Topic", 60, yPos)
      doc.text("Duration", 170, yPos)

      // Horizontal line
      doc.setDrawColor(128, 90, 213)
      doc.setLineWidth(0.5)
      doc.line(15, yPos + 2, 195, yPos + 2)

      yPos += 8
      doc.setFont('helvetica', "normal")
      doc.setFontSize(9)

      // Table rows
      selectedSchedule.slots.forEach((slot, index) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }

        const date = new Date(slot.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })

        doc.setTextColor(60, 60, 60)
        doc.text(date, 15, yPos)
        doc.text(slot.topic.substring(0, 45), 60, yPos)
        doc.text(`${slot.durationMinutes} min`, 170, yPos)

        yPos += 7
      })

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Generated by SREP StudyMate - Page ${i} of ${pageCount}`,
          105,
          285,
          { align: "center" }
        )
      }

      // Save PDF
      const filename = `${(selectedSchedule.title || "schedule").replace(/\s+/g, "-").toLowerCase()}.pdf`
      doc.save(filename)
    } catch (error) {
      console.error("PDF export failed:", error)
      setError("Failed to export PDF. Please try again.")
    }
  }

  const toggleRestDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      restDays: prev.restDays.includes(day)
        ? prev.restDays.filter((d) => d !== day)
        : [...prev.restDays, day],
    }))
  }

  const getStats = (schedule: Schedule) => {
    const totalMinutes = schedule.slots.reduce((sum, slot) => sum + slot.durationMinutes, 0)
    const uniqueTopics = new Set(schedule.slots.map((s) => s.topic)).size
    const highPriority = schedule.slots.filter((s) => s.priority === "high").length
    
    return {
      totalHours: Math.round(totalMinutes / 60),
      totalSessions: schedule.slots.length,
      uniqueTopics,
      highPriority,
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-purple-100">
      <nav className="bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/app">
            <span className="text-2xl font-bold text-white cursor-pointer">SREP</span>
          </Link>
          <span className="text-white">{user?.name}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <Link href="/app">
            <Button variant="outline" className="bg-transparent">
              ← Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">📅 Smart Study Scheduler</h1>
          <div className="w-32"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📚 Your Schedules</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {schedules.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No schedules yet</p>
                ) : (
                  schedules.map((schedule) => {
                    const stats = getStats(schedule)
                    return (
                      <div
                        key={schedule.id}
                        onClick={() => setSelectedSchedule(schedule)}
                        className={`p-3 rounded-lg cursor-pointer transition ${
                          selectedSchedule?.id === schedule.id
                            ? "bg-purple-100 border-2 border-purple-500"
                            : "bg-gray-50 border-2 border-gray-200 hover:border-purple-300"
                        }`}
                      >
                        <p className="font-semibold text-sm text-gray-800 truncate">
                          {schedule.title}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                          <span>{stats.totalSessions} sessions</span>
                          <span>{stats.totalHours}h total</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Quick Stats for Selected Schedule */}
            {selectedSchedule && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Statistics</h3>
                {(() => {
                  const stats = getStats(selectedSchedule)
                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Hours</span>
                        <span className="font-bold text-purple-600">{stats.totalHours}h</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Sessions</span>
                        <span className="font-bold text-purple-600">{stats.totalSessions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Topics</span>
                        <span className="font-bold text-purple-600">{stats.uniqueTopics}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">High Priority</span>
                        <span className="font-bold text-red-600">{stats.highPriority}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Form */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">✨ Create Study Schedule</h2>
              <p className="text-gray-600 mb-6 text-sm">
                AI-powered scheduling with smart prioritization
              </p>

              <form onSubmit={handleGenerateSchedule} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Exam Preparation Schedule"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📚 Topics (comma-separated)
                  </label>
                  <textarea
                    value={formData.topics}
                    onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                    placeholder="e.g., Data Structures (High Priority), Algorithms, Databases (Low Priority)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-24 resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Add (High Priority), (Medium Priority), or (Low Priority) after topics
                  </p>
                </div>

                {/* Advanced Options Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-2"
                  >
                    {showAdvanced ? "▼" : "▶"} Advanced Options
                  </button>
                </div>

                {showAdvanced && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ⏰ Study Hours Per Day
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={formData.studyHoursPerDay}
                          onChange={(e) =>
                            setFormData({ ...formData, studyHoursPerDay: e.target.value })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🤖 Use AI Scheduling
                        </label>
                        <div className="flex items-center gap-3 mt-3">
                          <input
                            type="checkbox"
                            checked={formData.useAI}
                            onChange={(e) =>
                              setFormData({ ...formData, useAI: e.target.checked })
                            }
                            className="w-5 h-5 text-purple-600"
                          />
                          <span className="text-sm text-gray-600">
                            Smart prioritization & distribution
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        🛌 Rest Days
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleRestDay(idx)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                              formData.restDays.includes(idx)
                                ? "bg-purple-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={genLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold text-lg shadow-lg"
                >
                  {genLoading ? "🔄 Generating Schedule..." : "✨ Generate Smart Schedule"}
                </Button>
              </form>
            </div>

            {/* Schedule Display */}
            {selectedSchedule && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedSchedule.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(selectedSchedule.startDate).toLocaleDateString()} -{" "}
                      {new Date(selectedSchedule.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={handleExportPDF}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    📄 Download PDF
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-purple-500">
                        <th className="text-left py-3 px-4 font-bold text-gray-800">Date</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-800">Topic</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-800">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSchedule.slots.map((slot, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-purple-50">
                          <td className="py-3 px-4 text-gray-700">
                            {new Date(slot.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-800">{slot.topic}</td>
                          <td className="py-3 px-4 text-gray-600">{slot.durationMinutes} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
