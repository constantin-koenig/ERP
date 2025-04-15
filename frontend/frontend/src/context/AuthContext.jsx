// src/context/AuthContext.jsx - Korrigierte Version
import { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'  // Korrekter Import für neuere jwt-decode Versionen
import { toast } from 'react-toastify'
import { loginUser, registerUser } from '../services/authService'

const AuthContext = createContext()

export const useAuth = () => {
  return useContext(AuthContext)
}

// Toast-Konfigurationen für längere Anzeigedauer
const toastConfig = {
  position: "top-right",
  autoClose: 5000,  // 5 Sekunden statt der Standarddauer
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token)
        // Prüfe, ob der Token abgelaufen ist
        const currentTime = Date.now() / 1000
        if (decoded.exp < currentTime) {
          logout()
          toast.error('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.', toastConfig)
        } else {
          setUser(decoded)
        }
      } catch (error) {
        console.error('Token decode error:', error)
        logout()
        toast.error('Ungültiger Token. Bitte melde dich erneut an.', toastConfig)
      }
    }
    setLoading(false)
  }, [token])

  const login = async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      const response = await loginUser(email, password)
      const { token } = response.data
      localStorage.setItem('token', token)
      setToken(token)
      const decoded = jwtDecode(token)
      setUser(decoded)
      toast.success('Erfolgreich angemeldet!', toastConfig)
      return true
    } catch (error) {
      console.error('Login error:', error)
      setError(
        error.response?.data?.message || 
        'Anmeldung fehlgeschlagen. Bitte überprüfe deine E-Mail und dein Passwort.'
      )
      toast.error(
        error.response?.data?.message || 
        'Anmeldung fehlgeschlagen. Bitte überprüfe deine E-Mail und dein Passwort.', 
        toastConfig
      )
      return false
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData) => {
    try {
      setLoading(true)
      setError(null)
      const response = await registerUser(userData)
      const { token } = response.data
      localStorage.setItem('token', token)
      setToken(token)
      const decoded = jwtDecode(token)
      setUser(decoded)
      toast.success('Registrierung erfolgreich!', toastConfig)
      return true
    } catch (error) {
      console.error('Registration error:', error)
      setError(
        error.response?.data?.message || 
        'Registrierung fehlgeschlagen. Diese E-Mail-Adresse könnte bereits verwendet werden.'
      )
      toast.error(
        error.response?.data?.message || 
        'Registrierung fehlgeschlagen. Diese E-Mail-Adresse könnte bereits verwendet werden.', 
        toastConfig
      )
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setError(null)
    // Optional: Toast-Nachricht beim Ausloggen
    toast.info('Du wurdest abgemeldet.', toastConfig)
  }

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}