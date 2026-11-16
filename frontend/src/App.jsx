import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Today from './pages/Today'
import Profile from './pages/Profile'
import { ThemeProvider } from './ThemeContext'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  // enquanto confere a sessão, não mostra nada: a página entra direto com a animação
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

// A key muda a cada rota: o React recria o wrapper e a animação de entrada roda de novo.
function AnimatedRoutes() {
  const location = useLocation()
  return (
      <PageEnter key={location.pathname}>
              <Routes location={location}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/home" element={<PrivateRoute><Today /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
      </PageEnter>
  )
}

// Depois da entrada, desliga a animação: o que aparecer depois (troca de aba, listas) não refaz a cascata.
const ENTER_MS = 1200

function PageEnter({ children }) {
  const [entering, setEntering] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setEntering(false), ENTER_MS)
    return () => clearTimeout(timer)
  }, [])

  return <div className={entering ? 'page-enter' : undefined}>{children}</div>
}