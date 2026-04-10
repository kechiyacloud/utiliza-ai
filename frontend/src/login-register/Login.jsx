import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { CD_Blue } from '../Assets.jsx'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api from "../api/axios"

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const successMessage = location.state?.message || null

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)

    try {
      const response = await api.post("/login", {
        email: formData.email,
        password: formData.password
      })

      if (!response.data.token) {
        throw new Error("Login failed: no token received from server")
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("userEmail", formData.email);
      navigate("/info")

    } catch (err) {
      alert(err.response?.data?.detail || "Login failed")
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


      <p className="text-CD_Blue text-xs text-right font-semibold cursor-pointer">
        Forgot Password?
      </p>

      <button type="submit" className="form-button" >
        Sign In
      </button>
    </form>
  )
}

export default Login
