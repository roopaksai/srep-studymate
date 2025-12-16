"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/app/context/AuthContext"

export default function NavigationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    router.push("/login")
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const isActive = (path: string) => pathname === path

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 sm:gap-3 px-2 py-2 sm:px-4 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 text-white border border-white/20 hover:border-white/30 shadow-lg hover:shadow-xl group"
      >
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xs sm:text-sm border border-white/30 group-hover:bg-white/30 transition-all duration-200">
          {getInitials(user?.name)}
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-semibold leading-tight">{user?.name}</span>
          <span className="text-xs text-white/70 leading-tight">View Menu</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* User Info */}
            <div className="px-5 py-4 bg-gradient-to-br from-orange-500 to-orange-600">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg text-white border-2 border-white/40 shadow-lg">
                  {getInitials(user?.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-white truncate">{user?.name}</p>
                  <p className="text-xs text-white/90 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="py-2">
              <Link
                href="/app"
                onClick={() => setIsOpen(false)}
                className={`block px-5 py-2.5 text-sm transition-colors duration-150 ${
                  isActive("/app")
                    ? "bg-orange-50 text-orange-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Dashboard
              </Link>
              <div className="border-t border-gray-100 mx-4"></div>

              <Link
                href="/app/flashcards"
                onClick={() => setIsOpen(false)}
                className={`block px-5 py-2.5 text-sm transition-colors duration-150 ${
                  isActive("/app/flashcards")
                    ? "bg-orange-50 text-orange-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Flashcards
              </Link>
              <div className="border-t border-gray-100 mx-4"></div>

              <Link
                href="/app/mock-papers"
                onClick={() => setIsOpen(false)}
                className={`block px-5 py-2.5 text-sm transition-colors duration-150 ${
                  isActive("/app/mock-papers")
                    ? "bg-orange-50 text-orange-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Mock Papers
              </Link>
              <div className="border-t border-gray-100 mx-4"></div>

              <Link
                href="/app/analysis"
                onClick={() => setIsOpen(false)}
                className={`block px-5 py-2.5 text-sm transition-colors duration-150 ${
                  isActive("/app/analysis")
                    ? "bg-orange-50 text-orange-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Analysis
              </Link>
              <div className="border-t border-gray-100 mx-4"></div>

              <Link
                href="/app/scheduler"
                onClick={() => setIsOpen(false)}
                className={`block px-5 py-2.5 text-sm transition-colors duration-150 ${
                  isActive("/app/scheduler")
                    ? "bg-orange-50 text-orange-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Scheduler
              </Link>

              <div className="border-t border-gray-200 my-2"></div>

              <button
                onClick={handleLogout}
                className="block w-full text-left px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
              >
                Logout
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">SREP StudyMate © 2025</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
