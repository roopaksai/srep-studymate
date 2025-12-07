"use client"

import { useState } from "react"
import axios from "axios"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import { useAuth } from "../context/AuthContext"
import "./Scheduler.css"

const Scheduler = () => {
  const [schedules, setSchedules] = useState([])
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [topics, setTopics] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { token } = useAuth()

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  const handleGenerateSchedule = async (e) => {
    e.preventDefault()
    setError("")

    if (!startDate || !endDate || !topics) {
      setError("Please fill in all fields")
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("End date must be after start date")
      return
    }

    setLoading(true)

    try {
      const topicsArray = topics
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t)
      const response = await axios.post(
        `${API_URL}/schedule/generate`,
        { startDate, endDate, topics: topicsArray },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      setSchedules([response.data, ...schedules])
      setSelectedSchedule(response.data)
      setStartDate("")
      setEndDate("")
      setTopics("")
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate schedule")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="dashboard-layout">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar />
        <main className="dashboard-main">
          <div className="dashboard-container">
            <h1>📅 Study Scheduler</h1>

            {error && <div className="error-message">{error}</div>}

            <div className="scheduler-container">
              <div className="form-card">
                <h2>Create Schedule</h2>
                <form onSubmit={handleGenerateSchedule}>
                  <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Topics (comma-separated)</label>
                    <textarea
                      value={topics}
                      onChange={(e) => setTopics(e.target.value)}
                      placeholder="e.g., Biology, Chemistry, Physics"
                      rows="4"
                      required
                    />
                  </div>
                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Generating..." : "Generate Schedule"}
                  </button>
                </form>
              </div>

              {selectedSchedule && (
                <div className="schedule-card">
                  <h2>Your Schedule</h2>
                  <div className="schedule-table">
                    <div className="table-header">
                      <div className="table-cell">Date</div>
                      <div className="table-cell">Topic</div>
                      <div className="table-cell">Duration</div>
                    </div>
                    <div className="table-body">
                      {selectedSchedule.slots.map((slot, idx) => (
                        <div key={idx} className="table-row">
                          <div className="table-cell">{formatDate(slot.date)}</div>
                          <div className="table-cell">{slot.topic}</div>
                          <div className="table-cell">{slot.durationMinutes} min</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {schedules.length > 1 && (
                <div className="schedules-list">
                  <h3>Past Schedules</h3>
                  {schedules.map((schedule, idx) => (
                    <div
                      key={schedule._id}
                      className={`schedule-item ${selectedSchedule?._id === schedule._id ? "active" : ""}`}
                      onClick={() => setSelectedSchedule(schedule)}
                    >
                      <p className="schedule-date">
                        {formatDate(schedule.startDate)} - {formatDate(schedule.endDate)}
                      </p>
                      <p className="schedule-topics">{schedule.slots.length} topics</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Scheduler
