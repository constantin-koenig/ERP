// src/pages/time/TimeTracking.jsx - Mit Dark Mode Support
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getTimeTrackings, deleteTimeTracking } from '../../services/timeTrackingService'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import { useTheme } from '../../context/ThemeContext'

const TimeTracking = () => {
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    fetchTimeEntries()
  }, [])

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
      <p className="text-gray-500 dark:text-gray-400">Keine Zeiteinträge gefunden.</p>
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

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <ResponsiveTable 
            columns={columns}
            data={timeEntries}
            renderMobileRow={renderMobileRow}
            isLoading={loading}
            emptyState={emptyState}
            darkMode={isDarkMode}
          />
        </div>
      </div>
    </div>
  )
}

export default TimeTracking