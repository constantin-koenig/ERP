import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getTimeTrackings, deleteTimeTracking } from '../../services/timeTrackingService'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const TimeTracking = () => {
  const [timeEntries, setTimeEntries] = useState([])
  const [loading, setLoading] = useState(true)

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

  const handleDelete = async (id) => {
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

  return (
    <div className="container mx-auto px-4 sm:px-8">
      <div className="py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Zeiterfassung</h2>
          <Link
            to="/time-tracking/new"
            className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Neue Zeit erfassen
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="spinner"></div>
            <p className="mt-2 text-gray-600">Zeiteinträge werden geladen...</p>
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
            <p className="text-gray-500">Keine Zeiteinträge gefunden.</p>
            <Link
              to="/time-tracking/new"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Ersten Zeiteintrag anlegen
            </Link>
          </div>
        ) : (
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Datum
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Auftrag
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Beschreibung
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Start - Ende
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Dauer
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Abgerechnet
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeEntries.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDateDisplay(entry.startTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {entry.order ? (
                          typeof entry.order === 'object' ? (
                            <Link to={`/orders/${entry.order._id}`} className="text-blue-600 hover:text-blue-900">
                              {entry.order.orderNumber}
                            </Link>
                          ) : (
                            <Link to={`/orders/${entry.order}`} className="text-blue-600 hover:text-blue-900">
                              Auftrag anzeigen
                            </Link>
                          )
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{entry.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatTimeDisplay(entry.startTime)} - {formatTimeDisplay(entry.endTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {entry.duration
                          ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}min`
                          : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          entry.billed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {entry.billed ? 'Ja' : 'Nein'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/time-tracking/${entry._id}/edit`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <PencilIcon className="h-5 w-5 inline" />
                      </Link>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={entry.billed}
                        title={entry.billed ? 'Abgerechnete Zeiten können nicht gelöscht werden' : ''}
                      >
                        <TrashIcon className={`h-5 w-5 inline ${entry.billed ? 'opacity-50 cursor-not-allowed' : ''}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TimeTracking