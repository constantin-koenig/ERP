import { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify'
import { loginUser, registerUser } from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  return useContext(AuthContext)
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token)
        // Prüfe, ob der Token abgelaufen ist
        const currentTime = Date.now() / 1000
        if (decoded.exp < currentTime) {
          logout()
          toast.error('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.')
        } else {
          setUser(decoded)
        }
      } catch (error) {
        logout()
      }
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    try {
      setLoading(true)
      const response = await loginUser(email, password)
      const { token } = response.data
      localStorage.setItem('token', token)
      setToken(token)
      const decoded = jwtDecode(token)
      setUser(decoded)
      toast.success('Erfolgreich angemeldet!')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Anmeldung fehlgeschlagen')
      return false
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    try {
      setLoading(true)
      const response = await registerUser(userData)
      const { token } = response.data
      localStorage.setItem('token', token)
      setToken(token)
      const decoded = jwtDecode(token)
      setUser(decoded)
      toast.success('Registrierung erfolgreich!')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registrierung fehlgeschlagen')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
