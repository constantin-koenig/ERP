// src/pages/orders/OrderForm.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import { createOrder, getOrder, updateOrder } from '../../services/orderService'
import { getCustomers } from '../../services/customerService'
import { getAssignableUsers } from '../../services/authService'
import { ArrowLeftIcon, TrashIcon, PlusIcon } from '@heroicons/react/outline'
import { useTheme } from '../../context/ThemeContext'
import SearchableSelect from '../../components/ui/SearchableSelect' // Neue Komponente importieren

const OrderSchema = Yup.object().shape({
  customer: Yup.string().required('Kunde ist erforderlich'),
  title: Yup.string().required('Titel ist erforderlich'),
  status: Yup.string().required('Status ist erforderlich'),
  items: Yup.array()
    .of(
      Yup.object().shape({
        description: Yup.string().required('Beschreibung ist erforderlich'),
        quantity: Yup.number()
          .required('Menge ist erforderlich')
          .min(1, 'Menge muss mindestens 1 sein'),
        unitPrice: Yup.number()
          .required('Einzelpreis ist erforderlich')
          .min(0, 'Preis kann nicht negativ sein')
      })
    )
    .min(1, 'Mindestens eine Auftragsposition ist erforderlich')
})

const OrderForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isDarkMode } = useTheme()
  const [customers, setCustomers] = useState([])
  const [users, setUsers] = useState([]) // Zustand für Benutzer
  const [initialValues, setInitialValues] = useState({
    orderNumber: '',
    customer: '',
    title: '',
    status: 'neu',
    items: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0
      }
    ],
    startDate: '',
    dueDate: '',
    notes: '',
    assignedTo: '' // Neues Feld für den zugewiesenen Benutzer
  })
  const [loading, setLoading] = useState(id ? true : false)
  const [customersLoading, setCustomersLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true) // Ladezustand für Benutzer

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await getCustomers()
        setCustomers(response.data.data)
        setCustomersLoading(false)
      } catch (error) {
        toast.error('Fehler beim Laden der Kunden')
        setCustomersLoading(false)
      }
    }

    const fetchUsers = async () => {
      try {
        const response = await getAssignableUsers()
        setUsers(response.data.data)
        setUsersLoading(false)
      } catch (error) {
        toast.error('Fehler beim Laden der Benutzer')
        setUsersLoading(false)
      }
    }

    const fetchOrder = async () => {
      if (id) {
        try {
          const response = await getOrder(id)
          const order = response.data.data
          
          // Formatiere Datumsfelder für das Formular
          const formatDateForInput = (dateString) => {
            if (!dateString) return ''
            const date = new Date(dateString)
            return date.toISOString().split('T')[0]
          }

          setInitialValues({
            orderNumber: order.orderNumber || '',
            customer: order.customer._id || order.customer || '',
            title: order.description || '', // Verwende das bestehende Beschreibungsfeld für den Titel
            status: order.status || 'neu',
            items: order.items && order.items.length > 0 ? order.items : [
              { description: '', quantity: 1, unitPrice: 0 }
            ],
            startDate: formatDateForInput(order.startDate),
            dueDate: formatDateForInput(order.dueDate),
            notes: order.notes || '',
            assignedTo: order.assignedTo ? (order.assignedTo._id || order.assignedTo) : '' // Setze zugewiesenen Benutzer
          })
          setLoading(false)
        } catch (error) {
          toast.error('Auftrag konnte nicht geladen werden')
          navigate('/orders')
        }
      }
    }

    fetchCustomers()
    fetchUsers() // Benutzer laden
    fetchOrder()
  }, [id, navigate])

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      // Konvertiere den Titel wieder in ein description-Feld für die API-Kompatibilität
      const orderData = {
        ...values,
        description: values.title
      };
      delete orderData.title; // Entferne das title-Feld, da es nicht im Backend-Schema existiert

      if (id) {
        await updateOrder(id, orderData)
        toast.success('Auftrag erfolgreich aktualisiert')
      } else {
        await createOrder(orderData)
        toast.success('Auftrag erfolgreich erstellt')
      }
      navigate('/orders')
    } catch (error) {
      toast.error(`Fehler beim ${id ? 'Aktualisieren' : 'Erstellen'} des Auftrags`)
    } finally {
      setSubmitting(false)
    }
  }

  // Funktion zur Berechnung des Gesamtbetrags
  const calculateTotal = (items) => {
    if (!items || items.length === 0) return 0;
    
    return items.reduce((total, item) => {
      // Stelle sicher, dass die Werte als Zahlen behandelt werden
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  }

  // Kundenoptionen für SearchableSelect formatieren
  const customerOptions = customers.map(customer => ({
    value: customer._id,
    label: customer.name
  }));

  // Benutzeroptionen für SearchableSelect formatieren
  const userOptions = users.map(user => ({
    value: user._id,
    label: `${user.name} (${user.email})`
  }));

  if (loading || customersLoading || usersLoading) {
    return (
      <div className="text-center py-10">
        <div className="spinner"></div>
        <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Daten werden geladen...</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {id ? 'Auftrag bearbeiten' : 'Neuen Auftrag anlegen'}
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
        validationSchema={OrderSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isSubmitting, values, errors, touched, setFieldValue }) => (
          <Form className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auftragsnummer
                </label>
                <div className="mt-1">
                  <Field
                    type="text"
                    name="orderNumber"
                    id="orderNumber"
                    placeholder="Wird automatisch generiert"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Leer lassen für automatische Generierung
                  </p>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Kunde *
                </label>
                <div className="mt-1">
                  {/* SearchableSelect anstelle von normalem Select */}
                  <SearchableSelect
                    name="customer"
                    id="customer"
                    value={values.customer}
                    onChange={(e) => setFieldValue('customer', e.target.value)}
                    options={customerOptions}
                    placeholder="Bitte Kunde auswählen"
                    error={errors.customer && touched.customer ? errors.customer : ""}
                    threshold={5} // Zeige Suche ab 5 Einträgen
                  />
                </div>
              </div>

              {/* Titel-Feld (früher Beschreibung) nach oben verschieben */}
              <div className="sm:col-span-6">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Titel *
                </label>
                <div className="mt-1">
                  <Field
                    type="text"
                    name="title"
                    id="title"
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                      errors.title && touched.title ? 'border-red-300 dark:border-red-500' : ''
                    }`}
                  />
                  <ErrorMessage name="title" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
              </div>

              {/* Neues Feld für den zugewiesenen Benutzer mit SearchableSelect */}
              <div className="sm:col-span-3">
                <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Zugewiesen an
                </label>
                <div className="mt-1">
                  <SearchableSelect
                    name="assignedTo"
                    id="assignedTo"
                    value={values.assignedTo}
                    onChange={(e) => setFieldValue('assignedTo', e.target.value)}
                    options={userOptions}
                    placeholder="Keinem Benutzer zugewiesen"
                    threshold={5} // Zeige Suche ab 5 Einträgen
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <div className="mt-1">
                  <Field
                    as="select"
                    name="status"
                    id="status"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  >
                    <option value="neu">Neu</option>
                    <option value="in Bearbeitung">In Bearbeitung</option>
                    <option value="abgeschlossen">Abgeschlossen</option>
                    <option value="storniert">Storniert</option>
                  </Field>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Startdatum
                </label>
                <div className="mt-1">
                  <Field
                    type="date"
                    name="startDate"
                    id="startDate"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fälligkeitsdatum
                </label>
                <div className="mt-1">
                  <Field
                    type="date"
                    name="dueDate"
                    id="dueDate"
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
                    placeholder="Geben Sie hier interne Notizen zum Auftrag ein. Stichpunkte und Zeilenumbrüche werden korrekt angezeigt."
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Interne Hinweise, Anmerkungen und wichtige Informationen zum Auftrag. Zeilenumbrüche bleiben erhalten.
                </p>
              </div>
              
              <div className="sm:col-span-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Auftragspositionen</h3>
                <FieldArray name="items">
                  {({ remove, push }) => (
                    <div>
                      {values.items.length > 0 &&
                        values.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 gap-4 mb-4 items-start">
                            <div className="col-span-6">
                              <label
                                htmlFor={`items.${index}.description`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Beschreibung *
                              </label>
                              <Field
                                name={`items.${index}.description`}
                                type="text"
                                className={`mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                                  errors.items && 
                                  errors.items[index] && 
                                  errors.items[index].description && 
                                  touched.items && 
                                  touched.items[index] && 
                                  touched.items[index].description 
                                    ? 'border-red-300 dark:border-red-500' 
                                    : ''
                                }`}
                              />
                              <ErrorMessage
                                name={`items.${index}.description`}
                                component="div"
                                className="mt-1 text-sm text-red-600 dark:text-red-400"
                              />
                            </div>
                            <div className="col-span-2">
                              <label
                                htmlFor={`items.${index}.quantity`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Menge *
                              </label>
                              <Field
                                name={`items.${index}.quantity`}
                                type="number"
                                min="1"
                                className={`mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                                  errors.items && 
                                  errors.items[index] && 
                                  errors.items[index].quantity && 
                                  touched.items && 
                                  touched.items[index] && 
                                  touched.items[index].quantity 
                                    ? 'border-red-300 dark:border-red-500' 
                                    : ''
                                }`}
                              />
                              <ErrorMessage
                                name={`items.${index}.quantity`}
                                component="div"
                                className="mt-1 text-sm text-red-600 dark:text-red-400"
                              />
                            </div>
                            <div className="col-span-3">
                              <label
                                htmlFor={`items.${index}.unitPrice`}
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Einzelpreis (€) *
                              </label>
                              <Field
                                name={`items.${index}.unitPrice`}
                                type="number"
                                step="0.01"
                                min="0"
                                className={`mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                                  errors.items && 
                                  errors.items[index] && 
                                  errors.items[index].unitPrice && 
                                  touched.items && 
                                  touched.items[index] && 
                                  touched.items[index].unitPrice 
                                    ? 'border-red-300 dark:border-red-500' 
                                    : ''
                                }`}
                              />
                              <ErrorMessage
                                name={`items.${index}.unitPrice`}
                                component="div"
                                className="mt-1 text-sm text-red-600 dark:text-red-400"
                              />
                            </div>
                            <div className="col-span-1 flex items-end">
                              <button
                                type="button"
                                className="mt-1 mb-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                onClick={() => {
                                  if (values.items.length > 1) {
                                    remove(index)
                                  } else {
                                    toast.warning('Mindestens eine Position ist erforderlich')
                                  }
                                }}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                          onClick={() => push({ description: '', quantity: 1, unitPrice: 0 })}
                        >
                          <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
                          Position hinzufügen
                        </button>
                        <div className="text-right">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Gesamtbetrag: </span>
                          <span className="text-lg font-medium text-gray-900 dark:text-white">
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(calculateTotal(values.items))}
                          </span>
                        </div>
                      </div>
                      {errors.items && typeof errors.items === 'string' && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.items}</div>
                      )}
                    </div>
                  )}
                </FieldArray>
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

export default OrderForm