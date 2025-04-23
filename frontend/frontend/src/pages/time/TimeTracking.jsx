// src/pages/time/TimeTracking.jsx - Mit Benutzerzuweisung
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { 
  getTimeTrackings, 
  deleteTimeTracking, 
  updateTimeTrackingBillingStatus,
  assignTimeTracking 
} from '../../services/timeTrackingService'
import { getAssignableUsers } from '../../services/authService'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XIcon,
  UserIcon,
  UserAddIcon 
} from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import SearchAndFilter from '../../components/ui/SearchAndFilter'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { useTheme } from '../../context/ThemeContext'

const TimeTracking = () => {
  const [timeEntries, setTimeEntries] = useState([])
  const [filteredEntries, setFilteredEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([]) // Benutzer für Zuweisungen
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const { isDarkMode } = useTheme()
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('startTime_desc')
  const [filterValues, setFilterValues] = useState({
    billed: '',
    order: '',
    assignedTo: '', // Neu: Filter nach zugewiesenem Benutzer
    minDuration: '',
    maxDuration: ''
  })

  useEffect(() => {
    fetchTimeEntries()
    fetchUsers() // Benutzer für Zuweisungen laden
  }, [])
  
  // Effect for filtering and sorting time entries
  useEffect(() => {
    if (!timeEntries.length) return setFilteredEntries([])
    
    let result = [...timeEntries]
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(entry => 
        (entry.description && entry.description.toLowerCase().includes(lowerSearch)) ||
        (entry.order && typeof entry.order === 'object' && entry.order.orderNumber && 
         entry.order.orderNumber.toLowerCase().includes(lowerSearch)) ||
        (entry.assignedTo && typeof entry.assignedTo === 'object' && entry.assignedTo.name &&
         entry.assignedTo.name.toLowerCase().includes(lowerSearch))
      )
    }
    
    // Apply billing status filter
    if (filterValues.billed !== '') {
      const isBilled = filterValues.billed === 'true'
      result = result.filter(entry => entry.billed === isBilled)
    }
    
    // Apply order filter if needed
    if (filterValues.order) {
      result = result.filter(entry => {
        if (!entry.order) return false
        if (typeof entry.order === 'object') {
          return entry.order._id === filterValues.order
        }
        return entry.order === filterValues.order
      })
    }
    
    // Apply assignedTo filter if needed
    if (filterValues.assignedTo) {
      result = result.filter(entry => {
        if (!entry.assignedTo) return false
        if (typeof entry.assignedTo === 'object') {
          return entry.assignedTo._id === filterValues.assignedTo
        }
        return entry.assignedTo === filterValues.assignedTo
      })
    }
    
    // Apply duration filters if set
    if (filterValues.minDuration) {
      const minMinutes = parseInt(filterValues.minDuration, 10)
      if (!isNaN(minMinutes)) {
        result = result.filter(entry => (entry.duration || 0) >= minMinutes)
      }
    }
    
    if (filterValues.maxDuration) {
      const maxMinutes = parseInt(filterValues.maxDuration, 10)
      if (!isNaN(maxMinutes)) {
        result = result.filter(entry => (entry.duration || 0) <= maxMinutes)
      }
    }
    
    // Apply sorting
    if (sortOption) {
      const [field, direction] = sortOption.split('_')
      result.sort((a, b) => {
        let comparison = 0
        
        // Special handling for date fields
        if (field === 'startTime' || field === 'endTime' || field === 'createdAt') {
          const aDate = a[field] ? new Date(a[field]) : new Date(0)
          const bDate = b[field] ? new Date(b[field]) : new Date(0)
          comparison = aDate - bDate
        }
        // Special handling for order number
        else if (field === 'order') {
          const aOrder = (a.order && typeof a.order === 'object') ? a.order.orderNumber || '' : ''
          const bOrder = (b.order && typeof b.order === 'object') ? b.order.orderNumber || '' : ''
          comparison = aOrder.localeCompare(bOrder)
        }
        // Special handling for assigned user
        else if (field === 'assignedTo') {
          const aName = (a.assignedTo && typeof a.assignedTo === 'object') ? a.assignedTo.name || '' : ''
          const bName = (b.assignedTo && typeof b.assignedTo === 'object') ? b.assignedTo.name || '' : ''
          comparison = aName.localeCompare(bName)
        }
        // Default string or number comparison
        else {
          const aVal = a[field] ?? ''
          const bVal = b[field] ?? ''
          if (typeof aVal === 'string') {
            comparison = aVal.localeCompare(bVal)
          } else {
            comparison = aVal - bVal
          }
        }
        
        return direction === 'asc' ? comparison : -comparison
      })
    }
    
    setFilteredEntries(result)
  }, [timeEntries, searchTerm, sortOption, filterValues])

  const fetchTimeEntries = async () => {
    try {
      setLoading(true)
      const response = await getTimeTrackings()
      setTimeEntries(response.data.data)
      setLoading(false)
    } catch (error) {
      toast.error('Fehler beim Laden der Zeiteinträge')
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await getAssignableUsers()
      setUsers(response.data.data)
    } catch (error) {
      toast.error('Fehler beim Laden der Benutzer')
    }
  }

  const handleDelete = async (id, isBilled) => {
    if (isBilled) {
      toast.warning('Abgerechnete Zeiten können nicht gelöscht werden')
      return
    }
    
    if (window.confirm('Möchten Sie diesen Zeiteintrag wirklich löschen?')) {
      try {
        await deleteTimeTracking(id)
        toast.success('Zeiteintrag erfolgreich gelöscht')
        fetchTimeEntries()
      } catch (error) {
        toast.error('Fehler beim Löschen des Zeiteintrags')
      }
    }
  }
  
  const handleToggleBilled = async (id, currentStatus) => {
    try {
      await updateTimeTrackingBillingStatus(id, !currentStatus)
      toast.success(`Zeiteintrag als ${!currentStatus ? 'abgerechnet' : 'nicht abgerechnet'} markiert`)
      fetchTimeEntries()
    } catch (error) {
      toast.error('Fehler beim Ändern des Abrechnungsstatus')
    }
  }
  
  // Handler für Benutzerzuweisung
  const handleOpenAssignModal = (entry) => {
    setSelectedEntry(entry)
    setShowAssignModal(true)
  }
  
  const handleAssignUser = async (userId) => {
    if (!selectedEntry) return
    
    try {
      await assignTimeTracking(selectedEntry._id, userId)
      toast.success('Benutzer erfolgreich zugewiesen')
      fetchTimeEntries()
      setShowAssignModal(false)
      setSelectedEntry(null)
    } catch (error) {
      toast.error('Fehler bei der Benutzerzuweisung')
    }
  }
  
  const handleSearch = (value) => {
    setSearchTerm(value)
  }

  const handleSort = (value) => {
    setSortOption(value)
  }
  
  const handleFilter = (filterKey, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterKey]: value
    }))
  }
  
  // Sort options for the dropdown
  const sortOptions = [
    { value: 'startTime_desc', label: 'Datum (neuste zuerst)' },
    { value: 'startTime_asc', label: 'Datum (älteste zuerst)' },
    { value: 'duration_desc', label: 'Dauer (längste zuerst)' },
    { value: 'duration_asc', label: 'Dauer (kürzeste zuerst)' },
    { value: 'description_asc', label: 'Beschreibung (A-Z)' },
    { value: 'description_desc', label: 'Beschreibung (Z-A)' },
    { value: 'order_asc', label: 'Auftrag (A-Z)' },
    { value: 'order_desc', label: 'Auftrag (Z-A)' },
    { value: 'assignedTo_asc', label: 'Zugewiesen (A-Z)' },
    { value: 'assignedTo_desc', label: 'Zugewiesen (Z-A)' }
  ]
  
  // Create a unique list of orders from time entries for the filter
  const getOrders = () => {
    const orderMap = new Map()
    timeEntries.forEach(entry => {
      if (entry.order) {
        if (typeof entry.order === 'object') {
          orderMap.set(entry.order._id, {
            value: entry.order._id,
            label: entry.order.orderNumber || 'Auftrag'
          })
        }
      }
    })
    return Array.from(orderMap.values())
  }
  
  // Create a unique list of assigned users from time entries for the filter
  const getAssignedUsers = () => {
    const userMap = new Map()
    timeEntries.forEach(entry => {
      if (entry.assignedTo) {
        if (typeof entry.assignedTo === 'object') {
          userMap.set(entry.assignedTo._id, {
            value: entry.assignedTo._id,
            label: entry.assignedTo.name || 'Benutzer'
          })
        }
      }
    })
    return Array.from(userMap.values())
  }
  
  // Formatiere die Benutzer für das Zuweisungs-Dropdown
  const userOptions = users.map(user => ({
    value: user._id,
    label: `${user.name} (${user.email})`
  }))
  
  // Filter configuration
  const filterConfig = {
    billed: {
      label: 'Abrechnungsstatus',
      value: filterValues.billed,
      onFilter: handleFilter,
      allLabel: 'Alle Einträge',
      options: [
        { value: 'false', label: 'Nicht abgerechnet' },
        { value: 'true', label: 'Abgerechnet' }
      ]
    },
    order: {
      label: 'Auftrag',
      value: filterValues.order,
      onFilter: handleFilter,
      allLabel: 'Alle Aufträge',
      options: getOrders()
    },
    assignedTo: {
      label: 'Zugewiesen an',
      value: filterValues.assignedTo,
      onFilter: handleFilter,
      allLabel: 'Alle Benutzer',
      options: getAssignedUsers()
    }
  }

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de })
    } catch (error) {
      return dateString
    }
  }

  const formatTimeDisplay = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'HH:mm', { locale: de })
    } catch (error) {
      return dateString
    }
  }

  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '-'
    return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
  }

  // Spalten-Definition für die Tabelle
  const columns = [
    {
      header: 'Datum',
      accessor: 'startTime',
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {formatDateDisplay(row.startTime)}
        </div>
      )
    },
    {
      header: 'Auftrag',
      accessor: 'order',
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {row.order ? (
            typeof row.order === 'object' ? (
              <Link to={`/orders/${row.order._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                {row.order.orderNumber}
              </Link>
            ) : (
              <Link to={`/orders/${row.order}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                Auftrag anzeigen
              </Link>
            )
          ) : (
            '-'
          )}
        </div>
      )
    },
    {
      header: 'Beschreibung',
      accessor: 'description',
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
          {row.description}
        </div>
      ),
      className: 'hidden md:table-cell'
    },
    {
      header: 'Zugewiesen an',
      accessor: 'assignedTo',
      cell: (row) => (
        <div className="text-sm text-gray-900 dark:text-white">
          {row.assignedTo ? (
            typeof row.assignedTo === 'object' ? (
              <span className="flex items-center">
                <UserIcon className="h-4 w-4 mr-1 text-gray-500 dark:text-gray-400" />
                {row.assignedTo.name}
              </span>
            ) : (
              'Benutzer laden...'
            )
          ) : (
            <span className="text-gray-500 dark:text-gray-400 text-xs italic">Nicht zugewiesen</span>
          )}
        </div>
      ),
      className: 'hidden lg:table-cell'
    },
    {
      header: 'Zeit',
      accessor: 'duration',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatTimeDisplay(row.startTime)} - {formatTimeDisplay(row.endTime)}
        </div>
      ),
      className: 'hidden lg:table-cell'
    },
    {
      header: 'Dauer',
      accessor: 'durationFormatted',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatDuration(row.duration)}
        </div>
      )
    },
    {
      header: 'Abgerechnet',
      accessor: 'billed',
      cell: (row) => (
        <div className="text-center">
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              row.billed
                ? isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                : isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {row.billed ? 'Ja' : 'Nein'}
          </span>
        </div>
      ),
      className: 'text-center hidden sm:table-cell'
    },
    {
      header: 'Aktionen',
      accessor: 'actions',
      cell: (row) => (
        <div className="text-right text-sm font-medium flex justify-end space-x-3">
          <button
            onClick={() => handleOpenAssignModal(row)}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
            title="Benutzer zuweisen"
          >
            <UserAddIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleToggleBilled(row._id, row.billed)}
            className={row.billed 
              ? "text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300" 
              : "text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
            }
            title={row.billed ? "Als nicht abgerechnet markieren" : "Als abgerechnet markieren"}
          >
            {row.billed ? (
              <XIcon className="h-5 w-5" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
          </button>
          <Link
            to={`/time-tracking/${row._id}/edit`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            title="Bearbeiten"
          >
            <PencilIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => handleDelete(row._id, row.billed)}
            className={`${
              row.billed 
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'
            }`}
            disabled={row.billed}
            title={row.billed ? 'Abgerechnete Zeiten können nicht gelöscht werden' : 'Löschen'}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
      className: 'text-right'
    }
  ]

  // Render-Funktion für mobile Ansicht
  const renderMobileRow = (entry) => (
    <div className="px-4">
      <div className="flex justify-between items-center mb-2">
        <div className="text-lg font-medium text-gray-900 dark:text-white">
          {formatDateDisplay(entry.startTime)}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenAssignModal(entry)}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
          >
            <UserAddIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleToggleBilled(entry._id, entry.billed)}
            className={entry.billed 
              ? "text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300" 
              : "text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
            }
          >
            {entry.billed ? (
              <XIcon className="h-5 w-5" />
            ) : (
              <CheckIcon className="h-5 w-5" />
            )}
          </button>
          <Link
            to={`/time-tracking/${entry._id}/edit`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
          >
            <PencilIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => handleDelete(entry._id, entry.billed)}
            className={`${
              entry.billed 
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'
            }`}
            disabled={entry.billed}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Beschreibung:</span> {entry.description}
      </p>
      
      {entry.order && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Auftrag:</span>{' '}
          {typeof entry.order === 'object' ? (
            <Link to={`/orders/${entry.order._id}`} className="text-blue-600 dark:text-blue-400">
              {entry.order.orderNumber}
            </Link>
          ) : (
            <Link to={`/orders/${entry.order}`} className="text-blue-600 dark:text-blue-400">
              Auftrag anzeigen
            </Link>
          )}
        </p>
      )}
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Zugewiesen an:</span>{' '}
        {entry.assignedTo ? (
          typeof entry.assignedTo === 'object' ? entry.assignedTo.name : 'Benutzer laden...'
        ) : (
          <span className="italic">Nicht zugewiesen</span>
        )}
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Zeit:</span> {formatTimeDisplay(entry.startTime)} - {formatTimeDisplay(entry.endTime)}
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Dauer:</span> {formatDuration(entry.duration)}
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Abgerechnet:</span>{' '}
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            entry.billed
              ? isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
              : isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {entry.billed ? 'Ja' : 'Nein'}
        </span>
      </p>
    </div>
  )

  // Leerer Zustand
  const emptyState = (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6 text-center">
      <p className="text-gray-500 dark:text-gray-400">
        {searchTerm || filterValues.billed || filterValues.order || filterValues.assignedTo ? 
          'Keine Zeiteinträge gefunden, die Ihren Suchkriterien entsprechen.' : 
          'Keine Zeiteinträge gefunden.'}
      </p>
      <Link
        to="/time-tracking/new"
        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800"
      >
        Ersten Zeiteintrag anlegen
      </Link>
    </div>
  )

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6">
      <div className="py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Zeiterfassung</h2>
          <Link
            to="/time-tracking/new"
            className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 min-w-[160px] justify-center"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Neue Zeit erfassen
          </Link>
        </div>

        {/* Search and Filter Component */}
        <SearchAndFilter 
          onSearch={handleSearch}
          onSort={handleSort}
          sortOptions={sortOptions}
          filters={filterConfig}
          darkMode={isDarkMode}
          searchPlaceholder="Zeiteinträge suchen..."
        />

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <ResponsiveTable 
            columns={columns}
            data={filteredEntries}
            renderMobileRow={renderMobileRow}
            isLoading={loading}
            emptyState={emptyState}
            darkMode={isDarkMode}
          />
        </div>
      </div>
      
      {/* Zuweisungs-Modal */}
      {showAssignModal && selectedEntry && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => setShowAssignModal(false)}
            >
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className={`inline-block align-bottom ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full`}>
              <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className={`text-lg leading-6 font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Benutzer zuweisen
                    </h3>
                    <div className="mt-2">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} mb-4`}>
                        Wählen Sie einen Benutzer aus, der für diesen Zeiteintrag zuständig sein soll.
                      </p>
                      
                      <div className="mt-3">
                        <label htmlFor="assignUser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Benutzer
                        </label>
                        <SearchableSelect
                          name="assignUser"
                          id="assignUser"
                          value={selectedEntry.assignedTo?._id || selectedEntry.assignedTo || ''}
                          onChange={(e) => handleAssignUser(e.target.value)}
                          options={userOptions}
                          placeholder="Keinem Benutzer zuweisen"
                          threshold={0} // Immer Suchfeld anzeigen
                          darkMode={isDarkMode}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse`}>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowAssignModal(false)}
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimeTracking