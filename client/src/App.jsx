import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import PrivateRoute from "./components/PrivateRoute"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Home from "./pages/Home"
import Dashboard from "./pages/Dashboard"
import Flashcards from "./pages/Flashcards"
import MockPapers from "./pages/MockPapers"
import Analysis from "./pages/Analysis"
import Scheduler from "./pages/Scheduler"

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/flashcards"
            element={
              <PrivateRoute>
                <Flashcards />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/mock-papers"
            element={
              <PrivateRoute>
                <MockPapers />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/analysis"
            element={
              <PrivateRoute>
                <Analysis />
              </PrivateRoute>
            }
          />
          <Route
            path="/app/scheduler"
            element={
              <PrivateRoute>
                <Scheduler />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
