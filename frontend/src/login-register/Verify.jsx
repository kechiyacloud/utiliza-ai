import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CD_Blue } from '../Assets.jsx'
import api from "../api/axios"
import { toast } from 'react-hot-toast'

function Verify() {
  const navigate = useNavigate()
  const location = useLocation()

  const email = location.state?.email

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true })
    }
  }, [email, navigate])

  const [formData, setFormData] = useState({
    verifyCode: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async(e) => {
    e.preventDefault()

    try {
      await api.post("/verify", {
        email,
        code: formData.verifyCode
      })

      navigate("/login", { replace: true })

    } catch (err) {
      toast.error(err.response?.data?.detail || "Verification failed")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <CD_Blue className="flex justify-center w-16 h-16 mb-2 mx-auto"/>
      <h2 className="text-white text-2xl font-bold text-center mb-1">
        Verification Code
      </h2>

      <p className="intro-text">
        From insight to impact <span className="mx-1">-</span> It starts here
      </p>

      <input type="text" name="verifyCode" placeholder="Verification Code" value={formData.verifyCode} onChange={handleChange} className="input-field" required/>

      <p className="text-CD_Blue text-xs text-right font-semibold cursor-pointer">
        Resend Code
      </p>

      <button type="submit" className="form-button" >
        Verify
      </button>
    </form>
  )
}

export default Verify
