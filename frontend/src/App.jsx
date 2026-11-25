import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Today from './pages/Today'
import Profile from './pages/Profile'
import { ThemeProvider } from './ThemeContext'
import { EMAIL_FEATURES } from './features'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
      <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <AnimatedRoutes />
            </BrowserRouter>
          </AuthProvider>
      </ThemeProvider>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
      <PageEnter key={location.pathname}>
              <Routes location={location}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                {EMAIL_FEATURES && <Route path="/forgot-password" element={<ForgotPassword />} />}
                <Route path="/home" element={<PrivateRoute><Today /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
      </PageEnter>
  )
}

const ENTER_MS = 1200

function PageEnter({ children }) {
  const [entering, setEntering] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), ENTER_MS)
    return () => clearTimeout(timer)
  }, [])

  return <div className={entering ? 'page-enter' : undefined}>{children}</div>
}