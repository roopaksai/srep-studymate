"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, Trophy, Star } from "lucide-react"
import { useEffect, useState } from "react"

interface CelebrationProps {
  show: boolean
  score?: number
  message?: string
}

export default function Celebration({ show, score, message }: CelebrationProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string }>>([])

  useEffect(() => {
    if (show) {
      // Generate confetti particles
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"][Math.floor(Math.random() * 5)],
      }))
      setParticles(newParticles)
    }
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          {/* Confetti particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ 
                x: "50vw", 
                y: "50vh", 
                scale: 0,
                rotate: 0 
              }}
              animate={{
                x: `${particle.x}vw`,
                y: `${particle.y}vh`,
                scale: [0, 1, 0.5],
                rotate: 360,
              }}
              transition={{
                duration: 1.5,
                ease: "easeOut",
              }}
              className="absolute w-3 h-3 rounded-full"
              style={{ backgroundColor: particle.color }}
            />
          ))}

          {/* Main celebration card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="mb-4 flex justify-center"
            >
              <div className="relative">
                <Trophy className="w-20 h-20 text-yellow-500" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-2 -right-2"
                >
                  <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                </motion.div>
              </div>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-gray-800 dark:text-white mb-2"
            >
              Congratulations! 🎉
            </motion.h2>

            {score !== undefined && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-5xl font-bold text-green-600 dark:text-green-400 mb-4"
              >
                {score}%
              </motion.div>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-600 dark:text-gray-300 mb-6"
            >
              {message || "You've completed the quiz! Great job! 🌟"}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Keep up the great work!</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
