// src/pages/customers/Customers.jsx - Mit Dark Mode Support und Search/Sort Funktionalität
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getCustomers, deleteCustomer } from '../../services/customerService'
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/outline'
import ResponsiveTable from '../../components/ui/ResponsiveTable'
import SearchAndFilter from '../../components/ui/SearchAndFilter'
import { useTheme } from '../../context/ThemeContext'

const Customers = () => {
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState('name_asc')

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Effect for filtering and sorting customers
  useEffect(() => {
    if (!customers.length) return setFilteredCustomers([])
    
    let result = [...customers]
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(customer => 
        (customer.name && customer.name.toLowerCase().includes(lowerSearch)) ||
        (customer.email && customer.email.toLowerCase().includes(lowerSearch)) ||
        (customer.contactPerson && customer.contactPerson.toLowerCase().includes(lowerSearch)) ||
        (customer.phone && customer.phone.toLowerCase().includes(lowerSearch))
      )
    }
    
    // Apply sorting
    if (sortOption) {
      const [field, direction] = sortOption.split('_')
      result.sort((a, b) => {
        let comparison = 0
        
        // Handle null values for proper sorting
        const aVal = a[field] || ''
        const bVal = b[field] || ''
        
        // String comparison for text fields
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal)
        } 
        // Date comparison
        else if (field === 'createdAt' || field === 'updatedAt') {
          comparison = new Date(aVal) - new Date(bVal)
        }
        // Number comparison
        else {
          comparison = aVal - bVal
        }
        
        return direction === 'asc' ? comparison : -comparison
      })
    }
    
    setFilteredCustomers(result)
  }, [customers, searchTerm, sortOption])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const response = await getCustomers()
      setCustomers(response.data.data)
      setLoading(false)
    } catch (error) {
      toast.error('Fehler beim Laden der Kunden')
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Möchten Sie diesen Kunden wirklich löschen?')) {
      try {
        await deleteCustomer(id)
        toast.success('Kunde erfolgreich gelöscht')
        fetchCustomers()
      } catch (error) {
        toast.error('Fehler beim Löschen des Kunden')
      }
    }
  }

  const handleSearch = (value) => {
    setSearchTerm(value)
  }

  const handleSort = (value) => {
    setSortOption(value)
  }
  
  // Sort options for the dropdown
  const sortOptions = [
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'email_asc', label: 'E-Mail (A-Z)' },
    { value: 'email_desc', label: 'E-Mail (Z-A)' },
    { value: 'createdAt_desc', label: 'Neuste zuerst' },
    { value: 'createdAt_asc', label: 'Älteste zuerst' }
  ]

  // Spalten-Definition für die Tabelle
  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      cell: (row) => (
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          <Link to={`/customers/${row._id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
            {row.name}
          </Link>
        </div>
      )
    },
    {
      header: 'Kontaktperson',
      accessor: 'contactPerson',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">{row.contactPerson || '-'}</div>
      )
    },
    {
      header: 'E-Mail',
      accessor: 'email',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {row.email || '-'}
        </div>
      ),
      className: 'hidden lg:table-cell' // Verstecken auf mittleren Bildschirmen, zeigen auf großen
    },
    {
      header: 'Telefon',
      accessor: 'phone',
      cell: (row) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">{row.phone || '-'}</div>
      ),
      className: 'hidden lg:table-cell' // Verstecken auf mittleren Bildschirmen, zeigen auf großen
    },
    {
      header: 'Aktionen',
      accessor: 'actions',
      cell: (row) => (
        <div className="text-right text-sm font-medium flex justify-end space-x-3">
          <Link
            to={`/customers/${row._id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            title="Details anzeigen"
          >
            <EyeIcon className="h-5 w-5" />
          </Link>
          <Link
            to={`/customers/${row._id}/edit`}
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
  const renderMobileRow = (customer) => (
    <div className="px-4">
      <div className="flex justify-between items-center mb-2">
        <Link to={`/customers/${customer._id}`} className="text-lg font-medium text-blue-600 dark:text-blue-400">
          {customer.name}
        </Link>
        <div className="flex space-x-2">
          <Link
            to={`/customers/${customer._id}`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
          >
            <EyeIcon className="h-5 w-5" />
          </Link>
          <Link
            to={`/customers/${customer._id}/edit`}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
          >
            <PencilIcon className="h-5 w-5" />
          </Link>
          <button
            onClick={() => handleDelete(customer._id)}
            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {customer.contactPerson && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Kontakt:</span> {customer.contactPerson}
        </p>
      )}
      
      {customer.email && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">E-Mail:</span> {customer.email}
        </p>
      )}
      
      {customer.phone && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Telefon:</span> {customer.phone}
        </p>
      )}
    </div>
  )

  // Leerer Zustand
  const emptyState = (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6 text-center">
      <p className="text-gray-500 dark:text-gray-400">
        {searchTerm ? 'Keine Kunden gefunden, die Ihren Suchkriterien entsprechen.' : 'Keine Kunden gefunden.'}
      </p>
      <Link
        to="/customers/new"
        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800"
      >
        Ersten Kunden anlegen
      </Link>
    </div>
  )

  return (
    <div className="container mx-auto px-2 sm:px-4 lg:px-6">
      <div className="py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-3 sm:space-y-0">
          <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Kunden</h2>
          <Link
            to="/customers/new"
            className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 min-w-[140px] justify-center"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Neuer Kunde
          </Link>
        </div>

        {/* Search and Filter Component */}
        <SearchAndFilter 
          onSearch={handleSearch}
          onSort={handleSort}
          sortOptions={sortOptions}
          darkMode={isDarkMode}
          searchPlaceholder="Kunden suchen..."
        />

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <ResponsiveTable 
            columns={columns}
            data={filteredCustomers}
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

export default Customers