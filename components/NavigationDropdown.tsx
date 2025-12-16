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

  const getFeatureColor = (path: string) => {
    if (path === "/app/flashcards") return "bg-blue-50 text-[#2563EB]"
    if (path === "/app/mock-papers") return "bg-indigo-50 text-[#4F46E5]"
    if (path === "/app/analysis") return "bg-green-50 text-[#16A34A]"
    if (path === "/app/scheduler") return "bg-orange-50 text-[#F97316]"
    return "bg-slate-50 text-[#0F172A]"
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 text-white border border-white/20 hover:border-white/30"
      >
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-semibold text-xs sm:text-sm border border-white/30">
          {getInitials(user?.name)}
        </div>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-semibold leading-tight">{user?.name}</span>
          <span className="text-xs text-white/70 leading-tight">Menu</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-gray-500/90 backdrop-blur-xl rounded-lg shadow-2xl border border-white/20 overflow-hidden z-50">
            {/* User Info */}
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md border-b border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-semibold text-sm text-white border border-white/30">
                  {getInitials(user?.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                  <p className="text-xs text-white/70 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Navigation Items */}
            <div className="py-1">
              <Link
                href="/app"
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive("/app")
                    ? "bg-white/20 text-white"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                Dashboard
              </Link>

              <Link
                href="/app/flashcards"
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive("/app/flashcards")
                    ? "bg-[#2563EB]/30 text-white font-semibold"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                Flashcards
              </Link>

              <Link
                href="/app/mock-papers"
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive("/app/mock-papers")
                    ? "bg-[#4F46E5]/30 text-white font-semibold"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                Mock Papers
              </Link>

              <Link
                href="/app/analysis"
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive("/app/analysis")
                    ? "bg-[#16A34A]/30 text-white font-semibold"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                Reports
              </Link>

              <Link
                href="/app/scheduler"
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive("/app/scheduler")
                    ? "bg-[#F97316]/30 text-white font-semibold"
                    : "text-white/90 hover:bg-white/10"
                }`}
              >
                Scheduler
              </Link>

              <div className="border-t border-white/20 my-1"></div>

              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
