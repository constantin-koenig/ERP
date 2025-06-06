// src/pages/customers/CustomerForm.jsx - Mit Dark Mode Support
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { createCustomer, getCustomer, updateCustomer } from '../../services/customerService'
import { ArrowLeftIcon } from '@heroicons/react/outline'
import { useTheme } from '../../context/ThemeContext'

const CustomerSchema = Yup.object().shape({
  name: Yup.string().required('Name ist erforderlich'),
  email: Yup.string().email('Ungültige E-Mail-Adresse'),
  phone: Yup.string(),
  contactPerson: Yup.string(),
  'address.street': Yup.string(),
  'address.city': Yup.string(),
  'address.zipCode': Yup.string(),
  'address.country': Yup.string(),
  taxId: Yup.string(),
  notes: Yup.string()
})

const CustomerForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDarkMode } = useTheme()
  const [initialValues, setInitialValues] = useState({
    name: '',
    email: '',
    phone: '',
    contactPerson: '',
    address: {
      street: '',
      city: '',
      zipCode: '',
      country: ''
    },
    taxId: '',
    notes: ''
  })
  const [loading, setLoading] = useState(id ? true : false)

  useEffect(() => {
    const fetchCustomer = async () => {
      if (id) {
        try {
          const response = await getCustomer(id)
          const customer = response.data.data
          setInitialValues({
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            contactPerson: customer.contactPerson || '',
            address: {
              street: customer.address?.street || '',
              city: customer.address?.city || '',
              zipCode: customer.address?.zipCode || '',
              country: customer.address?.country || ''
            },
            taxId: customer.taxId || '',
            notes: customer.notes || ''
          })
          setLoading(false)
        } catch (error) {
          toast.error('Kunde konnte nicht geladen werden')
          navigate('/customers')
        }
      }
    }

    fetchCustomer()
  }, [id, navigate])

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (id) {
        await updateCustomer(id, values)
        toast.success('Kunde erfolgreich aktualisiert')
      } else {
        await createCustomer(values)
        toast.success('Kunde erfolgreich erstellt')
      }
      navigate('/customers')
    } catch (error) {
      toast.error(`Fehler beim ${id ? 'Aktualisieren' : 'Erstellen'} des Kunden`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Kundendaten werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {id ? 'Kunde bearbeiten' : 'Neuen Kunden anlegen'}
        </h2>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <ArrowLeftIcon className="-ml-0.5 mr-2 h-4 w-4" />
          Zurück
        </button>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={CustomerSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name *
                </label>
                <div className="mt-1">
                  <Field
                    type="text"
                    name="name"
                    id="name"
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                      errors.name && touched.name ? 'border-red-300 dark:border-red-500' : ''
                    }`}
                  />
                  <ErrorMessage name="name" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kontaktperson
                </label>
                <div className="mt-1">
                  <Field
                    type="text"
                    name="contactPerson"
                    id="contactPerson"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-Mail
                </label>
                <div className="mt-1">
                  <Field
                    type="email"
                    name="email"
                    id="email"
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                      errors.email && touched.email ? 'border-red-300 dark:border-red-500' : ''
                    }`}
                  />
                  <ErrorMessage name="email" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefon
                </label>
                <div className="mt-1">
                  <Field
                    type="text"
                    name="phone"
                    id="phone"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-1">Adresse</h3>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Straße
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="address.street"
                        id="address.street"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="address.zipCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      PLZ
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="address.zipCode"
                        id="address.zipCode"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Stadt
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="address.city"
                        id="address.city"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="address.country" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Land
                    </label>
                    <div className="mt-1">
                      <Field
                        type="text"
                        name="address.country"
                        id="address.country"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Steuernummer
                </label>
                <div className="mt-1">
                  <Field
                    type="text"
                    name="taxId"
                    id="taxId"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                </div>
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notizen
                </label>
                <div className="mt-1">
                  <Field
                    as="textarea"
                    id="notes"
                    name="notes"
                    rows={6}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md notes-textarea notes-input"
                    placeholder="Interne Notizen zum Kunden. Zeilenumbrüche werden beibehalten."
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Hier können Sie interne Hinweise, Kontaktpräferenzen und andere wichtige Informationen zum Kunden hinterlegen.
                </p>
              </div>
            </div>



            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Wird gespeichert...' : id ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  )
}

export default CustomerForm