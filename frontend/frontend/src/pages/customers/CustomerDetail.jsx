// src/pages/customers/CustomerDetail.jsx - Erweitert mit Aufträgen und Rechnungen
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getCustomer } from '../../services/customerService'
import { getOrdersByCustomer } from '../../services/orderService'
import { getInvoicesByCustomer } from '../../services/invoiceService'
import { PencilIcon, ArrowLeftIcon, DocumentTextIcon, ClipboardListIcon, PlusIcon } from '@heroicons/react/outline'
import { useTheme } from '../../context/ThemeContext'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const CustomerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await getCustomer(id)
        setCustomer(response.data.data)
        setLoading(false)
      } catch (error) {
        toast.error('Fehler beim Laden des Kunden')
        navigate('/customers')
      }
    }

    const fetchOrders = async () => {
      try {
        const response = await getOrdersByCustomer(id)
        setOrders(response.data.data)
        setOrdersLoading(false)
      } catch (error) {
        console.error('Fehler beim Laden der Aufträge:', error)
        setOrdersLoading(false)
      }
    }

    const fetchInvoices = async () => {
      try {
        const response = await getInvoicesByCustomer(id)
        setInvoices(response.data.data)
        setInvoicesLoading(false)
      } catch (error) {
        console.error('Fehler beim Laden der Rechnungen:', error)
        setInvoicesLoading(false)
      }
    }

    fetchCustomer()
    fetchOrders()
    fetchInvoices()
  }, [id, navigate])

  // Formatierung für Währung
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-'
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  // Formatierung für Datum
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: de })
    } catch (error) {
      return dateString
    }
  }

  // Berechnung des Gesamtbetrags aus den Auftragspositionen
  const calculateTotal = (items) => {
    if (!items || items.length === 0) return 0;
    
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  }

  // Status-Badge-Farben
  const getOrderStatusBadgeColor = (status) => {
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

  const getInvoiceStatusBadgeColor = (status) => {
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

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Kundendetails werden geladen...</p>
      </div>
    )
  }

  // Berechnungen für Statistiken
  const totalOrdersAmount = orders.reduce((sum, order) => sum + calculateTotal(order.items), 0);
  const totalInvoicesAmount = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const openInvoicesAmount = invoices
    .filter(invoice => invoice.status !== 'bezahlt')
    .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  
  // Aufteilung der Rechnungen nach Status
  const paidInvoicesCount = invoices.filter(invoice => invoice.status === 'bezahlt').length;
  const openInvoicesCount = invoices.filter(invoice => invoice.status !== 'bezahlt').length;

  return (
    <div className="space-y-6">
      {/* Kundendetails */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Kundendetails</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Details und Informationen zum Kunden.</p>
          </div>
          <div className="flex space-x-2">
            <Link
              to="/customers"
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
              Zurück
            </Link>
            <Link
              to={`/customers/${id}/edit`}
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
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Name</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">{customer.name}</dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Kontaktperson</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {customer.contactPerson || '-'}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">E-Mail</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                    {customer.email}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Telefon</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                    {customer.phone}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Adresse</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {customer.address ? (
                  <div>
                    <p>{customer.address.street || '-'}</p>
                    <p>
                      {customer.address.zipCode || ''} {customer.address.city || ''}
                    </p>
                    <p>{customer.address.country || ''}</p>
                  </div>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Steuernummer</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {customer.taxId || '-'}
              </dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Notizen</dt>
              <dd className="mt-1 sm:mt-0 sm:col-span-2">
                {customer.notes ? (
                  <pre className="formatted-notes text-sm text-gray-900 dark:text-white break-words">
                    {customer.notes}
                  </pre>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 italic">Keine Notizen vorhanden</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Übersichtskarten */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        {/* Karte: Anzahl Aufträge */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardListIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Aufträge</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{orders.length}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Karte: Gesamtwert Aufträge */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardListIcon className="h-6 w-6 text-blue-400 dark:text-blue-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Auftragswert gesamt</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrency(totalOrdersAmount)}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Karte: Anzahl Rechnungen */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Rechnungen</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {invoices.length} ({paidInvoicesCount} bezahlt / {openInvoicesCount} offen)
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Karte: Offene Rechnungssumme */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-6 w-6 text-yellow-400 dark:text-yellow-500" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Offene Rechnungen</dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrency(openInvoicesAmount)}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aufträge des Kunden */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Aufträge</h3>
          <Link
            to={`/orders/new?customerId=${id}`}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Neuer Auftrag
          </Link>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {ordersLoading ? (
            <div className="px-4 py-10 text-center">
              <div className="spinner inline-block"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Aufträge werden geladen...</p>
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Auftragsnr.
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Beschreibung
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Fälligkeitsdatum
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Betrag
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <Link to={`/orders/${order._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="max-w-xs truncate">
                          {order.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrderStatusBadgeColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(order.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                        {formatCurrency(calculateTotal(order.items))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Link to={`/orders/${order._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mx-1">
                          Details
                        </Link>
                        <Link to={`/orders/${order._id}/edit`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mx-1">
                          Bearbeiten
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Keine Aufträge vorhanden</p>
              <Link
                to={`/orders/new?customerId=${id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Ersten Auftrag anlegen
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Rechnungen des Kunden */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Rechnungen</h3>
          <Link
            to={`/invoices/new?customerId=${id}`}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          >
            <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Neue Rechnung
          </Link>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {invoicesLoading ? (
            <div className="px-4 py-10 text-center">
              <div className="spinner inline-block"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Rechnungen werden geladen...</p>
            </div>
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Rechnungsnr.
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Auftrag
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Rechnungsdatum
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Fälligkeitsdatum
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Betrag
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <Link to={`/invoices/${invoice._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getInvoiceStatusBadgeColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <Link to={`/invoices/${invoice._id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mx-1">
                          Details
                        </Link>
                        <Link to={`/invoices/${invoice._id}/edit`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mx-1">
                          Bearbeiten
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Keine Rechnungen vorhanden</p>
              <Link
                to={`/invoices/new?customerId=${id}`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Erste Rechnung erstellen
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Zahlungsübersicht */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Zahlungsübersicht</h3>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="bg-green-50 dark:bg-green-900 border border-green-100 dark:border-green-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Bezahlte Rechnungen</h4>
              <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-300">
                {formatCurrency(totalInvoicesAmount - openInvoicesAmount)}
              </p>
              <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                {paidInvoicesCount} von {invoices.length} Rechnungen bezahlt
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-100 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Offene Rechnungen</h4>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-300">
                {formatCurrency(openInvoicesAmount)}
              </p>
              <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                {openInvoicesCount} von {invoices.length} Rechnungen offen
              </p>
            </div>
          </div>
          
          <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zahlungsbilanz</h4>
            <div className="overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div 
                className="h-2 bg-green-500 dark:bg-green-600" 
                style={{ 
                  width: `${invoices.length > 0 ? (paidInvoicesCount / invoices.length) * 100 : 0}%` 
                }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-right">
              {invoices.length > 0 ? Math.round((paidInvoicesCount / invoices.length) * 100) : 0}% bezahlt
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetail