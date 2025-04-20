// src/pages/invoices/Invoices.jsx - Mit Dark Mode Support und korrekter Berechnung
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getInvoices, deleteInvoice } from '../../services/invoiceService'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import { useTheme } from '../../context/ThemeContext'

const Invoices = () => {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

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

  // Funktion zum korrekten Berechnen des Gesamtbetrags
  const calculateTotalAmount = (invoice) => {
    // Wenn keine items vorhanden sind oder keine subtotal, gebe 0 zurück
    if (!invoice.items || invoice.items.length === 0) {
      return 0;
    }
    
    // Berechne Zwischensumme aus items
    const subtotal = invoice.items.reduce((sum, item) => {
      return sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
    }, 0);
    
    // Berechne Steuerbetrag
    const taxRate = Number(invoice.taxRate) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    
    // Berechne Gesamtbetrag
    return subtotal + taxAmount;
  }

  // Spalten-Definition für die Tabelle
  const columns = [
    {
      header: 'Rechnungsnr.',
      accessor: 'invoiceNumber',
      cell: (row) => (
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          <Link to={`/invoices/${row._id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            {row.invoiceNumber}
          </Link>
        </div>
      )
    },
    {
      header: 'Kunde',
      accessor: 'customer',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {row.customer ? (
            typeof row.customer === 'object' ? (
              row.customer.name
            ) : (
              'Kunde geladen...'
            )
          ) : (
            'Kein Kunde'
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
            row.status
          )}`}
        >
          {row.status}
        </span>
      )
    },
    {
      header: 'Betrag',
      accessor: 'totalAmount',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {/* Berechne den Gesamtbetrag korrekt statt totalAmount zu verwenden */}
          {formatCurrency(calculateTotalAmount(row))}
        </div>
      ),
      className: 'hidden sm:table-cell'
    },
    {
      header: 'Rechnungsdatum',
      accessor: 'issueDate',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(row.issueDate)}
        </div>
      ),
      className: 'hidden lg:table-cell'
    },
    {
      header: 'Fälligkeitsdatum',
      accessor: 'dueDate',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatDate(row.dueDate)}
        </div>
      ),
      className: 'hidden lg:table-cell'
    },
    {
      header: 'Aktionen',
      accessor: 'actions',
      cell: (row) => (
        <div className="text-right text-sm font-medium flex justify-end space-x-3">
          <Link
            to={`/invoices/${row._id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            title="Details anzeigen"
          >
            <EyeIcon className="h-5 w-5" />
          </Link>
          <Link
            to={`/invoices/${row._id}/edit`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            title="Bearbeiten"
          >
            <PencilIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => handleDelete(row._id)}
            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
            title="Löschen"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
      className: 'text-right'
    }
  ]

  // Render-Funktion für mobile Ansicht
  const renderMobileRow = (invoice) => (
    <div className="px-4">
      <div className="flex justify-between items-center mb-2">
        <Link to={`/invoices/${invoice._id}`} className="text-lg font-medium text-blue-600 dark:text-blue-400">
          {invoice.invoiceNumber}
        </Link>
        <div className="flex space-x-2">
          <Link
            to={`/invoices/${invoice._id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
          >
            <EyeIcon className="h-5 w-5" />
          </Link>
          <Link
            to={`/invoices/${invoice._id}/edit`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
          >
            <PencilIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => handleDelete(invoice._id)}
            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Kunde:</span> {
          invoice.customer ? (
            typeof invoice.customer === 'object' ? invoice.customer.name : 'Kunde geladen...'
          ) : 'Kein Kunde'
        }
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Status:</span>{' '}
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(invoice.status)}`}>
          {invoice.status}
        </span>
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Betrag:</span> {formatCurrency(calculateTotalAmount(invoice))}
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Rechnungsdatum:</span> {formatDate(invoice.issueDate)}
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Fälligkeitsdatum:</span> {formatDate(invoice.dueDate)}
      </p>
    </div>
  )

  // Leerer Zustand
  const emptyState = (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6 text-center">
      <p className="text-gray-500 dark:text-gray-400">Keine Rechnungen gefunden.</p>
      <Link
        to="/invoices/new"
        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800"
      >
        Erste Rechnung erstellen
      </Link>
    </div>
  )

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6">
      <div className="py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Rechnungen</h2>
          <Link
            to="/invoices/new"
            className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 min-w-[140px] justify-center"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Neue Rechnung
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <ResponsiveTable 
            columns={columns}
            data={invoices}
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

export default Invoices