// src/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom'

function getTokenPayload(token) {
  try {
    // JWT is three base64url segments separated by dots
    const base64Payload = token.split('.')[1]
    if (!base64Payload) return null
    // base64url → base64
    const padded = base64Payload.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function isTokenValid(token) {
  if (!token || token === 'undefined' || token === 'null') return false

  const payload = getTokenPayload(token)
  if (!payload) return false

  // Check expiry — payload.exp is in seconds, Date.now() is in ms
  if (payload.exp && Date.now() >= payload.exp * 1000) return false

  return true
}

function ProtectedRoute() {
  const token = sessionStorage.getItem('token')

  if (!isTokenValid(token)) {
    // Remove any stale / expired / malformed token so the login page
    // starts fresh and the user is not confused by a lingering entry.
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('userEmail')
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
