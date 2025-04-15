// src/pages/customers/CustomerDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { getCustomer } from '../../services/customerService'
import { PencilIcon, ArrowLeftIcon } from '@heroicons/react/outline'

const CustomerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

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
        <p className="mt-2 text-gray-600">Kundendetails werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-gray-900">Kundendetails</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Details und Informationen zum Kunden.</p>
        </div>
        <div className="flex space-x-2">
          <Link
            to="/customers"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Zurück
          </Link>
          <Link
            to={`/customers/${id}/edit`}
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
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{customer.name}</dd>
          </div>
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Kontaktperson</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {customer.contactPerson || '-'}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">E-Mail</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-900">
                  {customer.email}
                </a>
              ) : (
                '-'
              )}
            </dd>
          </div>
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Telefon</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:text-blue-900">
                  {customer.phone}
                </a>
              ) : (
                '-'
              )}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Adresse</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
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
          <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Steuernummer</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {customer.taxId || '-'}
            </dd>
          </div>
          <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Notizen</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {customer.notes || '-'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default CustomerDetail