import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getInvoices, deleteInvoice } from '../../services/invoiceService'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const Invoices = () => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await getInvoices()
      setInvoices(response.data.data)
      setLoading(false)
    } catch (error) {
      toast.error('Fehler beim Laden der Rechnungen')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Möchten Sie diese Rechnung wirklich löschen? Zeiteinträge werden wieder als nicht abgerechnet markiert.')) {
      try {
        await deleteInvoice(id)
        toast.success('Rechnung erfolgreich gelöscht')
        fetchInvoices()
      } catch (error) {
        toast.error('Fehler beim Löschen der Rechnung')
      }
    }
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

  return (
    <div className="container mx-auto px-4 sm:px-8">
      <div className="py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Rechnungen</h2>
          <Link
            to="/invoices/new"
            className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Neue Rechnung
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="spinner"></div>
            <p className="mt-2 text-gray-600">Rechnungen werden geladen...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md p-6 text-center">
            <p className="text-gray-500">Keine Rechnungen gefunden.</p>
            <Link
              to="/invoices/new"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Erste Rechnung erstellen
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
                    Rechnungsnr.
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Kunde
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Betrag
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Rechnungsdatum
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Fälligkeitsdatum
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
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        <Link to={`/invoices/${invoice._id}`} className="hover:text-blue-600">
                          {invoice.invoiceNumber}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {invoice.customer ? (
                          typeof invoice.customer === 'object' ? (
                            invoice.customer.name
                          ) : (
                            'Kunde geladen...'
                          )
                        ) : (
                          'Kein Kunde'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/invoices/${invoice._id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <EyeIcon className="h-5 w-5 inline" />
                      </Link>
                      <Link
                        to={`/invoices/${invoice._id}/edit`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <PencilIcon className="h-5 w-5 inline" />
                      </Link>
                      <button
                        onClick={() => handleDelete(invoice._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5 inline" />
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

export default Invoices
