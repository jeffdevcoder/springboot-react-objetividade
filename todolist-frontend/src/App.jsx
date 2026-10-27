import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Today from './pages/Today'
import { ThemeProvider } from './ThemeContext'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p>Carregando...</p>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
      <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/today" element={<PrivateRoute><Today /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
      </ThemeProvider>
  )
}