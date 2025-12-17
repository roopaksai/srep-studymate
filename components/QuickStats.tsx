"use client"

import { FileText, Layers, FileCheck } from "lucide-react"
import { motion } from "framer-motion"

interface QuickStatsProps {
  documentsCount: number
  flashcardsCount: number
  papersCount: number
}

export default function QuickStats({ documentsCount, flashcardsCount, papersCount }: QuickStatsProps) {
  const stats = [
    {
      icon: FileText,
      label: "Documents",
      value: documentsCount,
      color: "from-slate-500 to-slate-700",
      textColor: "text-slate-700",
      darkTextColor: "dark:text-slate-300",
      iconBg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      icon: Layers,
      label: "Flashcard Sets",
      value: flashcardsCount,
      color: "from-blue-500 to-blue-700",
      textColor: "text-blue-700",
      darkTextColor: "dark:text-blue-300",
      iconBg: "bg-blue-100 dark:bg-blue-900",
    },
    {
      icon: FileCheck,
      label: "Mock Papers",
      value: papersCount,
      color: "from-indigo-500 to-indigo-700",
      textColor: "text-indigo-700",
      darkTextColor: "dark:text-indigo-300",
      iconBg: "bg-indigo-100 dark:bg-indigo-900",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileTap={{ scale: 0.98 }}
          className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg active:shadow-xl transition-all duration-300"
        >
          {/* Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-[0.08]`} />
          {/* Glass Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-gray-600 dark:text-gray-400 mb-2">{stat.label}</p>
                <p className={`text-4xl font-extrabold ${stat.textColor} ${stat.darkTextColor} tracking-tight`}>
                  {stat.value}
                </p>
              </div>
              <div className={`${stat.iconBg} p-4 rounded-2xl flex-shrink-0`}>
                <stat.icon className={`w-8 h-8 ${stat.textColor} ${stat.darkTextColor}`} />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
