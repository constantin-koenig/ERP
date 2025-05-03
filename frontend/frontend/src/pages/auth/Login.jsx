// src/pages/auth/Login.jsx (angepasst)
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ExclamationCircleIcon } from '@heroicons/react/outline'

const Login = () => {
  const navigate = useNavigate()
  const { login, loading, error, user, clearError, initialized } = useAuth()
  
  // Form-Zustand
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Redirect wenn bereits angemeldet
  useEffect(() => {
    if (initialized && user) {
      // Prüfen, ob ein gespeicherter Pfad existiert
      const redirectPath = sessionStorage.getItem('redirectPath')
      if (redirectPath) {
        // Pfad aus dem Storage entfernen
        sessionStorage.removeItem('redirectPath')
        navigate(redirectPath)
      } else {
        // Kein gespeicherter Pfad, zum Dashboard navigieren
        navigate('/')
      }
    }
    
    // Fehler beim unmounten zurücksetzen
    return () => {
      if (clearError) clearError()
    }
  }, [user, navigate, clearError, initialized])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Formular aktualisieren
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Feldspezifischen Fehler löschen, wenn Benutzer tippt
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    let tempErrors = {}
    let isValid = true
    
    // E-Mail-Validierung
    if (!formData.email.trim()) {
      tempErrors.email = 'E-Mail ist erforderlich'
      isValid = false
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      tempErrors.email = 'Ungültige E-Mail-Adresse'
      isValid = false
    }
    
    // Passwort-Validierung
    if (!formData.password) {
      tempErrors.password = 'Passwort ist erforderlich'
      isValid = false
    }
    
    setFormErrors(tempErrors)
    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Verhindern von Form-Submission, wenn bereits geladen wird
    if (loading) return
    
    setSubmitAttempted(true)
    
    if (validateForm()) {
      try {
        // WICHTIG: Wir fangen den Fehler hier ab, statt ihn weiterzuleiten,
        // damit die Seite nicht neu geladen wird
        await login(formData.email, formData.password)
        // Wenn erfolgreich, wird useEffect für die Weiterleitung sorgen
      } catch (err) {
        // Wir brauchen hier nichts zu tun, da der Fehler bereits in AuthContext verarbeitet wird
        console.log("Login failed but handled in component:", err)
      }
    }
  }

  // Zeige Ladeindikator während der Initialisierung
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="spinner"></div>
        <p className="ml-2 text-gray-600">Anwendung wird initialisiert...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Anmelden
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Oder{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              registrieren Sie sich hier
            </Link>
          </p>
        </div>
        
        {/* Globales Fehlerfeld */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Anmeldung fehlgeschlagen</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-Mail-Adresse
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`appearance-none block w-full px-3 py-2 border ${
                    formErrors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="E-Mail-Adresse"
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={formErrors.email ? 'true' : 'false'}
                  aria-describedby={formErrors.email ? "email-error" : undefined}
                />
                {formErrors.email && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                  </div>
                )}
              </div>
              {formErrors.email && (
                <p className="mt-2 text-sm text-red-600" id="email-error">{formErrors.email}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Passwort
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={`appearance-none block w-full px-3 py-2 border ${
                    formErrors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Passwort"
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={formErrors.password ? 'true' : 'false'}
                  aria-describedby={formErrors.password ? "password-error" : undefined}
                />
                {formErrors.password && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                  </div>
                )}
              </div>
              {formErrors.password && (
                <p className="mt-2 text-sm text-red-600" id="password-error">{formErrors.password}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Angemeldet bleiben
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Passwort vergessen?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Wird angemeldet...
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login