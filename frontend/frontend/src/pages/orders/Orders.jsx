// src/pages/orders/Orders.jsx - Mit Dark Mode Support und Search/Filter Funktionalität
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getOrders, deleteOrder } from '../../services/orderService'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, UserIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import SearchAndFilter from '../../components/ui/SearchAndFilter'
import { useTheme } from '../../context/ThemeContext'

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('orderNumber_asc')
  const [filterValues, setFilterValues] = useState({
    status: '',
    assignedTo: ''
  })

  useEffect(() => {
    fetchOrders()
  }, [])
  
  // Effect for filtering and sorting orders
  useEffect(() => {
    if (!orders.length) return setFilteredOrders([])
    
    let result = [...orders]
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(order => 
        (order.orderNumber && order.orderNumber.toLowerCase().includes(lowerSearch)) ||
        (order.description && order.description.toLowerCase().includes(lowerSearch)) ||
        (order.customer && typeof order.customer === 'object' && order.customer.name && 
         order.customer.name.toLowerCase().includes(lowerSearch))
      )
    }
    
    // Apply status filter
    if (filterValues.status) {
      result = result.filter(order => order.status === filterValues.status)
    }
    
    // Apply assigned user filter
    if (filterValues.assignedTo) {
      if (filterValues.assignedTo === 'unassigned') {
        result = result.filter(order => !order.assignedTo)
      } else {
        result = result.filter(order => {
          if (!order.assignedTo) return false
          if (typeof order.assignedTo === 'object') {
            return order.assignedTo._id === filterValues.assignedTo
          }
          return order.assignedTo === filterValues.assignedTo
        })
      }
    }
    
    // Apply sorting
    if (sortOption) {
      const [field, direction] = sortOption.split('_')
      result.sort((a, b) => {
        let comparison = 0
        
        // Special handling for customer name field
        if (field === 'customer') {
          const aName = (a.customer && typeof a.customer === 'object') ? a.customer.name || '' : ''
          const bName = (b.customer && typeof b.customer === 'object') ? b.customer.name || '' : ''
          comparison = aName.localeCompare(bName)
        }
        // Handle dates for proper comparison
        else if (field === 'dueDate' || field === 'startDate' || field === 'createdAt') {
          const aDate = a[field] ? new Date(a[field]) : new Date(0)
          const bDate = b[field] ? new Date(b[field]) : new Date(0)
          comparison = aDate - bDate
        }
        // Handle totalAmount calculation for custom sorting
        else if (field === 'totalAmount') {
          // Calculate total from items
          const calculateTotal = (order) => {
            if (!order.items || !order.items.length) return 0
            return order.items.reduce((sum, item) => {
              return sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))
            }, 0)
          }
          const aTotal = calculateTotal(a)
          const bTotal = calculateTotal(b)
          comparison = aTotal - bTotal
        }
        // Default string comparison
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
    
    setFilteredOrders(result)
  }, [orders, searchTerm, sortOption, filterValues])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await getOrders()
      setOrders(response.data.data)
      setLoading(false)
    } catch (error) {
      toast.error('Fehler beim Laden der Aufträge')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Möchten Sie diesen Auftrag wirklich löschen?')) {
      try {
        await deleteOrder(id)
        toast.success('Auftrag erfolgreich gelöscht')
        fetchOrders()
      } catch (error) {
        toast.error('Fehler beim Löschen des Auftrags')
      }
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
    { value: 'orderNumber_asc', label: 'Auftragsnr. (aufsteigend)' },
    { value: 'orderNumber_desc', label: 'Auftragsnr. (absteigend)' },
    { value: 'customer_asc', label: 'Kunde (A-Z)' },
    { value: 'customer_desc', label: 'Kunde (Z-A)' },
    { value: 'status_asc', label: 'Status (A-Z)' },
    { value: 'status_desc', label: 'Status (Z-A)' },
    { value: 'dueDate_asc', label: 'Fälligkeitsdatum (aufsteigend)' },
    { value: 'dueDate_desc', label: 'Fälligkeitsdatum (absteigend)' },
    { value: 'totalAmount_asc', label: 'Betrag (aufsteigend)' },
    { value: 'totalAmount_desc', label: 'Betrag (absteigend)' },
    { value: 'createdAt_desc', label: 'Neuste zuerst' },
    { value: 'createdAt_asc', label: 'Älteste zuerst' }
  ]
  
  // Create a unique list of users from orders for the filter
  const getAssignedUsers = () => {
    const userMap = new Map()
    orders.forEach(order => {
      if (order.assignedTo) {
        if (typeof order.assignedTo === 'object') {
          userMap.set(order.assignedTo._id, {
            value: order.assignedTo._id,
            label: order.assignedTo.name
          })
        }
      }
    })
    return Array.from(userMap.values())
  }
  
  // Filter configuration
  const filterConfig = {
    status: {
      label: 'Status',
      value: filterValues.status,
      onFilter: handleFilter,
      options: [
        { value: 'neu', label: 'Neu' },
        { value: 'in Bearbeitung', label: 'In Bearbeitung' },
        { value: 'abgeschlossen', label: 'Abgeschlossen' },
        { value: 'storniert', label: 'Storniert' }
      ]
    },
    assignedTo: {
      label: 'Zugewiesen an',
      value: filterValues.assignedTo,
      onFilter: handleFilter,
      allLabel: 'Alle Benutzer',
      options: [
        { value: 'unassigned', label: 'Nicht zugewiesen' },
        ...getAssignedUsers()
      ]
    }
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

  // Funktion zum Berechnen des Gesamtbetrags aus den Items
  const calculateTotal = (order) => {
    if (!order.items || order.items.length === 0) return 0;
    
    return order.items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  }

  

  // Spalten-Definition für die Tabelle
  const columns = [
    {
      header: 'Auftragsnr.',
      accessor: 'orderNumber',
      cell: (row) => (
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          <Link to={`/orders/${row._id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            {row.orderNumber}
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
      header: 'Zugewiesen an',
      accessor: 'assignedTo',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          {row.assignedTo ? (
            <>
              <UserIcon className="inline-block mr-1 h-4 w-4" />
              {typeof row.assignedTo === 'object' ? row.assignedTo.name : 'Benutzer...'}
            </>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Nicht zugewiesen</span>
          )}
        </div>
      ),
      className: 'hidden lg:table-cell'
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
      header: 'Gesamtbetrag',
      accessor: 'totalAmount',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {formatCurrency(calculateTotal(row))}
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
            to={`/orders/${row._id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            title="Details anzeigen"
          >
            <EyeIcon className="h-5 w-5" />
          </Link>
          <Link
            to={`/orders/${row._id}/edit`}
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
  const renderMobileRow = (order) => (
    <div className="px-4">
      <div className="flex justify-between items-center mb-2">
        <Link to={`/orders/${order._id}`} className="text-lg font-medium text-blue-600 dark:text-blue-400">
          {order.orderNumber}
        </Link>
        <div className="flex space-x-2">
          <Link
            to={`/orders/${order._id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
          >
            <EyeIcon className="h-5 w-5" />
          </Link>
          <Link
            to={`/orders/${order._id}/edit`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
          >
            <PencilIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => handleDelete(order._id)}
            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {order.customer && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Kunde:</span> {
            typeof order.customer === 'object' ? order.customer.name : 'Kunde geladen...'
          }
        </p>
      )}
      
      {/* Neuer Abschnitt für Benutzerzuweisung */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Zugewiesen:</span> {
          order.assignedTo ? (
            <span className="flex items-center">
              <UserIcon className="inline-block mr-1 h-4 w-4" />
              {typeof order.assignedTo === 'object' ? order.assignedTo.name : 'Benutzer...'}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Nicht zugewiesen</span>
          )
        }
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Status:</span>{' '}
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
          {order.status}
        </span>
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Betrag:</span> {formatCurrency(calculateTotal(order))}
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Fällig:</span> {formatDate(order.dueDate)}
      </p>
    </div>
  )

  // Leerer Zustand
  const emptyState = (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6 text-center">
      <p className="text-gray-500 dark:text-gray-400">
        {searchTerm || filterValues.status || filterValues.assignedTo ? 
          'Keine Aufträge gefunden, die Ihren Suchkriterien entsprechen.' : 
          'Keine Aufträge gefunden.'}
      </p>
      <Link
        to="/orders/new"
        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800"
      >
        Ersten Auftrag anlegen
      </Link>
    </div>
  )

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6">
      <div className="py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Aufträge</h2>
          <Link
            to="/orders/new"
            className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 min-w-[140px] justify-center"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Neuer Auftrag
          </Link>
        </div>

        {/* Search and Filter Component */}
        <SearchAndFilter 
          onSearch={handleSearch}
          onSort={handleSort}
          sortOptions={sortOptions}
          filters={filterConfig}
          darkMode={isDarkMode}
          searchPlaceholder="Aufträge suchen..."
        />

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <ResponsiveTable 
            columns={columns}
            data={filteredOrders}
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

export default Orders