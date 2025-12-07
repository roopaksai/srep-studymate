"use client"

import type React from "react"

import { useAuth } from "@/app/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ScheduleSlot {
  date: string
  topic: string
  durationMinutes: number
}

interface Schedule {
  id: string
  startDate: string
  endDate: string
  slots: ScheduleSlot[]
  createdAt: string
}

export default function SchedulerPage() {
  const { user, token, loading } = useAuth()
  const router = useRouter()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    topics: "",
  })
  const [genLoading, setGenLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!loading && !user) router.push("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (token) {
      fetchSchedules()
    }
  }, [token])

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
      const topicsArray = formData.topics.split(",").map((t) => t.trim())

      const res = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startDate: formData.startDate,
          endDate: formData.endDate,
          topics: topicsArray,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        fetchSchedules()
        setSelectedSchedule(data.schedule)
        setFormData({ startDate: "", endDate: "", topics: "" })
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
              <h3 className="text-lg font-bold text-gray-800 mb-4">Your Schedules</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {schedules.map((schedule, idx) => (
                  <div
                    key={schedule.id}
                    onClick={() => setSelectedSchedule(schedule)}
                    className={`p-3 rounded-lg cursor-pointer transition text-sm ${
                      selectedSchedule?.id === schedule.id
                        ? "bg-orange-100 border-2 border-orange-500"
                        : "bg-gray-50 border-2 border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <p className="font-semibold text-gray-800">Schedule {idx + 1}</p>
                    <p className="text-xs text-gray-600">{schedule.slots.length} slots</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>}

            {/* Form */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Study Schedule</h2>

              <form onSubmit={handleGenerateSchedule} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Topics (comma-separated)</label>
                  <textarea
                    value={formData.topics}
                    onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                    placeholder="e.g., Mathematics, Physics, Chemistry"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 h-24"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={genLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold"
                >
                  {genLoading ? "Generating..." : "Generate Schedule"}
                </Button>
              </form>
            </div>

            {/* Schedule Display */}
            {selectedSchedule && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Study Schedule</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-orange-500">
                        <th className="text-left py-3 px-4 font-bold text-gray-800">Date</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-800">Topic</th>
                        <th className="text-left py-3 px-4 font-bold text-gray-800">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSchedule.slots.map((slot, idx) => (
                        <tr key={idx} className="border-b border-gray-200 hover:bg-orange-50">
                          <td className="py-3 px-4">{new Date(slot.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 font-semibold text-gray-800">{slot.topic}</td>
                          <td className="py-3 px-4 text-gray-600">{slot.durationMinutes} mins</td>
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
