import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { CD_Blue } from '../Assets.jsx'
import { Eye, EyeOff, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import api from "../api/axios"

const PASSWORD_RULES = [
  { label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',     test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)',     test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0–9)',               test: (p) => /\d/.test(p) },
  { label: 'One special character (!@#$%…)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

function Register() {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  const rules = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    digit: /\d/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(formData.password),
  }
  const isStrong = Object.values(rules).every(Boolean)
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
  const canSubmit = isStrong && passwordsMatch

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const passwordRulesPassed = PASSWORD_RULES.every(r => r.test(formData.password))
  const showStrengthChecklist = formData.password.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!passwordRulesPassed) {
      setError("Please meet all password requirements before continuing")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setError('')
    setLoading(true)

    try {
      await api.post("/register", {
        email: formData.email,
        password: formData.password,
      })

      navigate("/", { state: { message: "Registration successful! You can now sign in." } })

    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <CD_Blue className="flex justify-center w-16 h-16 mb-2 mx-auto"/>
      <h2 className="text-white text-2xl font-bold text-center mb-1">
        Register
      </h2>

      <p className="intro-text">
        From insight to impact <span className="mx-1">-</span> It starts here
      </p>

      <input type="email" name="email" placeholder="Email ID" value={formData.email} onChange={handleChange} className="input-field" autoComplete="username" required/>

      <div className="relative input-field">

        <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="input-password" autoComplete="new-password" required />

        <button type="button" onClick={() => setShowPassword(!showPassword)} className="input-password-icon" >
          {showPassword ? ( <EyeOff size={16} strokeWidth={1.6} /> ) : ( <Eye size={16} strokeWidth={1.6} /> )}
        </button>

      </div>

      {showStrengthChecklist && (
        <ul className="flex flex-col gap-1 px-1">
          {PASSWORD_RULES.map((rule) => {
            const passed = rule.test(formData.password)
            return (
              <li key={rule.label} className={`flex items-center gap-2 text-xs font-medium ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {passed
                  ? <CheckCircle2 size={13} className="flex-shrink-0" />
                  : <XCircle size={13} className="flex-shrink-0" />}
                {rule.label}
              </li>
            )
          })}
        </ul>
      )}

      <div className="relative input-field">

        <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} className="input-password" autoComplete="new-password" required />

        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="input-password-icon" >
          {showConfirmPassword ? ( <EyeOff size={16} strokeWidth={1.6} /> ) : ( <Eye size={16} strokeWidth={1.6} /> )}
        </button>
        
      </div>

      {/* <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="input-field" required/> */}

      {/* <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-CD_Blue transition">
        {showConfirmPassword ? "🙈" : "👁"}
      </button> */}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-3 text-red-300 text-sm font-medium">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        className="form-button disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!canSubmit || loading}
      >
        Register
      </button>
    </form>
  )
}

export default Register
