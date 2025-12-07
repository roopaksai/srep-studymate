"use client"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>
  }

  return token ? children : <Navigate to="/login" />
}

export default PrivateRoute
