// src/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute() {
  const isAuthenticated = Boolean(
    localStorage.getItem('token')   // OR cookie check
  )

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/" replace />
}

export default ProtectedRoute
