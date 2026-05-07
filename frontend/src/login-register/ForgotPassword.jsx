import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { CD_Blue } from '../Assets.jsx'
import { Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react'
import api from '../api/axios'

const PASSWORD_RULES = [
  { label: 'At least 8 characters',          test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',      test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)',      test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0–9)',                test: (p) => /\d/.test(p) },
  { label: 'One special character (!@#$%…)',  test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=email, 2=otp, 3=new password
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const timerRef = useRef(null)

  const passwordValid = PASSWORD_RULES.every(r => r.test(password))
  const passwordsMatch = password === confirmPassword

  useEffect(() => () => clearInterval(timerRef.current), [])

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
      await api.post('/forgot-password', { email })
      startCooldown()
      return true
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Try again.')
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
    await sendOtp()
    setOtp('')
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP from your email.')
      return
    }
    setError('')
    setStep(3)
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!passwordValid) { setError('Password does not meet requirements.'); return }
    if (!passwordsMatch) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError('')
    try {
      await api.post('/reset-password', { email, otp: otp.trim(), new_password: password })
      navigate('/', { state: { message: 'Password reset successfully. Please sign in.' } })
    } catch (err) {
      const detail = err.response?.data?.detail || 'Reset failed. Check your OTP and try again.'
      setError(detail)
      if (detail.toLowerCase().includes('otp')) setStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <CD_Blue className="flex justify-center w-16 h-16 mb-2 mx-auto" />
      <h2 className="text-white text-2xl font-bold text-center">Reset Password</h2>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-1">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-CD_Blue' : s < step ? 'w-4 bg-CD_Blue/60' : 'w-4 bg-white/20'}`} />
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-500/20 border border-rose-400/40 px-4 py-3 text-rose-300 text-sm font-medium">
          <div className="flex-shrink-0 w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
          {error}
        </div>
      )}

      {/* Step 1 — Email */}
      {step === 1 && (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
          <p className="text-white/50 text-xs text-center">Enter your work email and we'll send you an OTP</p>
          <input
            type="email" placeholder="Email ID" value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-field" autoComplete="email" required
          />
          <button
            type="submit"
            className={`form-button flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending OTP...
              </div>
            ) : 'Send OTP'}
          </button>
          <button type="button" onClick={() => navigate('/')} className="flex items-center justify-center gap-1 text-white/40 text-xs hover:text-white/70 transition-colors">
            <ArrowLeft size={12} /> Back to Sign In
          </button>
        </form>
      )}

      {/* Step 2 — OTP */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <p className="text-white/50 text-xs text-center">Enter the 6-digit OTP sent to <span className="text-white/80">{email}</span></p>
          <input
            type="text" placeholder="6-digit OTP" value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="input-field text-center tracking-widest text-lg font-semibold"
            maxLength={6} inputMode="numeric" autoComplete="one-time-code" required
          />
          <button type="submit" className="form-button">
            Verify OTP
          </button>
          <button type="button" onClick={() => { setStep(1); setOtp(''); setError('') }} className="flex items-center justify-center gap-1 text-white/40 text-xs hover:text-white/70 transition-colors">
            <ArrowLeft size={12} /> Change email
          </button>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCooldown > 0 || loading}
            className={`text-xs font-semibold text-center transition-colors ${resendCooldown > 0 || loading ? 'text-white/40 cursor-not-allowed' : 'text-CD_Blue hover:underline cursor-pointer'}`}
          >
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
          </button>
        </form>
      )}

      {/* Step 3 — New password */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
          <p className="text-white/50 text-xs text-center">Create your new password</p>

          <div className="relative input-field">
            <input
              type={showPassword ? 'text' : 'password'} placeholder="New Password"
              value={password} onChange={e => setPassword(e.target.value)}
              className="input-password" autoComplete="new-password" required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="input-password-icon">
              {showPassword ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
            </button>
          </div>

          {password && (
            <ul className="flex flex-col gap-1 px-1">
              {PASSWORD_RULES.map(r => (
                <li key={r.label} className={`flex items-center gap-2 text-xs transition-colors ${r.test(password) ? 'text-emerald-400' : 'text-white/40'}`}>
                  <CheckCircle2 size={11} />
                  {r.label}
                </li>
              ))}
            </ul>
          )}

          <div className="relative input-field">
            <input
              type={showConfirm ? 'text' : 'password'} placeholder="Confirm Password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="input-password" autoComplete="new-password" required
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="input-password-icon">
              {showConfirm ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
            </button>
          </div>

          <button
            type="submit"
            className={`form-button flex items-center justify-center ${loading || !passwordValid || !passwordsMatch ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={loading || !passwordValid || !passwordsMatch}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting...
              </div>
            ) : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  )
}

export default ForgotPassword
