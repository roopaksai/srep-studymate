"use client"

import React, { createContext, useState, useEffect } from "react"
import axios from "axios"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem("token"))
  const [loading, setLoading] = useState(true)

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api"

  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(response.data)
    } catch (error) {
      console.error("Failed to fetch user:", error)
      setToken(null)
      localStorage.removeItem("token")
    } finally {
      setLoading(false)
    }
  }

  const signup = async (email, password, name) => {
    const response = await axios.post(`${API_URL}/auth/signup`, { email, password, name })
    setToken(response.data.token)
    setUser(response.data.user)
    localStorage.setItem("token", response.data.token)
    return response.data
  }

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password })
    setToken(response.data.token)
    setUser(response.data.user)
    localStorage.setItem("token", response.data.token)
    return response.data
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("token")
  }

  return <AuthContext.Provider value={{ user, token, loading, signup, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
