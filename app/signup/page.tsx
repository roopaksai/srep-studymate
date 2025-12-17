"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/context/AuthContext"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { signup } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      await signup(email, password, name)
      router.push("/app")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#DEEEEE] flex flex-col">
      <nav className="bg-white border-b border-[#E2E8F0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/">
            <span className="text-2xl font-bold text-[#0F172A] cursor-pointer">SREP</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transition-shadow duration-300 p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] mb-2">Create Account</h1>
          <p className="text-gray-600 mb-6">Join SREP to start studying</p>

          {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-semibold"
            >
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-orange-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
