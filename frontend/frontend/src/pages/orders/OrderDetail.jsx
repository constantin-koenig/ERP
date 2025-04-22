// src/pages/orders/OrderDetail.jsx (verbessert für bessere Benutzerfreundlichkeit)
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getOrder, updateOrderStatus, assignOrder, updateOrder } from '../../services/orderService'
import { getTimeTrackingsByOrder } from '../../services/timeTrackingService'
import { getInvoicesByOrder } from '../../services/invoiceService'
import { getAssignableUsers } from '../../services/authService'
import { 
  PencilIcon, 
  ArrowLeftIcon, 
  ClockIcon, 
  DocumentTextIcon, 
  UserIcon,
  CheckIcon,
  XIcon,
  CalendarIcon,
  CurrencyEuroIcon,
  InformationCircleIcon,
  SaveIcon
} from '@heroicons/react/outline'
import { format, differenceInDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTheme } from '../../context/ThemeContext'

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [timeEntries, setTimeEntries] = useState([])
  const [invoices, setInvoices] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const { isDarkMode } = useTheme()
  
  // Neuer State für bearbeitbare Notizen
  const [notes, setNotes] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  
  // State für erweiterte Ansichten
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await getOrder(id)
        const orderData = response.data.data
        setOrder(orderData)
        setNotes(orderData.notes || '')
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
    fetchUsers()
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
  
  const getTimeEntryStatusBadgeColor = (isBilled) => {
    return isBilled
      ? isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
      : isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
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
  
  // Neue Funktion zum Speichern der Notizen
  const handleSaveNotes = async () => {
    if (notes === order.notes) {
      setIsEditingNotes(false)
      return
    }
    
    setSavingNotes(true)
    try {
      const response = await updateOrder(id, { notes })
      if (response.data && response.data.success) {
        toast.success('Notizen erfolgreich gespeichert')
        setOrder({ ...order, notes })
        setIsEditingNotes(false)
      }
    } catch (error) {
      toast.error('Fehler beim Speichern der Notizen')
    } finally {
      setSavingNotes(false)
    }
  }
  
  // Berechnung der verbleibenden Tage
  const getDaysRemaining = () => {
    if (!order || !order.dueDate) return null;
    
    const today = new Date();
    const dueDate = new Date(order.dueDate);
    const days = differenceInDays(dueDate, today);
    
    return days;
  }
  
  const getDueStatusColor = () => {
    const days = getDaysRemaining();
    if (days === null) return '';
    
    if (days < 0) {
      return isDarkMode ? 'text-red-400' : 'text-red-600';
    } else if (days <= 3) {
      return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
    } else {
      return isDarkMode ? 'text-green-400' : 'text-green-600';
    }
  }
  
  // Gesamtzeit berechnen
  const calculateTotalTime = () => {
    if (!timeEntries || timeEntries.length === 0) return 0;
    
    const totalMinutes = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    return totalMinutes;
  }
  
  const formatDuration = (minutes) => {
    if (!minutes && minutes !== 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }
  
  // Berechne abrechenbare / abgerechnete Zeiten
  const getBilledStatus = () => {
    if (!timeEntries || timeEntries.length === 0) return { billed: 0, unbilled: 0 };
    
    const billedMinutes = timeEntries
      .filter(entry => entry.billed)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0);
      
    const unbilledMinutes = timeEntries
      .filter(entry => !entry.billed)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0);
      
    return { billed: billedMinutes, unbilled: unbilledMinutes };
  }

  if (loading || usersLoading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Auftragsdetails werden geladen...</p>
      </div>
    )
  }

  const totalOrderAmount = calculateOrderTotal();
  const daysRemaining = getDaysRemaining();
  const totalTime = calculateTotalTime();
  const { billed, unbilled } = getBilledStatus();

  return (
    <div className="space-y-6">
      {/* Header mit wichtigen Aktionen */}
      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center mb-4 sm:mb-0">
            <div className="mr-4">
              <Link
                to="/orders"
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
                Zurück
              </Link>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                Auftrag {order.orderNumber}
                <span
                  className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
                {order.customer && typeof order.customer === 'object' && (
                  <Link to={`/customers/${order.customer._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {order.customer.name}
                  </Link>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/time-tracking/new?orderId=${id}`}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              <ClockIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Zeit erfassen
            </Link>
            <Link
              to={`/invoices/new?orderId=${id}`}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800"
            >
              <DocumentTextIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Rechnung erstellen
            </Link>
            <Link
              to={`/orders/${id}/edit`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Bearbeiten
            </Link>
          </div>
        </div>
        
        {/* Tabs für die verschiedenen Ansichten */}
        <div className="border-t border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6 px-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'info'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <InformationCircleIcon className="h-5 w-5 inline-block mr-1" />
              Übersicht
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <CurrencyEuroIcon className="h-5 w-5 inline-block mr-1" />
              Positionen
            </button>
            <button
              onClick={() => setActiveTab('time')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'time'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <ClockIcon className="h-5 w-5 inline-block mr-1" />
              Zeiterfassung
              {!timeEntriesLoading && timeEntries.length > 0 && (
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  {timeEntries.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline-block mr-1" />
              Rechnungen
              {!invoicesLoading && invoices.length > 0 && (
                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                  {invoices.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
      
      {/* Hauptinhalt - flexibler basierend auf aktivem Tab */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Linke Spalte mit Notizen */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Notizen</h3>
                {!isEditingNotes ? (
                  <button
                    type="button" 
                    onClick={() => setIsEditingNotes(true)}
                    className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <PencilIcon className="h-3 w-3 mr-1" />
                    Bearbeiten
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNotes(order.notes || '');
                        setIsEditingNotes(false);
                      }}
                      className="inline-flex items-center px-2 py-1 border border-gray-300 dark:border-gray-600 text-xs rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                      disabled={savingNotes}
                    >
                      <XIcon className="h-3 w-3 mr-1" />
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                      disabled={savingNotes}
                    >
                      {savingNotes ? (
                        <>
                          <svg className="animate-spin -ml-0.5 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Speichern...
                        </>
                      ) : (
                        <>
                          <SaveIcon className="h-3 w-3 mr-1" />
                          Speichern
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
                {isEditingNotes ? (
                  <textarea
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md h-64 font-sans"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Fügen Sie hier Ihre Notizen zum Auftrag hinzu..."
                  />
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {order.notes ? (
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-white break-words overflow-hidden overflow-wrap-anywhere">
                        {order.notes}
                      </pre>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 italic">
                        Keine Notizen vorhanden. Klicken Sie auf "Bearbeiten", um Notizen hinzuzufügen.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Beschreibung */}
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg mt-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Beschreibung</h3>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900 dark:text-white break-words overflow-hidden overflow-wrap-anywhere">
                    {order.description}
                  </pre>
                </div>
              </div>
            </div>
          </div>
          
          {/* Rechte Spalte mit Auftragsinformationen */}
          <div className="lg:col-span-1 space-y-6">
            {/* Dashboard-Karten */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Gesamtbetrag</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(totalOrderAmount)}
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                <div className="mt-1">
                  <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={order.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="neu">Neu</option>
                    <option value="in Bearbeitung">In Bearbeitung</option>
                    <option value="abgeschlossen">Abgeschlossen</option>
                    <option value="storniert">Storniert</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fälligkeitsdatum</h3>
                <p className={`mt-1 text-lg font-semibold ${getDueStatusColor()}`}>
                  {formatDate(order.dueDate)}
                  {daysRemaining !== null && (
                    <span className="block text-xs mt-1">
                      {daysRemaining < 0 
                        ? `${Math.abs(daysRemaining)} Tage überfällig` 
                        : daysRemaining === 0
                          ? `Heute fällig`
                          : `Noch ${daysRemaining} Tage`}
                    </span>
                  )}
                </p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Erfasste Zeit</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDuration(totalTime)}
                  <span className="block text-xs mt-1 text-gray-500 dark:text-gray-400">
                    {unbilled > 0 ? `${formatDuration(unbilled)} nicht abgerechnet` : ''}
                  </span>
                </p>
              </div>
            </div>
            
            {/* Weitere Informationen */}
            <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Auftragsinformationen</h3>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700">
                <dl>
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Auftragsnummer</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                      {order.orderNumber}
                    </dd>
                  </div>
                  <div className="bg-white dark:bg-gray-800 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Kunde</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                      {order.customer ? (
                        typeof order.customer === 'object' ? (
                          <Link to={`/customers/${order.customer._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
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
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Zugewiesen an</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                      <select
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
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
                    </dd>
                  </div>
                  <div className="bg-white dark:bg-gray-800 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Startdatum</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                      {formatDate(order.startDate)}
                    </dd>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Fälligkeitsdatum</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                      {formatDate(order.dueDate)}
                    </dd>
                  </div>
                  <div className="bg-white dark:bg-gray-800 px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Erstellt am</dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                      {formatDate(order.createdAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'items' && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Auftragspositionen</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Gesamtbetrag: {formatCurrency(calculateOrderTotal())}
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700">
            {order.items && order.items.length > 0 ? (
              <div className="overflow-x-auto">
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
                          {formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 dark:bg-gray-700">
                      <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                        Gesamtbetrag:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                        {formatCurrency(calculateOrderTotal())}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Keine Auftragspositionen vorhanden.
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'time' && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Zeiterfassung</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Gesamtzeit: {formatDuration(totalTime)}
                {unbilled > 0 && (
                  <span className="ml-2">({formatDuration(unbilled)} nicht abgerechnet)</span>
                )}
              </p>
            </div>
            <Link
              to={`/time-tracking/new?orderId=${id}`}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              <ClockIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Zeit erfassen
            </Link>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700">
            {timeEntriesLoading ? (
              <div className="text-center py-4">
                <div className="spinner inline-block"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Zeiteinträge werden geladen...</p>
              </div>
            ) : timeEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Datum
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Beschreibung
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Startzeit
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Endzeit
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Dauer
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {timeEntries.map((entry) => (
                      <tr key={entry._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatDate(entry.startTime)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {entry.startTime ? format(new Date(entry.startTime), 'HH:mm', { locale: de }) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {entry.endTime ? format(new Date(entry.endTime), 'HH:mm', { locale: de }) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {formatDuration(entry.duration)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTimeEntryStatusBadgeColor(entry.billed)}`}>
                            {entry.billed ? 'Abgerechnet' : 'Offen'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/time-tracking/${entry._id}/edit`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                          >
                            Bearbeiten
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Keine Zeiteinträge für diesen Auftrag vorhanden.
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Rechnungen</h3>
            <Link
              to={`/invoices/new?orderId=${id}`}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              <DocumentTextIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Rechnung erstellen
            </Link>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700">
            {invoicesLoading ? (
              <div className="text-center py-4">
                <div className="spinner inline-block"></div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Rechnungen werden geladen...</p>
              </div>
            ) : invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Rechnungsnr
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Betrag
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Datum
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          <Link to={`/invoices/${invoice._id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            invoice.status === 'erstellt'
                              ? isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
                              : invoice.status === 'versendet'
                              ? isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
                              : invoice.status === 'bezahlt'
                              ? isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                              : isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {formatDate(invoice.issueDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                          <Link to={`/invoices/${invoice._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                            Details
                          </Link>
                          <Link to={`/invoices/${invoice._id}/edit`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                            Bearbeiten
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Keine Rechnungen für diesen Auftrag vorhanden.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderDetail