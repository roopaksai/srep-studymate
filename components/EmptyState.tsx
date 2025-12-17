"use client"

import { FileText, Upload, Sparkles, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"

interface EmptyStateProps {
  type: "documents" | "flashcards" | "mockpapers" | "reports" | "schedules"
  message?: string
}

const emptyStateConfig = {
  documents: {
    icon: FileText,
    title: "No documents yet",
    description: "Upload your first document to get started with AI-powered study tools",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-800",
  },
  flashcards: {
    icon: Sparkles,
    title: "No flashcards yet",
    description: "Generate flashcards from your documents to start studying smarter",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  mockpapers: {
    icon: Upload,
    title: "No mock papers yet",
    description: "Create practice tests from your study materials",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
  },
  reports: {
    icon: TrendingUp,
    title: "No reports yet",
    description: "Upload answer scripts to get detailed performance analysis",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  schedules: {
    icon: Sparkles,
    title: "No schedules yet",
    description: "Generate a personalized study schedule to stay on track",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
  },
}

export default function EmptyState({ type, message }: EmptyStateProps) {
  const config = emptyStateConfig[type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex flex-col items-center justify-center py-12 px-6 rounded-xl ${config.bgColor}`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className={`mb-4 ${config.color}`}
      >
        <Icon className="w-16 h-16" strokeWidth={1.5} />
      </motion.div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {config.title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md">
        {message || config.description}
      </p>
    </motion.div>
  )
}
