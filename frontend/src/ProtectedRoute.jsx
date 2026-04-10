// src/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute() {
  const token = localStorage.getItem('token')
  const isAuthenticated =
    Boolean(token) && token !== 'undefined' && token !== 'null'

  return isAuthenticated
    ? <Outlet />
    : <Navigate to="/" replace />
}

export default ProtectedRoute
