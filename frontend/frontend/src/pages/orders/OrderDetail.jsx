// src/pages/orders/OrderDetail.jsx (aktualisiert)
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getOrder, updateOrderStatus, assignOrder } from '../../services/orderService'
import { getTimeTrackingsByOrder } from '../../services/timeTrackingService'
import { getInvoicesByOrder } from '../../services/invoiceService'
import { getAssignableUsers } from '../../services/authService'
import { 
  PencilIcon, 
  ArrowLeftIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  UserIcon 
} from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTheme } from '../../context/ThemeContext'

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [timeEntries, setTimeEntries] = useState([])
  const [invoices, setInvoices] = useState([])
  const [users, setUsers] = useState([]) // Zustand für Benutzer
  const [loading, setLoading] = useState(true)
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true) // Ladezustand für Benutzer
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await getOrder(id)
        setOrder(response.data.data)
        setLoading(false)
      } catch (error) {
        toast.error('Fehler beim Laden des Auftrags')
        navigate('/orders')
      }
    }

    const fetchTimeEntries = async () => {
      try {
        const response = await getTimeTrackingsByOrder(id)
        setTimeEntries(response.data.data)
        setTimeEntriesLoading(false)
      } catch (error) {
        console.error('Fehler beim Laden der Zeiteinträge:', error)
        setTimeEntriesLoading(false)
      }
    }
    
    const fetchInvoices = async () => {
      try {
        const response = await getInvoicesByOrder(id)
        setInvoices(response.data.data)
        setInvoicesLoading(false)
      } catch (error) {
        console.error('Fehler beim Laden der Rechnungen:', error)
        setInvoicesLoading(false)
      }
    }

    const fetchUsers = async () => {
      try {
        const response = await getAssignableUsers()
        setUsers(response.data.data)
        setUsersLoading(false)
      } catch (error) {
        console.error('Fehler beim Laden der Benutzer:', error)
        setUsersLoading(false)
      }
    }

    fetchOrder()
    fetchTimeEntries()
    fetchInvoices()
    fetchUsers() // Benutzer laden
  }, [id, navigate])

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de })
    } catch (error) {
      return dateString
    }
  }

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const calculateOrderTotal = () => {
    if (!order || !order.items || !order.items.length) return 0;
    return order.items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + itemTotal;
    }, 0);
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'neu':
        return isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
      case 'in Bearbeitung':
        return isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
      case 'abgeschlossen':
        return isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
      case 'storniert':
        return isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'
      default:
        return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
    }
  }
  
  const handleStatusChange = async (newStatus) => {
    try {
      await updateOrderStatus(id, newStatus)
      toast.success(`Auftragsstatus auf "${newStatus}" geändert`)
      setOrder({ ...order, status: newStatus })
    } catch (error) {
      toast.error('Fehler beim Ändern des Auftragsstatus')
    }
  }

  // Neue Funktion zum Zuweisen eines Benutzers
  const handleAssignUser = async (userId) => {
    try {
      const response = await assignOrder(id, userId)
      if (response.data && response.data.success) {
        toast.success(userId ? 'Benutzer erfolgreich zugewiesen' : 'Benutzerzuweisung aufgehoben')
        setOrder(response.data.data)
      }
    } catch (error) {
      toast.error('Fehler bei der Benutzerzuweisung')
    }
  }

  if (loading || usersLoading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Auftragsdetails werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Auftrag {order.orderNumber}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Details zum Auftrag.</p>
          </div>
          <div className="flex space-x-2">
            <Link
              to="/orders"
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Zurück
            </Link>
            <Link
              to={`/orders/${id}/edit`}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Bearbeiten
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          <dl>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Auftragsnummer</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {order.orderNumber}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Kunde</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {order.customer ? (
                  typeof order.customer === 'object' ? (
                    <Link to={`/customers/${order.customer._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                      {order.customer.name}
                    </Link>
                  ) : (
                    'Kunde geladen...'
                  )
                ) : (
                  'Kein Kunde'
                )}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Beschreibung</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {order.description}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Status</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2 flex items-center">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                    order.status
                  )} mr-4`}
                >
                  {order.status}
                </span>
                
                <div className="ml-auto">
                  <label htmlFor="status-change" className="sr-only">Status ändern</label>
                  <select
                    id="status-change"
                    className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={order.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="neu">Neu</option>
                    <option value="in Bearbeitung">In Bearbeitung</option>
                    <option value="abgeschlossen">Abgeschlossen</option>
                    <option value="storniert">Storniert</option>
                  </select>
                </div>
              </dd>
            </div>
            {/* Neuer Abschnitt für zugewiesenen Benutzer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Zugewiesen an</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2 flex items-center">
                <span className="mr-4">
                  {order.assignedTo ? (
                    <div className="flex items-center">
                      <UserIcon className="mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {typeof order.assignedTo === 'object' ? 
                          `${order.assignedTo.name} (${order.assignedTo.email})` : 
                          'Benutzer geladen...'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">Keinem Benutzer zugewiesen</span>
                  )}
                </span>
                
                <div className="ml-auto">
                  <label htmlFor="assign-user" className="sr-only">Benutzer zuweisen</label>
                  <select
                    id="assign-user"
                    className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={order.assignedTo ? (typeof order.assignedTo === 'object' ? order.assignedTo._id : order.assignedTo) : ''}
                    onChange={(e) => handleAssignUser(e.target.value)}
                  >
                    <option value="">Keinem Benutzer zuweisen</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Startdatum</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {formatDate(order.startDate)}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Fälligkeitsdatum</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {formatDate(order.dueDate)}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Gesamtbetrag</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {formatCurrency(order.totalAmount)}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Notizen</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {order.notes || '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Auftragspositionen */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Auftragspositionen</h3>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {order.items && order.items.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Beschreibung
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Menge
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Einzelpreis
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Gesamtpreis
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {item.quantity * item.unitPrice ? formatCurrency(item.quantity * item.unitPrice) : formatCurrency(0)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    Gesamtbetrag:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    {calculateOrderTotal() ? formatCurrency(calculateOrderTotal()) : formatCurrency(0)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Keine Auftragspositionen vorhanden.
            </div>
          )}
        </div>
      </div>

      {/* Zeiterfassung */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Zeiterfassung</h3>
          <Link
            to={`/time-tracking/new?orderId=${id}`}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            <ClockIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Zeit erfassen
          </Link>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {timeEntriesLoading ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Zeiteinträge werden geladen...</p>
            </div>
          ) : timeEntries.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Datum
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Beschreibung
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Startzeit
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Endzeit
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Dauer
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Abgerechnet
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {timeEntries.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(entry.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {format(new Date(entry.startTime), 'HH:mm', { locale: de })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {format(new Date(entry.endTime), 'HH:mm', { locale: de })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {entry.duration
                        ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}min`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoices.status === 'erstellt'
                            ? isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
                            : invoices.status === 'versendet'
                            ? isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
                            : invoices.status === 'bezahlt'
                            ? isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                            : isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {invoices.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {formatCurrency(invoices.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                      {formatDate(invoices.issueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      <Link to={`/invoices/${invoices._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mx-1">
                        Details
                      </Link>
                      <Link to={`/invoices/${invoices._id}/edit`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mx-1">
                        Bearbeiten
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Keine Rechnungen für diesen Auftrag vorhanden.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OrderDetail