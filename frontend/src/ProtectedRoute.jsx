import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from './hooks/usePermissions'

const ROLE_HIERARCHY = { restricted_viewer: 0, viewer: 1, editor: 2, master_admin: 3 }

function getTokenPayload(token) {
  try {
    const base64Payload = token.split('.')[1]
    if (!base64Payload) return null
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
  if (payload.exp && Date.now() >= payload.exp * 1000) return false
  return true
}

// minRole: if provided, redirect to /info/dashboard when role is below minimum
function ProtectedRoute({ minRole } = {}) {
  const token = localStorage.getItem('token')

  if (!isTokenValid(token)) {
    localStorage.removeItem('token')
    localStorage.removeItem('userEmail')
    return <Navigate to="/" replace />
  }

  if (minRole) {
    const payload = getTokenPayload(token)
    const role = payload?.role ?? 'restricted_viewer'
    if ((ROLE_HIERARCHY[role] ?? -1) < (ROLE_HIERARCHY[minRole] ?? 999)) {
      return <Navigate to="/info/dashboard" replace />
    }
  }

  return <Outlet />
}

export default ProtectedRoute
