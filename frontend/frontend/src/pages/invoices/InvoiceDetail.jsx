// src/pages/invoices/InvoiceDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getInvoice, updateInvoice } from '../../services/invoiceService'
import { PencilIcon, ArrowLeftIcon, DownloadIcon, MailIcon, CheckIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const InvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)

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

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'erstellt':
        return 'bg-blue-100 text-blue-800'
      case 'versendet':
        return 'bg-yellow-100 text-yellow-800'
      case 'bezahlt':
        return 'bg-green-100 text-green-800'
      case 'storniert':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await updateInvoice(id, { status: newStatus })
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
        <p className="mt-2 text-gray-600">Rechnungsdetails werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Rechnung {invoice.invoiceNumber}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Rechnungsdetails.</p>
          </div>
          <div className="flex space-x-2">
            <Link
              to="/invoices"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Zurück
            </Link>
            <button
              type="button"
              onClick={handleGeneratePdf}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DownloadIcon className="-ml-0.5 mr-2 h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={handleSendEmail}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              disabled={invoice.status === 'versendet' || invoice.status === 'bezahlt' || invoice.status === 'storniert'}
            >
              <MailIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Senden
            </button>
            <button
              type="button"
              onClick={handleMarkAsPaid}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              disabled={invoice.status === 'bezahlt' || invoice.status === 'storniert'}
            >
              <CheckIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Als bezahlt
            </button>
            <Link
              to={`/invoices/${id}/edit`}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PencilIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Bearbeiten
            </Link>
          </div>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Rechnungsnummer</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {invoice.invoiceNumber}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Kunde</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {invoice.customer ? (
                  typeof invoice.customer === 'object' ? (
                    <Link to={`/customers/${invoice.customer._id}`} className="text-blue-600 hover:text-blue-900">
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
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Auftrag</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {invoice.order ? (
                  typeof invoice.order === 'object' ? (
                    <Link to={`/orders/${invoice.order._id}`} className="text-blue-600 hover:text-blue-900">
                      {invoice.order.orderNumber}
                    </Link>
                  ) : (
                    <Link to={`/orders/${invoice.order}`} className="text-blue-600 hover:text-blue-900">
                      Auftrag anzeigen
                    </Link>
                  )
                ) : (
                  'Kein Auftrag'
                )}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                    invoice.status
                  )}`}
                >
                  {invoice.status}
                </span>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Rechnungsdatum</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(invoice.issueDate)}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Fälligkeitsdatum</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(invoice.dueDate)}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Notizen</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {invoice.notes || '-'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Rechnungspositionen */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Rechnungspositionen</h3>
        </div>
        <div className="border-t border-gray-200">
          {invoice.items && invoice.items.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Beschreibung
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Menge
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Einzelpreis
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Gesamt
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    Zwischensumme:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    Mehrwertsteuer ({invoice.taxRate}%):
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(invoice.taxAmount)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan="3" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    Gesamtbetrag:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(invoice.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-4 text-center text-sm text-gray-500">
              Keine Rechnungspositionen vorhanden.
            </div>
          )}
        </div>
      </div>

      {/* Zeiterfassung */}
      {invoice.timeTracking && invoice.timeTracking.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Abgerechnete Arbeitszeiten</h3>
          </div>
          <div className="border-t border-gray-200">
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
                    Beschreibung
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Startzeit
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Endzeit
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Dauer
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.timeTracking.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(entry.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {entry.startTime ? format(new Date(entry.startTime), 'HH:mm', { locale: de }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {entry.endTime ? format(new Date(entry.endTime), 'HH:mm', { locale: de }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
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