"use client"

import { Target, TrendingUp, Award } from "lucide-react"
import { motion } from "framer-motion"

interface Goal {
  id: string
  title: string
  target: number
  current: number
  unit: string
  color: string
  darkColor: string
}

interface ProgressTrackingProps {
  goals: Goal[]
}

export default function ProgressTracking({ goals }: ProgressTrackingProps) {
  const calculateProgress = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100)
  }

  const getProgressColor = (progress: number, color: string, darkColor: string) => {
    if (progress >= 100) return "from-green-500 to-green-600"
    if (progress >= 75) return `from-${color} to-${darkColor}`
    if (progress >= 50) return "from-yellow-400 to-yellow-500"
    return "from-gray-400 to-gray-500"
  }

  return (
    <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg active:shadow-xl transition-shadow duration-300 p-6 overflow-hidden">
      {/* Glass Shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Study Goals</h3>
        <Target className="w-6 h-6 text-gray-400" />
      </div>

      <div className="space-y-6">
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No active goals yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Set study goals to track your progress
            </p>
          </div>
        ) : (
          goals.map((goal, index) => {
            const progress = calculateProgress(goal.current, goal.target)
            const progressColor = getProgressColor(progress, goal.color, goal.darkColor)
            const isCompleted = progress >= 100

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${progressColor}`} />
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">
                      {goal.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold ${
                      isCompleted 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-gray-700 dark:text-gray-300"
                    }`}>
                      {goal.current}/{goal.target} {goal.unit}
                    </span>
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`absolute top-0 left-0 h-full bg-gradient-to-r ${progressColor} rounded-full`}
                  />
                </div>

                {/* Progress Percentage */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className={`w-4 h-4 ${
                      progress >= 50 
                        ? "text-green-500 dark:text-green-400" 
                        : "text-gray-400"
                    }`} />
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {progress}% complete
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
                    {goal.target - goal.current > 0 
                      ? `${goal.target - goal.current} ${goal.unit} to go` 
                      : "Goal achieved! 🎉"
                    }
                  </span>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
