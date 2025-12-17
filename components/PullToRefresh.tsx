"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw } from "lucide-react"

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const threshold = 80 // Pull distance needed to trigger refresh

  const handleTouchStart = (e: TouchEvent) => {
    const container = containerRef.current
    if (!container) return
    
    // Only activate if scrolled to top
    if (container.scrollTop === 0) {
      setTouchStart(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    const container = containerRef.current
    if (!container || isRefreshing || container.scrollTop > 0) return

    const currentTouch = e.touches[0].clientY
    const distance = currentTouch - touchStart

    if (distance > 0 && distance < threshold * 2) {
      setPullDistance(distance)
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setPullDistance(0)
    setTouchStart(0)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullDistance, isRefreshing, touchStart])

  const pullProgress = Math.min(pullDistance / threshold, 1)
  const rotation = pullProgress * 360

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center"
            style={{
              height: `${Math.max(pullDistance, isRefreshing ? threshold : 0)}px`,
            }}
          >
            <motion.div
              animate={{
                rotate: isRefreshing ? 360 : rotation,
                scale: isRefreshing ? 1 : pullProgress,
              }}
              transition={{
                rotate: isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 },
                scale: { duration: 0.2 },
              }}
              className="flex items-center justify-center"
            >
              <RefreshCw
                className={`w-6 h-6 ${
                  pullProgress >= 1 || isRefreshing ? "text-[#0F172A]" : "text-[#64748B]"
                }`}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ paddingTop: isRefreshing ? `${threshold}px` : '0px', transition: 'padding-top 0.2s' }}>
        {children}
      </div>
    </div>
  )
}
