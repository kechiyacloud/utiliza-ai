import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { CD_Blue } from '../Assets.jsx'
import { Eye, EyeOff } from 'lucide-react';
import api from "../api/axios"

function Register() {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      await api.post("/register", {
        email: formData.email,
        password: formData.password,
      })

      navigate("/", { state: { message: "Registration successful! Please log in." } })
      // navigate("/verify", { state: { email: formData.email } })

    } catch (err) {
      alert(err.response?.data?.detail || "Registration failed") 
      // python sends detail - node sends message
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

      <button type="submit" className="form-button">
        Register
      </button>
    </form>
  )
}

export default Register
