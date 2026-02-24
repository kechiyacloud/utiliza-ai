import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './dashboard/Navbar'

function MainDashboard() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-screen bg-mainTheme text-white overflow-hidden p-3">

      {/* Sidebar / Navbar */}
      <div className="flex-shrink-0 h-full transition-all duration-300 ease-in-out">
        <Navbar />
      </div>

      {/* Main content area */}
      <div
        id="main-scroll-container"
        className="flex-1 h-full bg-slate-50 text-mainTheme p-1 overflow-y-auto rounded-xl shadow-lg"
      >
        <Outlet />
      </div>

    </div>
  )
}

export default MainDashboard