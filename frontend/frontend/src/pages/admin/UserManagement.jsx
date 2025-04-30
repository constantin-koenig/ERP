// frontend/frontend/src/pages/admin/UserManagement.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getUsers, deleteUser, inviteUser } from '../../services/authService'
import { PlusIcon, PencilIcon, TrashIcon, MailIcon } from '@heroicons/react/outline'
import UserInvitationModal from './UserInvitationModal'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { getFullImageUrl } from '../../services/axiosInstance'
import { useTheme } from '../../context/ThemeContext'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await getUsers()
      setUsers(response.data.data)
      setLoading(false)
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error)
      toast.error('Fehler beim Laden der Benutzer')
      setLoading(false)
    }
  }

  const handleDelete = async (id, userName) => {
    if (window.confirm(`Möchten Sie den Benutzer "${userName}" wirklich löschen?`)) {
      try {
        await deleteUser(id)
        toast.success(`Benutzer "${userName}" erfolgreich gelöscht`)
        fetchUsers()
      } catch (error) {
        console.error('Fehler beim Löschen des Benutzers:', error)
        if (error.response?.status === 400 && error.response?.data?.message) {
          toast.error(error.response.data.message)
        } else {
          toast.error('Fehler beim Löschen des Benutzers')
        }
      }
    }
  }

  const handleInvite = async (userData) => {
    try {
      await inviteUser(userData)
      toast.success(`Einladung an ${userData.email} wurde gesendet`)
      setShowInviteModal(false)
      fetchUsers()
    } catch (error) {
      console.error('Fehler beim Einladen des Benutzers:', error)
      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Fehler beim Einladen des Benutzers')
      }
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: de })
    } catch (error) {
      return dateString
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return isDarkMode 
          ? 'bg-red-900 text-red-100' 
          : 'bg-red-100 text-red-800'
      case 'manager':
        return isDarkMode 
          ? 'bg-blue-900 text-blue-100' 
          : 'bg-blue-100 text-blue-800'
      case 'user':
      default:
        return isDarkMode 
          ? 'bg-green-900 text-green-100' 
          : 'bg-green-100 text-green-800'
    }
  }

  const translateRole = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator'
      case 'manager':
        return 'Manager'
      case 'user':
      default:
        return 'Benutzer'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Benutzerverwaltung</h1>
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Benutzer einladen
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
          <p className={`ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Benutzer werden geladen...</p>
        </div>
      ) : (
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden sm:rounded-lg`}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}
                >
                  Name
                </th>
                <th
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}
                >
                  E-Mail
                </th>
                <th
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}
                >
                  Rolle
                </th>
                <th
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}
                >
                  Status
                </th>
                <th
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}
                >
                  Letzte Anmeldung
                </th>
                <th
                  scope="col"
                  className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}
                >
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} divide-y divide-gray-200 dark:divide-gray-700`}>
              {users.map((user) => (
                <tr key={user._id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {user.profileImage ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={getFullImageUrl(user.profileImage)}
                            alt={user.name}
                          />
                        ) : (
                          <div className={`h-10 w-10 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'} flex items-center justify-center`}>
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.name}</div>
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user.position || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {translateRole(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.active
                          ? isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                          : isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    {user.lastLogin ? formatDate(user.lastLogin) : 'Noch nie'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/users/${user._id}`}
                      className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'} mr-3`}
                    >
                      <PencilIcon className="h-5 w-5 inline" title="Bearbeiten" />
                    </Link>
                    <button
                      onClick={() => window.confirm(`Möchten Sie ${user.email} erneut einladen?`)}
                      className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'} mr-3`}
                    >
                      <MailIcon className="h-5 w-5 inline" title="Erneut einladen" />
                    </button>
                    <button
                      onClick={() => handleDelete(user._id, user.name)}
                      className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}`}
                      disabled={user.role === 'admin'}
                    >
                      <TrashIcon
                        className={`h-5 w-5 inline ${
                          user.role === 'admin' ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                        title={
                          user.role === 'admin'
                            ? 'Administratoren können nicht gelöscht werden'
                            : 'Löschen'
                        }
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Benutzer-Einladungs-Modal */}
      <UserInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default UserManagement