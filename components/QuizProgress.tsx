"use client"

import { motion } from "framer-motion"

interface QuizProgressProps {
  current: number
  total: number
  answered: number
}

export default function QuizProgress({ current, total, answered }: QuizProgressProps) {
  const progress = (answered / total) * 100
  const currentProgress = ((current + 1) / total) * 100

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Question {current + 1} of {total}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            • {answered} answered
          </span>
        </div>
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {Math.round(progress)}% Complete
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* Answered progress (green) */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
        />
        
        {/* Current position indicator (blue) */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${currentProgress}%` }}
          transition={{ duration: 0.3 }}
          className="absolute top-0 h-full w-1 bg-blue-600 dark:bg-blue-400 shadow-lg"
          style={{ transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Progress dots */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index < answered
                ? "bg-green-500"
                : index === current
                ? "bg-blue-500 ring-2 ring-blue-300"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
