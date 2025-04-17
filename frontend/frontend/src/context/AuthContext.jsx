// frontend/frontend/src/context/AuthContext.jsx (korrigiert)
import { createContext, useContext, useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import { toast } from 'react-toastify'
import { loginUser, registerUser, getCurrentUser } from '../services/authService'

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
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [initializing, setInitializing] = useState(true)

  // App-Initialisierung: Token prüfen und Benutzer laden
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // Token dekodieren und auf Gültigkeit prüfen
          const decoded = jwtDecode(token)
          
          // Prüfen, ob der Token abgelaufen ist
          const currentTime = Date.now() / 1000
          if (decoded.exp < currentTime) {
            console.log("Token ist abgelaufen")
            handleLogout()
          } else {
            // Token ist gültig, Benutzer-Informationen abrufen
            setUser(decoded) // Erstmal aus Token setzen
            
            try {
              // Vollständige Benutzerinformationen vom Server abrufen
              const userResponse = await getCurrentUser()
              if (userResponse.success) {
                setUser(userResponse.data.data || decoded)
              }
            } catch (error) {
              console.error("Fehler beim Abrufen der Benutzerinformationen:", error)
              // Wir loggen den Benutzer nicht aus, da der Token noch gültig ist
            }
          }
        } catch (error) {
          console.error("Ungültiger Token:", error)
          handleLogout()
        }
      }
      
      setInitializing(false)
    }

    initAuth()
  }, [token])

  const handleLogin = async (email, password) => {
    setLoading(true)
    setAuthError(null)
    
    try {
      const result = await loginUser(email, password)
      
      if (result.success && result.data.token) {
        // Token sichern und speichern
        const token = result.data.token
        localStorage.setItem('token', token)
        setToken(token)
        
        // Benutzer aus Token dekodieren
        try {
          const decoded = jwtDecode(token)
          setUser(decoded)
        } catch (error) {
          console.error("Fehler beim Dekodieren des Tokens:", error)
        }
        
        toast.success('Erfolgreich angemeldet!', toastConfig)
        return true
      } else {
        throw new Error("Ungültige Antwort vom Server")
      }
    } catch (error) {
      console.error("Login fehlgeschlagen:", error)
      
      const errorMessage = error.response?.data?.message || 
                        'Anmeldung fehlgeschlagen. Bitte überprüfe deine E-Mail und dein Passwort.'
      
      setAuthError(errorMessage)
      toast.error(errorMessage, toastConfig)
      
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (userData) => {
    setLoading(true)
    setAuthError(null)
    
    try {
      const result = await registerUser(userData)
      
      if (result.success && result.data.token) {
        const token = result.data.token
        localStorage.setItem('token', token)
        setToken(token)
        
        try {
          const decoded = jwtDecode(token)
          setUser(decoded)
        } catch (error) {
          console.error("Fehler beim Dekodieren des Tokens:", error)
        }
        
        toast.success('Registrierung erfolgreich!', toastConfig)
        return true
      } else {
        throw new Error("Ungültige Antwort vom Server")
      }
    } catch (error) {
      console.error("Registrierung fehlgeschlagen:", error)
      
      const errorMessage = error.response?.data?.message || 
                        'Registrierung fehlgeschlagen. Diese E-Mail-Adresse könnte bereits verwendet werden.'
      
      setAuthError(errorMessage)
      toast.error(errorMessage, toastConfig)
      
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setAuthError(null)
    
    toast.info('Du wurdest abgemeldet.', toastConfig)
  }

  // NEUE METHODE: Benutzerdaten aktualisieren ohne erneute Anmeldung
  const updateSession = (userData) => {
    setUser(userData)
  }

  const clearError = () => {
    setAuthError(null)
  }

  // Aktualisierte Context-Provider-Werte
  const contextValue = {
    user,
    token,
    loading,
    error: authError,
    initialized: !initializing,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    clearError,
    updateSession // Neue Methode hinzufügen
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider


