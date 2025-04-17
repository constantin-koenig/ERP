// src/pages/customers/CustomerDetail.jsx - Mit Dark Mode Support
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getCustomer } from '../../services/customerService'
import { PencilIcon, ArrowLeftIcon } from '@heroicons/react/outline'
import { useTheme } from '../../context/ThemeContext'

const CustomerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
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

    fetchCustomer()
  }, [id, navigate])

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Kundendetails werden geladen...</p>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg`}>
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
            <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">
              {customer.notes || '-'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default CustomerDetail