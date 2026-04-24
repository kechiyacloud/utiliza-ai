import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CD_Blue } from '../Assets.jsx'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api from "../api/axios"

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState(null)

  const [successMessage] = useState(location.state?.message || null)

  useEffect(() => {
    if (location.state?.message) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [])

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const email = formData.email.trim()
    const password = formData.password.trim()

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.post("/login", { email, password })

      if (!response.data.token) {
        throw new Error("Login failed: no token received from server")
      }

      sessionStorage.setItem("token", response.data.token);
      sessionStorage.setItem("userEmail", formData.email.trim());
      navigate("/info")

    } catch (err) {
      console.error("Login attempt failed:", err);
      const errorMessage = err.code === 'ECONNABORTED' 
        ? "Connection timeout. Please check your internet or if the server is down."
        : (err.response?.data?.detail || "Login failed. Please check your credentials.");
      setError(errorMessage);
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <CD_Blue className="flex justify-center w-16 h-16 mb-2 mx-auto" />
      <h2 className="text-white text-2xl font-bold text-center">
        Sign In
      </h2>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-4 py-3 text-emerald-300 text-sm font-medium">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-400/40 px-4 py-3 text-rose-300 text-sm font-medium">
          <div className="flex-shrink-0 w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
          {error}
        </div>
      )}

      <p className="intro-text">
        One view <span className="mx-1">·</span> Every insight <span className="mx-1">·</span> Complete control
      </p>

      <input type="email" name="email" placeholder="Email ID" value={formData.email} onChange={handleChange} className="input-field" autoComplete="username" required />

      <div className="relative input-field">

        <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="input-password" autoComplete="current-password" required />

        <button type="button" onClick={() => setShowPassword(!showPassword)} className="input-password-icon" >
          {showPassword ? (<EyeOff size={16} strokeWidth={1.6} />) : (<Eye size={16} strokeWidth={1.6} />)}
        </button>

      </div>


      <p
        className="text-CD_Blue text-xs text-right font-semibold cursor-pointer hover:underline"
        onClick={() => navigate('/forgot-password')}
      >
        Forgot Password?
      </p>

      <button 
        type="submit" 
        className={`form-button flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        disabled={loading}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            Signing In...
          </div>
        ) : 'Sign In'}
      </button>

    </form>
  )
}

export default Login
