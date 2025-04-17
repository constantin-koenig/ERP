// frontend/frontend/src/pages/profile/PasswordChangeForm.jsx (korrigiert)
import { useState } from 'react'
import { toast } from 'react-toastify'
import { updatePassword } from '../../services/authService'
import { useAuth } from '../../context/AuthContext'
import { LockClosedIcon } from '@heroicons/react/outline'

const PasswordChangeForm = () => {
  const { updateSession } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Fehler löschen, wenn der Benutzer beginnt zu tippen
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Bitte geben Sie Ihr aktuelles Passwort ein'
    }
    
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = 'Bitte geben Sie ein neues Passwort ein'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Das Passwort muss mindestens 6 Zeichen lang sein'
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Die Passwörter stimmen nicht überein'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    
    try {
      const response = await updatePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      })
      
      toast.success('Passwort wurde erfolgreich geändert')
      
      // Formular zurücksetzen
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Fehler beim Ändern des Passworts:', error)
      
      // Fehlerbehandlung basierend auf der API-Antwort
      if (error.response?.data?.message) {
        if (error.response.data.message.includes('Aktuelles Passwort ist falsch')) {
          setErrors({ currentPassword: 'Das aktuelle Passwort ist falsch' })
        } else {
          toast.error(error.response.data.message)
        }
      } else {
        toast.error('Fehler beim Ändern des Passworts')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
            Aktuelles Passwort
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="password"
              name="currentPassword"
              id="currentPassword"
              className={`block w-full pl-10 sm:text-sm rounded-md ${
                errors.currentPassword
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Aktuelles Passwort"
              value={formData.currentPassword}
              onChange={handleChange}
            />
          </div>
          {errors.currentPassword && (
            <p className="mt-2 text-sm text-red-600">{errors.currentPassword}</p>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
            Neues Passwort
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="password"
              name="newPassword"
              id="newPassword"
              className={`block w-full pl-10 sm:text-sm rounded-md ${
                errors.newPassword
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Neues Passwort"
              value={formData.newPassword}
              onChange={handleChange}
            />
          </div>
          {errors.newPassword && (
            <p className="mt-2 text-sm text-red-600">{errors.newPassword}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Passwort bestätigen
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              className={`block w-full pl-10 sm:text-sm rounded-md ${
                errors.confirmPassword
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Passwort bestätigen"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>
          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-w-[120px]"
          >
            {loading ? 'Wird geändert...' : 'Passwort ändern'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default PasswordChangeForm