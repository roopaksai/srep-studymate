"use client"

import { FileUp, Layers, FileCheck, Calendar, Clock } from "lucide-react"
import { motion } from "framer-motion"

interface Activity {
  type: "document" | "flashcard" | "mockpaper" | "schedule"
  title: string
  timestamp: Date
}

interface RecentActivityProps {
  activities: Activity[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: Activity["type"]) => {
    switch (type) {
      case "document":
        return FileUp
      case "flashcard":
        return Layers
      case "mockpaper":
        return FileCheck
      case "schedule":
        return Calendar
      default:
        return FileUp
    }
  }

  const getColor = (type: Activity["type"]) => {
    switch (type) {
      case "document":
        return {
          bg: "bg-slate-100 dark:bg-slate-800",
          text: "text-slate-700 dark:text-slate-300",
          icon: "text-slate-600 dark:text-slate-400",
        }
      case "flashcard":
        return {
          bg: "bg-blue-100 dark:bg-blue-900",
          text: "text-blue-700 dark:text-blue-300",
          icon: "text-blue-600 dark:text-blue-400",
        }
      case "mockpaper":
        return {
          bg: "bg-indigo-100 dark:bg-indigo-900",
          text: "text-indigo-700 dark:text-indigo-300",
          icon: "text-indigo-600 dark:text-indigo-400",
        }
      case "schedule":
        return {
          bg: "bg-orange-100 dark:bg-orange-900",
          text: "text-orange-700 dark:text-orange-300",
          icon: "text-orange-600 dark:text-orange-400",
        }
    }
  }

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg active:shadow-xl transition-shadow duration-300 p-4 overflow-hidden">
      {/* Glass Shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Recent Activity</h3>
        <Clock className="w-6 h-6 text-gray-400" />
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-base text-gray-500 dark:text-gray-400 text-center py-12">
            No recent activity in the last 7 days
          </p>
        ) : (
          activities.slice(0, 5).map((activity, index) => {
            const Icon = getIcon(activity.type)
            const colors = getColor(activity.type)
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/30 dark:bg-gray-700/30 backdrop-blur-sm active:bg-white/50 dark:active:bg-gray-700/50 transition-all duration-200 border border-gray-200/30 dark:border-gray-600/30"
              >
                <div className={`${colors.bg} p-3 rounded-xl flex-shrink-0 backdrop-blur-sm`}>
                  <Icon className={`w-5 h-5 ${colors.icon}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {activities.length > 5 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Showing 5 of {activities.length} activities
          </p>
        </div>
      )}
    </div>
  )
}
