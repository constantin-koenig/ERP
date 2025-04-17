// frontend/frontend/src/pages/profile/UserProfile.jsx (Layout-Korrektur)
import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { updateUserDetails } from '../../services/authService'
import ProfileImageUpload from './ProfileImageUpload'
import PasswordChangeForm from './PasswordChangeForm'
import {
  UserCircleIcon,
  ColorSwatchIcon,
  GlobeIcon,
  BellIcon
} from '@heroicons/react/outline'

const UserProfile = () => {
  const { user, updateSession } = useAuth() 
  
  const [loading, setLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    settings: {
      theme: 'system',
      language: 'de',
      notifications: {
        email: true,
        browser: true
      },
      dashboardLayout: 'default'
    }
  })

  // Profildaten laden, wenn Benutzer vorhanden ist
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        position: user.position || '',
        settings: {
          theme: user.settings?.theme || 'system',
          language: user.settings?.language || 'de',
          notifications: {
            email: user.settings?.notifications?.email !== false,
            browser: user.settings?.notifications?.browser !== false
          },
          dashboardLayout: user.settings?.dashboardLayout || 'default'
        }
      })
    }
  }, [user])

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.startsWith('notifications.')) {
      // Behandlung von verschachtelten Notification-Einstellungen
      const notificationKey = name.split('.')[1] // z.B. 'email' aus 'notifications.email'
      
      setProfileData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          notifications: {
            ...prev.settings.notifications,
            [notificationKey]: checked
          }
        }
      }))
    } else {
      // Direkte Settings-Einstellungen
      setProfileData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [name]: type === 'checkbox' ? checked : value
        }
      }))
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await updateUserDetails({
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        position: profileData.position
      })
      
      if (response.data.success) {
        toast.success('Persönliche Daten erfolgreich aktualisiert')
        
        // Aktualisiere den Auth-Kontext ohne neue Anmeldung zu versuchen
        if (updateSession) {
          updateSession(response.data.data)
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Profils:', error)
      toast.error('Fehler beim Aktualisieren der persönlichen Daten')
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsSubmit = async (e) => {
    e.preventDefault()
    setSettingsLoading(true)
    
    try {
      const response = await updateUserDetails({
        settings: profileData.settings
      })
      
      if (response.data.success) {
        toast.success('Einstellungen erfolgreich aktualisiert')
        
        // Aktualisiere den Auth-Kontext ohne neue Anmeldung zu versuchen
        if (updateSession) {
          updateSession(response.data.data)
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Einstellungen:', error)
      toast.error('Fehler beim Aktualisieren der Einstellungen')
    } finally {
      setSettingsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Benutzerprofil</h1>
        
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="md:flex">
            <div className="md:w-1/3 bg-gray-50 p-6 border-r border-gray-200">
              <ProfileImageUpload />
            </div>
            
            <div className="md:w-2/3 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Persönliche Informationen</h2>
              
              <form onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={profileData.name}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      E-Mail-Adresse
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={profileData.email}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Telefon
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="phone"
                        id="phone"
                        value={profileData.phone}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                      Position
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="position"
                        id="position"
                        value={profileData.position}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-w-[120px]"
                  >
                    {loading ? 'Wird gespeichert...' : 'Speichern'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Benutzereinstellungen */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Einstellungen</h2>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSettingsSubmit}>
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2">
                {/* Design-Einstellungen */}
                <div className="col-span-1">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <ColorSwatchIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
                        Design
                      </label>
                      <div className="mt-1">
                        <select
                          id="theme"
                          name="theme"
                          value={profileData.settings.theme}
                          onChange={handleSettingsChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="system">Systemeinstellung</option>
                          <option value="light">Hell</option>
                          <option value="dark">Dunkel</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sprache */}
                <div className="col-span-1">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <GlobeIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                        Sprache
                      </label>
                      <div className="mt-1">
                        <select
                          id="language"
                          name="language"
                          value={profileData.settings.language}
                          onChange={handleSettingsChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="de">Deutsch</option>
                          <option value="en">Englisch</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashboard-Ansicht */}
                <div className="col-span-1">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <UserCircleIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="dashboardLayout" className="block text-sm font-medium text-gray-700">
                        Dashboard-Ansicht
                      </label>
                      <div className="mt-1">
                        <select
                          id="dashboardLayout"
                          name="dashboardLayout"
                          value={profileData.settings.dashboardLayout}
                          onChange={handleSettingsChange}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                          <option value="default">Standard</option>
                          <option value="compact">Kompakt</option>
                          <option value="detailed">Detailliert</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Benachrichtigungen */}
                <div className="col-span-1">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <BellIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-700">Benachrichtigungen</span>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="notifications.email"
                              name="notifications.email"
                              type="checkbox"
                              checked={profileData.settings.notifications.email}
                              onChange={handleSettingsChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="notifications.email" className="font-medium text-gray-700">
                              E-Mail-Benachrichtigungen
                            </label>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="notifications.browser"
                              name="notifications.browser"
                              type="checkbox"
                              checked={profileData.settings.notifications.browser}
                              onChange={handleSettingsChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="notifications.browser" className="font-medium text-gray-700">
                              Browser-Benachrichtigungen
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 min-w-[120px]"
                >
                  {settingsLoading ? 'Wird gespeichert...' : 'Einstellungen speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Passwort ändern */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Passwort ändern</h2>
          </div>
          <div className="p-6">
            <PasswordChangeForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile