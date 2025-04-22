// src/pages/invoices/Invoices.jsx - Mit Dark Mode Support, Search/Filter und korrekter Berechnung
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getInvoices, deleteInvoice, updateInvoiceStatus } from '../../services/invoiceService'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import SearchAndFilter from '../../components/ui/SearchAndFilter'
import { useTheme } from '../../context/ThemeContext'

const Invoices = () => {
  const [invoices, setInvoices] = useState([])
  const [filteredInvoices, setFilteredInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('invoiceNumber_desc')
  const [filterValues, setFilterValues] = useState({
    status: '',
    customer: '',
    minAmount: '',
    maxAmount: '',
    dueDateRange: ''
  })

  useEffect(() => {
    fetchInvoices()
  }, [])
  
  // Effect for filtering and sorting invoices
  useEffect(() => {
    if (!invoices.length) return setFilteredInvoices([])
    
    let result = [...invoices]
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(invoice => 
        (invoice.invoiceNumber && invoice.invoiceNumber.toLowerCase().includes(lowerSearch)) ||
        (invoice.customer && typeof invoice.customer === 'object' && invoice.customer.name && 
         invoice.customer.name.toLowerCase().includes(lowerSearch)) ||
        (invoice.notes && invoice.notes.toLowerCase().includes(lowerSearch))
      )
    }
    
    // Apply status filter
    if (filterValues.status) {
      result = result.filter(invoice => invoice.status === filterValues.status)
    }
    
    // Apply customer filter
    if (filterValues.customer) {
      result = result.filter(invoice => {
        if (!invoice.customer) return false
        if (typeof invoice.customer === 'object') {
          return invoice.customer._id === filterValues.customer
        }
        return invoice.customer === filterValues.customer
      })
    }
    
    // Apply amount filters
    if (filterValues.minAmount) {
      const minAmount = parseFloat(filterValues.minAmount)
      if (!isNaN(minAmount)) {
        result = result.filter(invoice => calculateTotalAmount(invoice) >= minAmount)
      }
    }
    
    if (filterValues.maxAmount) {
      const maxAmount = parseFloat(filterValues.maxAmount)
      if (!isNaN(maxAmount)) {
        result = result.filter(invoice => calculateTotalAmount(invoice) <= maxAmount)
      }
    }
    
    // Apply due date range filter
    if (filterValues.dueDateRange) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (filterValues.dueDateRange === 'overdue') {
        // Filter for overdue invoices (due date in the past AND not paid)
        result = result.filter(invoice => {
          if (invoice.status === 'bezahlt') return false
          if (!invoice.dueDate) return false
          return new Date(invoice.dueDate) < today
        })
      } else if (filterValues.dueDateRange === 'thisWeek') {
        // Filter for invoices due this week
        const endOfWeek = new Date(today)
        endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
        
        result = result.filter(invoice => {
          if (!invoice.dueDate) return false
          const dueDate = new Date(invoice.dueDate)
          return dueDate >= today && dueDate <= endOfWeek
        })
      } else if (filterValues.dueDateRange === 'thisMonth') {
        // Filter for invoices due this month
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        
        result = result.filter(invoice => {
          if (!invoice.dueDate) return false
          const dueDate = new Date(invoice.dueDate)
          return dueDate >= today && dueDate <= endOfMonth
        })
      }
    }
    
    // Apply sorting
    if (sortOption) {
      const [field, direction] = sortOption.split('_')
      result.sort((a, b) => {
        let comparison = 0
        
        // Special handling for customer name
        if (field === 'customer') {
          const aName = (a.customer && typeof a.customer === 'object') ? a.customer.name || '' : ''
          const bName = (b.customer && typeof b.customer === 'object') ? b.customer.name || '' : ''
          comparison = aName.localeCompare(bName)
        } 
        // Handling for dates
        else if (field === 'dueDate' || field === 'issueDate' || field === 'createdAt') {
          const aDate = a[field] ? new Date(a[field]) : new Date(0)
          const bDate = b[field] ? new Date(b[field]) : new Date(0)
          comparison = aDate - bDate
        }
        // Handling for amount (calculated from items)
        else if (field === 'totalAmount') {
          const aTotal = calculateTotalAmount(a)
          const bTotal = calculateTotalAmount(b)
          comparison = aTotal - bTotal
        }
        // Default comparison for strings and numbers
        else {
          const aVal = a[field] || ''
          const bVal = b[field] || ''
          
          if (typeof aVal === 'string') {
            comparison = aVal.localeCompare(bVal)
          } else {
            comparison = aVal - bVal
          }
        }
        
        return direction === 'asc' ? comparison : -comparison
      })
    }
    
    setFilteredInvoices(result)
  }, [invoices, searchTerm, sortOption, filterValues])

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

  const handleStatusChange = async (id, status) => {
    try {
      await updateInvoiceStatus(id, status)
      toast.success(`Rechnungsstatus auf "${status}" geändert`)
      fetchInvoices()
    } catch (error) {
      toast.error('Fehler beim Ändern des Rechnungsstatus')
    }
  }
  
  const handleSearch = (value) => {
    setSearchTerm(value)
  }

  const handleSort = (value) => {
    setSortOption(value)
  }
  
  const handleFilter = (filterKey, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterKey]: value
    }))
  }
  
  // Sort options for the dropdown
  const sortOptions = [
    { value: 'invoiceNumber_desc', label: 'Rechnungsnr. (neuste zuerst)' },
    { value: 'invoiceNumber_asc', label: 'Rechnungsnr. (älteste zuerst)' },
    { value: 'customer_asc', label: 'Kunde (A-Z)' },
    { value: 'customer_desc', label: 'Kunde (Z-A)' },
    { value: 'status_asc', label: 'Status (A-Z)' },
    { value: 'status_desc', label: 'Status (Z-A)' },
    { value: 'dueDate_asc', label: 'Fälligkeitsdatum (aufsteigend)' },
    { value: 'dueDate_desc', label: 'Fälligkeitsdatum (absteigend)' },
    { value: 'issueDate_desc', label: 'Rechnungsdatum (neuste zuerst)' },
    { value: 'issueDate_asc', label: 'Rechnungsdatum (älteste zuerst)' },
    { value: 'totalAmount_desc', label: 'Betrag (höchster zuerst)' },
    { value: 'totalAmount_asc', label: 'Betrag (niedrigster zuerst)' }
  ]
  
  // Create a unique list of customers from invoices for the filter
  const getCustomers = () => {
    const customerMap = new Map()
    invoices.forEach(invoice => {
      if (invoice.customer && typeof invoice.customer === 'object') {
        customerMap.set(invoice.customer._id, {
          value: invoice.customer._id,
          label: invoice.customer.name
        })
      }
    })
    return Array.from(customerMap.values())
  }
  
  // Filter configuration
  const filterConfig = {
    status: {
      label: 'Status',
      value: filterValues.status,
      onFilter: handleFilter,
      options: [
        { value: 'erstellt', label: 'Erstellt' },
        { value: 'versendet', label: 'Versendet' },
        { value: 'bezahlt', label: 'Bezahlt' },
        { value: 'storniert', label: 'Storniert' }
      ]
    },
    customer: {
      label: 'Kunde',
      value: filterValues.customer,
      onFilter: handleFilter,
      allLabel: 'Alle Kunden',
      options: getCustomers()
    },
    dueDateRange: {
      label: 'Fälligkeitsdatum',
      value: filterValues.dueDateRange,
      onFilter: handleFilter,
      allLabel: 'Alle Zeiträume',
      options: [
        { value: 'overdue', label: 'Überfällig' },
        { value: 'thisWeek', label: 'Diese Woche' },
        { value: 'thisMonth', label: 'Diesen Monat' }
      ]
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

      {invoice.customer && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Kunde:</span> {
            typeof invoice.customer === 'object' ? invoice.customer.name : 'Kunde geladen...'
          }
        </p>
      )}
      
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
      
      {/* Status quick-change dropdown for mobile */}
      <div className="mt-2">
        <select
          className={`text-sm border rounded p-1 ${
            isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
          }`}
          value={invoice.status}
          onChange={(e) => handleStatusChange(invoice._id, e.target.value)}
        >
          <option value="erstellt">Erstellt</option>
          <option value="versendet">Versendet</option>
          <option value="bezahlt">Bezahlt</option>
          <option value="storniert">Storniert</option>
        </select>
        <span className="ml-2 text-xs text-gray-500">Status ändern</span>
      </div>
    </div>
  )

  // Leerer Zustand
  const emptyState = (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6 text-center">
      <p className="text-gray-500 dark:text-gray-400">
        {searchTerm || filterValues.status || filterValues.customer || filterValues.dueDateRange ? 
          'Keine Rechnungen gefunden, die Ihren Suchkriterien entsprechen.' : 
          'Keine Rechnungen gefunden.'}
      </p>
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

        {/* Search and Filter Component */}
        <SearchAndFilter 
          onSearch={handleSearch}
          onSort={handleSort}
          sortOptions={sortOptions}
          filters={filterConfig}
          darkMode={isDarkMode}
          searchPlaceholder="Rechnungen suchen..."
        />

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <ResponsiveTable 
            columns={columns}
            data={filteredInvoices}
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