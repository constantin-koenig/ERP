// src/pages/invoices/InvoiceDetail.jsx - Mit Zahlungsplan
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getInvoice, updateInvoiceStatus, updateInstallmentStatus } from '../../services/invoiceService'
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
      case 'teilweise bezahlt':
        return isDarkMode ? 'bg-indigo-900 text-indigo-100' : 'bg-indigo-100 text-indigo-800'
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

  // Neue Funktion: Ratenstatus ändern
  const handleInstallmentStatusChange = async (installmentIndex, isPaid) => {
    try {
      // Rate-Objekt erstellen
      const updatedInstallment = {
        ...invoice.installments[installmentIndex],
        isPaid,
        paidDate: isPaid ? new Date().toISOString() : null
      };

      await updateInstallmentStatus(id, installmentIndex, updatedInstallment);
      
      // Invoice-Objekt aktualisieren
      const updatedInstallments = [...invoice.installments];
      updatedInstallments[installmentIndex] = updatedInstallment;
      
      // Rechnungsstatus aktualisieren basierend auf den Ratenzahlungen
      let newStatus = invoice.status;
      const allPaid = updatedInstallments.every(inst => inst.isPaid);
      const somePaid = updatedInstallments.some(inst => inst.isPaid);
      
      if (allPaid) {
        newStatus = 'bezahlt';
      } else if (somePaid) {
        newStatus = 'teilweise bezahlt';
      } else {
        newStatus = invoice.status === 'versendet' ? 'versendet' : 'erstellt';
      }
      
      setInvoice({ 
        ...invoice, 
        installments: updatedInstallments,
        status: newStatus
      });
      
      toast.success(`Rate ${installmentIndex + 1} wurde ${isPaid ? 'als bezahlt' : 'als unbezahlt'} markiert`);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Ratenstatus:', error);
      toast.error('Fehler beim Aktualisieren der Rate');
    }
  };

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
              disabled={invoice.status === 'versendet' || invoice.status === 'teilweise bezahlt' || invoice.status === 'bezahlt' || invoice.status === 'storniert'}
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
                    <option value="teilweise bezahlt">Teilweise bezahlt</option>
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
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Zahlungsplan</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {invoice.paymentSchedule === 'installments' ? 'Ratenzahlung (30-30-40 Prinzip)' : 'Vollständige Zahlung bei Fälligkeit'}
                
                {/* Anzeige der Raten, falls Ratenzahlung */}
                {invoice.paymentSchedule === 'installments' && invoice.installments && invoice.installments.length > 0 && (
                  <div className="mt-3">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md">
                      <thead className="bg-gray-100 dark:bg-gray-600">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Beschreibung
                          </th>
                          <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Betrag
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Fälligkeitsdatum
                          </th>
                          <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {invoice.installments.map((installment, index) => (
                          <tr key={index} className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {installment.description}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                              {formatCurrency(installment.amount)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(installment.dueDate)}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mr-2 ${
                                  installment.isPaid 
                                    ? isDarkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800'
                                    : isDarkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {installment.isPaid ? 'Bezahlt' : 'Offen'}
                                  {installment.isPaid && installment.paidDate && ` (${formatDate(installment.paidDate)})`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleInstallmentStatusChange(index, !installment.isPaid)}
                                  className={`inline-flex items-center px-1.5 py-1 text-xs border rounded-md ${
                                    installment.isPaid
                                      ? isDarkMode 
                                        ? 'border-red-600 text-red-400 hover:bg-red-900' 
                                        : 'border-red-300 text-red-700 hover:bg-red-100'
                                      : isDarkMode 
                                        ? 'border-green-600 text-green-400 hover:bg-green-900' 
                                        : 'border-green-300 text-green-700 hover:bg-green-100'
                                  }`}
                                >
                                  {installment.isPaid ? 'Als offen markieren' : 'Als bezahlt markieren'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </dd>
            </div>
            <div className="bg-white dark:bg-gray-800 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300">Notizen</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
                {invoice.notes ? (
                  <pre className="formatted-notes break-words">
                    {invoice.notes}
                  </pre>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 italic">Keine Notizen vorhanden</span>
                )}
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
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Abrechenbar
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                  >
                    Betrag
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {invoice.timeTracking.map((entry) => (
                  <tr key={entry._id} className="align-top">
                    <td className="px-6 py-4 align-top date-cell text-sm text-gray-900 dark:text-white">
                      {formatDate(entry.startTime)}
                    </td>
                    <td className="px-6 py-4 description-cell">
                      <pre className="time-entry-description break-word table-text formatted-notes whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                        {entry.description}
                      </pre>
                    </td>
                    <td className="px-6 py-4 align-top time-cell text-sm text-gray-500 dark:text-gray-400 text-right">
                      {entry.startTime ? format(new Date(entry.startTime), 'HH:mm', { locale: de }) : '-'}
                    </td>
                    <td className="px-6 py-4 align-top time-cell text-sm text-gray-500 dark:text-gray-400 text-right">
                      {entry.endTime ? format(new Date(entry.endTime), 'HH:mm', { locale: de }) : '-'}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-500 dark:text-gray-400 text-right">
                      {entry.duration
                        ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}min`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-500 dark:text-gray-400 text-right">
                      {entry.billableDuration
                        ? `${Math.floor(entry.billableDuration / 60)}h ${entry.billableDuration % 60}min`
                        : entry.duration
                        ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}min`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 align-top text-sm text-gray-500 dark:text-gray-400 text-right">
                      {formatCurrency(entry.amount || 0)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    Summe Arbeitszeiten:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    {formatCurrency(invoice.timeTracking.reduce((sum, entry) => sum + (entry.amount || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoiceDetail