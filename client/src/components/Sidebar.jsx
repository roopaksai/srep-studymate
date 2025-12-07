import { Link, useLocation } from "react-router-dom"
import "./Sidebar.css"

const Sidebar = () => {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        <Link to="/app" className={`sidebar-link ${isActive("/app") ? "active" : ""}`}>
          📊 Dashboard
        </Link>
        <Link to="/app/flashcards" className={`sidebar-link ${isActive("/app/flashcards") ? "active" : ""}`}>
          🎴 Flashcards
        </Link>
        <Link to="/app/mock-papers" className={`sidebar-link ${isActive("/app/mock-papers") ? "active" : ""}`}>
          📝 Mock Papers
        </Link>
        <Link to="/app/analysis" className={`sidebar-link ${isActive("/app/analysis") ? "active" : ""}`}>
          📈 Analysis
        </Link>
        <Link to="/app/scheduler" className={`sidebar-link ${isActive("/app/scheduler") ? "active" : ""}`}>
          📅 Scheduler
        </Link>
      </nav>
    </aside>
  )
}

export default Sidebar
