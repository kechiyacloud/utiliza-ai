import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './dashboard/Navbar'

function MainDashboard() {
  const location = useLocation();
  const isSettings = location.pathname.includes('/settings');

  return (
    <div className="flex h-screen w-screen bg-mainTheme text-white overflow-hidden p-3">

      {/* Sidebar / Navbar */}
      {!isSettings && (
        <div className="flex-shrink-0 h-full transition-all duration-300 ease-in-out">
          <Navbar />
        </div>
      )}

      {/* Main content area */}
      <div
        id="main-scroll-container"
        className={`flex-1 h-full min-w-0 bg-slate-50 text-mainTheme overflow-y-auto overflow-x-hidden rounded-xl shadow-lg ${isSettings ? '' : 'p-1'}`}
      >
        <Outlet />
      </div>

    </div>
  )
}

export default MainDashboard