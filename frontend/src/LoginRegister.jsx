import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CD_Blue } from './Assets.jsx'
import WaveBackground from './login-register/WaveBackground.jsx'

function LoginRegister() {
  const navigate = useNavigate()
  const location = useLocation()
  const isLoginPage = location.pathname === '/' || location.pathname === '/login'

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/info', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="relative w-screen h-screen bg-mainTheme flex justify-center items-center">
      
      {/* LEFT: Form + Logo */}
      <div className="relative w-full h-full flex flex-col items-center justify-center pb-24">
        {/* Logo */}
        <div className="absolute flex justify-center items-center top-4 left-4 text-white font-bold text-sm">
            <CD_Blue className="mr-2 w-5 h-5"/>
            <p>Utiliza-AI</p>
        </div>

        {/* Dynamic Form */}
        <div className="flex flex-col items-center gap-2 w-80">
          <Outlet />

          {/* Switch links */}
          {location.pathname !== '/verify' && (
            <p className="text-white text-sm">
              {isLoginPage ? "New user?" : "Already a user?"}
              <button
                className="ml-1 font-bold text-white"
                onClick={() => navigate(isLoginPage ? '/register' : '/login')}
              >
                {isLoginPage ? "Register" : "Sign In"}
              </button>
            </p>
          )}
        </div>

        <div className='absolute bottom-0 w-full pointer-events-none'>
            <WaveBackground/>
        </div>
      </div>
    </div>
  )
}

export default LoginRegister