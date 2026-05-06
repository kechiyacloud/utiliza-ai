import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { CD_Blue } from '../Assets.jsx'
import { Eye, EyeOff, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import api from "../api/axios"

const ALLOWED_DOMAIN = '@clouddestinations.com'
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const PASSWORD_RULES = [
  { label: 'At least 8 characters',         test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',     test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)',     test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0–9)',               test: (p) => /\d/.test(p) },
  { label: 'One special character (!@#$%…)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

function Register() {
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // 1=form, 2=otp
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const timerRef = useRef(null)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => () => clearInterval(timerRef.current), [])

  const rules = {
    length:  formData.password.length >= 8,
    upper:   /[A-Z]/.test(formData.password),
    lower:   /[a-z]/.test(formData.password),
    digit:   /\d/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]]/.test(formData.password),
  }
  const isStrong = Object.values(rules).every(Boolean)
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0
  const isEmailValid = EMAIL_REGEX.test(formData.email) && formData.email.toLowerCase().endsWith(ALLOWED_DOMAIN)
  const canSubmit = isStrong && passwordsMatch && isEmailValid

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function startCooldown() {
    setResendCooldown(60)
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  async function sendOtp() {
    setLoading(true)
    setError('')
    try {
      await api.post('/send-registration-otp', {
        email: formData.email.trim(),
        password: formData.password,
      })
      startCooldown()
      return true
    } catch (err) {
      const msg = err.code === 'ECONNABORTED'
        ? 'Connection timeout. The server might be offline.'
        : (err.response?.data?.detail || 'Failed to send OTP. Try again.')
      setError(msg)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault()
    const ok = await sendOtp()
    if (ok) setStep(2)
  }

  async function handleResendOtp() {
    setOtp('')
    await sendOtp()
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP from your email.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/register', { email: formData.email, otp: otp.trim() })
      navigate('/', { state: { message: 'Registration successful! You can now sign in.' } })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Verification failed. Try again.'
      setError(detail)
      if (detail.toLowerCase().includes('expired')) {
        setOtp('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <CD_Blue className="flex justify-center w-16 h-16 mb-2 mx-auto" />
      <h2 className="text-white text-2xl font-bold text-center mb-1">Register</h2>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-1">
        {[1, 2].map(s => (
          <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-CD_Blue' : s < step ? 'w-4 bg-CD_Blue/60' : 'w-4 bg-white/20'}`} />
        ))}
      </div>

      {step === 1 && (
        <p className="intro-text">From insight to impact <span className="mx-1">-</span> It starts here</p>
      )}
      {step === 2 && (
        <p className="text-white/50 text-xs text-center">
          Enter the 6-digit OTP sent to <span className="text-white/80">{formData.email}</span>
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-400/40 px-4 py-3 text-red-300 text-sm font-medium">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1 — Registration form */}
      {step === 1 && (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 w-full">
            <input type="email" name="email" placeholder="Email ID" value={formData.email} onChange={handleChange} className="input-field" autoComplete="username" required />
            {formData.email && !formData.email.toLowerCase().endsWith(ALLOWED_DOMAIN) && (
              <span className="text-xs text-red-400 px-1 font-medium flex items-center gap-1"><XCircle size={13} /> Only @clouddestinations.com emails are allowed</span>
            )}
          </div>

          <div className="relative input-field">
            <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="input-password" autoComplete="new-password" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="input-password-icon">
              {showPassword ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
            </button>
          </div>

          {formData.password.length > 0 && (
            <p className="text-xs px-1 leading-relaxed">
              {PASSWORD_RULES.map((rule, i) => {
                const passed = rule.test(formData.password)
                return (
                  <span key={rule.label}>
                    <span className={`inline-flex items-center gap-0.5 font-medium ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
                      {passed ? <CheckCircle2 size={13} className="flex-shrink-0" /> : <XCircle size={13} className="flex-shrink-0" />}
                      {rule.label}
                    </span>
                    {i < PASSWORD_RULES.length - 1 && <span className="text-gray-400">, </span>}
                  </span>
                )
              })}
            </p>
          )}

          <div className="flex flex-col gap-1 w-full">
            <div className="relative input-field">
              <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} className="input-password" autoComplete="new-password" required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="input-password-icon">
                {showConfirmPassword ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
              </button>
            </div>
            {formData.confirmPassword.length > 0 && !passwordsMatch && (
              <span className="text-xs text-red-400 px-1 font-medium flex items-center gap-1">
                <XCircle size={13} /> Passwords do not match
              </span>
            )}
          </div>

          <button
            type="submit"
            className={`form-button flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending OTP...
              </div>
            ) : 'Send OTP'}
          </button>
        </form>
      )}

      {/* Step 2 — OTP verification */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <input
            type="text" placeholder="6-digit OTP" value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input-field text-center tracking-widest text-lg font-semibold"
            maxLength={6} inputMode="numeric" autoComplete="one-time-code" required
          />

          <button
            type="submit"
            className={`form-button flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </div>
            ) : 'Verify & Register'}
          </button>

          <div className="flex items-center justify-between px-1">
            <button type="button" onClick={() => { setStep(1); setOtp(''); setError('') }} className="flex items-center gap-1 text-white/40 text-xs hover:text-white/70 transition-colors">
              ← Change details
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || loading}
              className={`text-xs font-semibold transition-colors ${resendCooldown > 0 || loading ? 'text-white/25 cursor-not-allowed' : 'text-CD_Blue hover:underline cursor-pointer'}`}
            >
              {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default Register
