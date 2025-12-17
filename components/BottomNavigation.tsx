"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, FileText, BarChart3, Calendar } from "lucide-react"

export default function BottomNavigation() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const navItems = [
    { href: "/app", icon: Home, label: "Home", color: "#0F172A" },
    { href: "/app/flashcards", icon: BookOpen, label: "Cards", color: "#2563EB" },
    { href: "/app/mock-papers", icon: FileText, label: "Papers", color: "#4F46E5" },
    { href: "/app/analysis", icon: BarChart3, label: "Reports", color: "#16A34A" },
    { href: "/app/scheduler", icon: Calendar, label: "Schedule", color: "#F97316" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 ${
                active ? "scale-110" : "scale-100 opacity-70"
              }`}
            >
              <div
                className={`flex flex-col items-center justify-center transition-all duration-200 ${
                  active ? "transform -translate-y-1" : ""
                }`}
              >
                <Icon
                  size={24}
                  style={{ 
                    color: active ? item.color : "#64748B",
                    strokeWidth: active ? 2.5 : 2
                  }}
                />
                <span
                  className={`text-xs mt-1 font-medium transition-all duration-200 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ color: active ? item.color : "#64748B" }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
