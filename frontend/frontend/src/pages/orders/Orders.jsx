// src/pages/orders/Orders.jsx - Mit Dark Mode Support
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getOrders, deleteOrder } from '../../services/orderService'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/outline'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import { useTheme } from '../../context/ThemeContext'

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    fetchOrders()
  }, [])

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
          {formatCurrency(row.totalAmount)}
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
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Status:</span>{' '}
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
          {order.status}
        </span>
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Betrag:</span> {formatCurrency(order.totalAmount)}
      </p>
      
      <p className="text-sm text-gray-600 dark:text-gray-400">
        <span className="font-medium">Fällig:</span> {formatDate(order.dueDate)}
      </p>
    </div>
  )

  // Leerer Zustand
  const emptyState = (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6 text-center">
      <p className="text-gray-500 dark:text-gray-400">Keine Aufträge gefunden.</p>
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

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <ResponsiveTable 
            columns={columns}
            data={orders}
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