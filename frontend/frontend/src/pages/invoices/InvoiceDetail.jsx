// src/pages/invoices/InvoiceDetail.jsx - Mit Dark Mode Support
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getInvoice, updateInvoiceStatus } from '../../services/invoiceService'
import { PencilIcon, ArrowLeftIcon, DownloadIcon, MailIcon, CheckIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useTheme } from '../../context/ThemeContext'

const InvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await getInvoice(id)
        setInvoice(response.data.data)
        setLoading(false)
      } catch (error) {
        toast.error('Fehler beim Laden der Rechnung')
        navigate('/invoices')
      }
    }

    fetchInvoice()
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

  const calculateSubtotal = () => {
    if (!invoice || !invoice.items || !invoice.items.length) return 0;
    return invoice.items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + itemTotal;
    }, 0);
  }

  const calculateTaxAmount = () => {
    const subtotal = calculateSubtotal();
    const taxRate = invoice.taxRate || 0;
    return subtotal * (taxRate / 100);
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxAmount();
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'erstellt':
        return isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
      case 'versendet':
        return isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
      case 'bezahlt':
        return isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
      case 'storniert':
        return isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'
      default:
        return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await updateInvoiceStatus(id, newStatus)
      toast.success(`Rechnungsstatus auf "${newStatus}" geändert`)
      setInvoice({ ...invoice, status: newStatus })
    } catch (error) {
      toast.error('Fehler beim Ändern des Rechnungsstatus')
    }
  }

  const handleGeneratePdf = () => {
    // In einer realen Anwendung würde hier die PDF-Generierung implementiert werden
    toast.info('PDF-Generierung würde hier starten (in dieser Demo nicht implementiert)')
  }

  const handleSendEmail = () => {
    // In einer realen Anwendung würde hier das Versenden der E-Mail implementiert werden
    toast.info('E-Mail-Versand würde hier starten (in dieser Demo nicht implementiert)')
    handleStatusChange('versendet')
  }

  const handleMarkAsPaid = () => {
    handleStatusChange('bezahlt')
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Rechnungsdetails werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Rechnung {invoice.invoiceNumber}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Rechnungsdetails.</p>
          </div>
          <div className="flex space-x-2">
            <Link
              to="/invoices"
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Zurück
            </Link>
            <button
              type="button"
              onClick={handleGeneratePdf}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <DownloadIcon className="-ml-0.5 mr-2 h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={invoice.status === 'versendet' || invoice.status === 'bezahlt' || invoice.status === 'storniert'}
            >
              <MailIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Senden
            </button>
            <button
              type="button"
              onClick={handleMarkAsPaid}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800"
              disabled={invoice.status === 'bezahlt' || invoice.status === 'storniert'}
            >
              <CheckIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Als bezahlt
            </button>
            <Link
              to={`/invoices/${id}/edit`}
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
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Rechnungsnummer</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {invoice.invoiceNumber}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Kunde</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {invoice.customer ? (
                  typeof invoice.customer === 'object' ? (
                    <Link to={`/customers/${invoice.customer._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                      {invoice.customer.name}
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
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Auftrag</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {invoice.order ? (
                  typeof invoice.order === 'object' ? (
                    <Link to={`/orders/${invoice.order._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                      {invoice.order.orderNumber}
                    </Link>
                  ) : (
                    <Link to={`/orders/${invoice.order}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                      Auftrag anzeigen
                    </Link>
                  )
                ) : (
                  'Kein Auftrag'
                )}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Status</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2 flex items-center">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                    invoice.status
                  )} mr-4`}
                >
                  {invoice.status}
                </span>
                
                <div className="ml-auto">
                  <label htmlFor="status-change" className="sr-only">Status ändern</label>
                  <select
                    id="status-change"
                    className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={invoice.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="erstellt">Erstellt</option>
                    <option value="versendet">Versendet</option>
                    <option value="bezahlt">Bezahlt</option>
                    <option value="storniert">Storniert</option>
                  </select>
                </div>
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Rechnungsdatum</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {formatDate(invoice.issueDate)}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Fälligkeitsdatum</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {formatDate(invoice.dueDate)}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Notizen</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {invoice.notes || '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Rechnungspositionen */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Rechnungspositionen</h3>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {invoice.items && invoice.items.length > 0 ? (
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
                    Gesamt
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoice.items.map((item, index) => (
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
                    Zwischensumme:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    {formatCurrency(calculateSubtotal())}
                  </td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    Mehrwertsteuer ({invoice.taxRate}%):
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    {formatCurrency(calculateTaxAmount())}
                  </td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    Gesamtbetrag:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    {formatCurrency(calculateTotal())}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Keine Rechnungspositionen vorhanden.
            </div>
          )}
        </div>
      </div>

      {/* Zeiterfassung */}
      {invoice.timeTracking && invoice.timeTracking.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Abgerechnete Arbeitszeiten</h3>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700">
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
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoice.timeTracking.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(entry.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {entry.startTime ? format(new Date(entry.startTime), 'HH:mm', { locale: de }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {entry.endTime ? format(new Date(entry.endTime), 'HH:mm', { locale: de }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                      {entry.duration
                        ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}min`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoiceDetail