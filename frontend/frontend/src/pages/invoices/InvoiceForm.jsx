// src/pages/invoices/InvoiceForm.jsx - Mit Dark Mode Support und korrigierter Berechnung
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import { createInvoice, getInvoice, updateInvoice } from '../../services/invoiceService'
import { getCustomers } from '../../services/customerService'
import { getOrders } from '../../services/orderService'
import { getTimeTrackings } from '../../services/timeTrackingService'
import { ArrowLeftIcon, TrashIcon, PlusIcon } from '@heroicons/react/outline'
import { useTheme } from '../../context/ThemeContext'

const InvoiceSchema = Yup.object().shape({
  customer: Yup.string().required('Kunde ist erforderlich'),
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
    .min(1, 'Mindestens eine Rechnungsposition ist erforderlich'),
  subtotal: Yup.number().required('Zwischensumme ist erforderlich').min(0, 'Zwischensumme kann nicht negativ sein'),
  taxRate: Yup.number().required('Steuersatz ist erforderlich').min(0, 'Steuersatz kann nicht negativ sein')
})

const InvoiceForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const orderId = queryParams.get('orderId')
  const { isDarkMode } = useTheme()

  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [initialValues, setInitialValues] = useState({
    invoiceNumber: '',
    customer: orderId || '',
    order: orderId || '',
    items: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0
      }
    ],
    timeTracking: [],
    subtotal: 0,
    taxRate: 19,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'erstellt',
    notes: ''
  })
  const [loading, setLoading] = useState(id ? true : false)
  const [dataLoading, setDataLoading] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true)
        
        // Lade Kunden, Aufträge und Zeiteinträge
        const [customersResponse, ordersResponse, timeResponse] = await Promise.all([
          getCustomers(),
          getOrders(),
          getTimeTrackings()
        ])
        
        setCustomers(customersResponse.data.data)
        setOrders(ordersResponse.data.data)
        
        // Filtere nur nicht abgerechnete Zeiteinträge
        const unbilledTimeEntries = timeResponse.data.data.filter(entry => !entry.billed)
        setTimeEntries(unbilledTimeEntries)
        
        setDataLoading(false)
      } catch (error) {
        toast.error('Fehler beim Laden der Daten')
        setDataLoading(false)
      }
    }

    const fetchInvoice = async () => {
      if (id) {
        try {
          const response = await getInvoice(id)
          const invoice = response.data.data
          
          // Formatiere Datumsfelder für das Formular
          const formatDateForInput = (dateString) => {
            if (!dateString) return ''
            const date = new Date(dateString)
            return date.toISOString().split('T')[0]
          }
          
          // Setze ausgewählten Kunden und Auftrag
          if (invoice.customer && typeof invoice.customer === 'object') {
            setSelectedCustomerId(invoice.customer._id)
          } else if (invoice.customer) {
            setSelectedCustomerId(invoice.customer)
          }
          
          if (invoice.order && typeof invoice.order === 'object') {
            setSelectedOrderId(invoice.order._id)
          } else if (invoice.order) {
            setSelectedOrderId(invoice.order)
          }

          setInitialValues({
            invoiceNumber: invoice.invoiceNumber || '',
            customer: invoice.customer._id || invoice.customer || '',
            order: invoice.order?._id || invoice.order || '',
            items: invoice.items && invoice.items.length > 0 ? invoice.items : [
              { description: '', quantity: 1, unitPrice: 0 }
            ],
            timeTracking: invoice.timeTracking || [],
            subtotal: invoice.subtotal || 0,
            taxRate: invoice.taxRate || 19,
            issueDate: formatDateForInput(invoice.issueDate),
            dueDate: formatDateForInput(invoice.dueDate),
            status: invoice.status || 'erstellt',
            notes: invoice.notes || ''
          })
          setLoading(false)
        } catch (error) {
          toast.error('Rechnung konnte nicht geladen werden')
          navigate('/invoices')
        }
      }
    }

    fetchData()
    fetchInvoice()
  }, [id, navigate])

  // Filtern der Aufträge basierend auf dem ausgewählten Kunden
  const filteredOrders = selectedCustomerId 
    ? orders.filter(order => 
        order.customer === selectedCustomerId || 
        (order.customer && order.customer._id === selectedCustomerId)
      )
    : orders

  // Filtern der Zeiteinträge basierend auf dem ausgewählten Auftrag
  const filteredTimeEntries = selectedOrderId 
    ? timeEntries.filter(entry => 
        entry.order === selectedOrderId || 
        (entry.order && entry.order._id === selectedOrderId)
      )
    : timeEntries

  const handleCustomerChange = (e, setFieldValue) => {
    const customerId = e.target.value
    setSelectedCustomerId(customerId)
    setFieldValue('customer', customerId)
    
    // Zurücksetzen des ausgewählten Auftrags, wenn der Kunde geändert wird
    setSelectedOrderId('')
    setFieldValue('order', '')
    setFieldValue('timeTracking', [])
  }

  const handleOrderChange = (e, setFieldValue) => {
    const orderId = e.target.value
    setSelectedOrderId(orderId)
    setFieldValue('order', orderId)
    
    // Zurücksetzen der ausgewählten Zeiteinträge
    setFieldValue('timeTracking', [])
    
    // Wenn ein Auftrag ausgewählt wurde, fülle die Rechnungspositionen aus den Auftragspositionen
    if (orderId) {
      const selectedOrder = orders.find(order => order._id === orderId)
      if (selectedOrder && selectedOrder.items && selectedOrder.items.length > 0) {
        setFieldValue('items', [...selectedOrder.items])
        
        // Berechne Zwischensumme
        const subtotal = calculateSubtotal(selectedOrder.items);
        setFieldValue('subtotal', subtotal)
      }
    }
  }

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (id) {
        await updateInvoice(id, values)
        toast.success('Rechnung erfolgreich aktualisiert')
      } else {
        await createInvoice(values)
        toast.success('Rechnung erfolgreich erstellt')
      }
      navigate('/invoices')
    } catch (error) {
      toast.error(`Fehler beim ${id ? 'Aktualisieren' : 'Erstellen'} der Rechnung`)
    } finally {
      setSubmitting(false)
    }
  }

  // Verbesserte Funktion zur Berechnung der Zwischensumme
  const calculateSubtotal = (items) => {
    if (!items || items.length === 0) return 0;
    
    return items.reduce((total, item) => {
      // Stelle sicher, dass alle Werte als Zahlen behandelt werden
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  }

  if (loading || dataLoading) {
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
          {id ? 'Rechnung bearbeiten' : 'Neue Rechnung erstellen'}
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
        validationSchema={InvoiceSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isSubmitting, values, errors, touched, setFieldValue }) => (
          <Form className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rechnungsnummer
                </label>
                <div className="mt-1">
                  <Field
                    type="text"
                    name="invoiceNumber"
                    id="invoiceNumber"
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
                  <Field
                    as="select"
                    name="customer"
                    id="customer"
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                      errors.customer && touched.customer ? 'border-red-300 dark:border-red-500' : ''
                    }`}
                    onChange={(e) => handleCustomerChange(e, setFieldValue)}
                  >
                    <option value="">Bitte Kunde auswählen</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="customer" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auftrag
                </label>
                <div className="mt-1">
                  <Field
                    as="select"
                    name="order"
                    id="order"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    onChange={(e) => handleOrderChange(e, setFieldValue)}
                    disabled={!selectedCustomerId}
                  >
                    <option value="">Keinen Auftrag auswählen</option>
                    {filteredOrders.map(order => (
                      <option key={order._id} value={order._id}>
                        {order.orderNumber} - {order.description.substring(0, 40)}
                        {order.description.length > 40 ? '...' : ''}
                      </option>
                    ))}
                  </Field>
                  {!selectedCustomerId && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Bitte zuerst einen Kunden auswählen
                    </p>
                  )}
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
                    <option value="erstellt">Erstellt</option>
                    <option value="versendet">Versendet</option>
                    <option value="bezahlt">Bezahlt</option>
                    <option value="storniert">Storniert</option>
                  </Field>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rechnungsdatum
                </label>
                <div className="mt-1">
                  <Field
                    type="date"
                    name="issueDate"
                    id="issueDate"
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Rechnungspositionen</h3>
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
                                onChange={(e) => {
                                  // Aktuelle Werte von allen Positionen erfassen
                                  const updatedItems = [...values.items];
                                  // Aktualisiere das spezifische Feld
                                  updatedItems[index].quantity = Number(e.target.value);
                                  
                                  // Aktualisiere das Formularfeld
                                  setFieldValue(`items.${index}.quantity`, Number(e.target.value));
                                  
                                  // Berechne die neue Gesamtsumme aus den aktualisierten Werten
                                  const newSubtotal = calculateSubtotal(updatedItems);
                                  setFieldValue('subtotal', newSubtotal);
                                }}
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
                                onChange={(e) => {
                                  // Aktuelle Werte von allen Positionen erfassen
                                  const updatedItems = [...values.items];
                                  // Aktualisiere das spezifische Feld
                                  updatedItems[index].unitPrice = Number(e.target.value);
                                  
                                  // Aktualisiere das Formularfeld
                                  setFieldValue(`items.${index}.unitPrice`, Number(e.target.value));
                                  
                                  // Berechne die neue Gesamtsumme aus den aktualisierten Werten
                                  const newSubtotal = calculateSubtotal(updatedItems);
                                  setFieldValue('subtotal', newSubtotal);
                                }}
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
                                    // Erstelle eine Kopie der Items ohne das zu entfernende Element
                                    const newItems = [...values.items];
                                    newItems.splice(index, 1);
                                    
                                    // Entferne das Element aus dem Formular
                                    remove(index);
                                    
                                    // Berechne die neue Zwischensumme
                                    const newSubtotal = calculateSubtotal(newItems);
                                    setFieldValue('subtotal', newSubtotal);
                                  } else {
                                    toast.warning('Mindestens eine Position ist erforderlich');
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
                          onClick={() => {
                            // Füge neue Position hinzu
                            push({ description: '', quantity: 1, unitPrice: 0 });
                            
                            // Aktualisiere Zwischensumme mit einem kleinen Delay
                            setTimeout(() => {
                              const newItems = [...values.items, { description: '', quantity: 1, unitPrice: 0 }];
                              const newSubtotal = calculateSubtotal(newItems);
                              setFieldValue('subtotal', newSubtotal);
                            }, 50);
                          }}
                        >
                          <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
                          Position hinzufügen
                        </button>
                      </div>
                      {errors.items && typeof errors.items === 'string' && (
                        <div className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.items}</div>
                      )}
                    </div>
                  )}
                </FieldArray>
              </div>

              {/* Ausgewählte Zeiteinträge */}
              {(selectedOrderId || selectedCustomerId) && filteredTimeEntries.length > 0 && (
                <div className="sm:col-span-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Zeiteinträge</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    <div className="mb-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                          checked={values.timeTracking.length === filteredTimeEntries.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Alle auswählen
                              setFieldValue(
                                'timeTracking',
                                filteredTimeEntries.map(entry => entry._id)
                              );
                            } else {
                              // Alle abwählen
                              setFieldValue('timeTracking', []);
                            }
                          }}
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                          Alle auswählen / abwählen
                        </span>
                      </label>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredTimeEntries.map(entry => (
                        <div key={entry._id} className="mb-2">
                          <label className="flex items-center">
                            <Field
                              type="checkbox"
                              name="timeTracking"
                              value={entry._id}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                              {new Date(entry.startTime).toLocaleDateString('de-DE')}: {entry.description} (
                              {entry.duration
                                ? `${Math.floor(entry.duration / 60)}h ${entry.duration % 60}min`
                                : '-'}
                              )
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="sm:col-span-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <label htmlFor="subtotal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Zwischensumme (€) *
                    </label>
                    <div className="mt-1">
                      <Field
                        type="number"
                        name="subtotal"
                        id="subtotal"
                        step="0.01"
                        min="0"
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                          errors.subtotal && touched.subtotal ? 'border-red-300 dark:border-red-500' : ''
                        }`}
                      />
                      <ErrorMessage name="subtotal" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="taxRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Steuersatz (%) *
                    </label>
                    <div className="mt-1">
                      <Field
                        type="number"
                        name="taxRate"
                        id="taxRate"
                        step="0.1"
                        min="0"
                        className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md ${
                          errors.taxRate && touched.taxRate ? 'border-red-300 dark:border-red-500' : ''
                        }`}
                      />
                      <ErrorMessage name="taxRate" component="div" className="mt-1 text-sm text-red-600 dark:text-red-400" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Steuer
                    </label>
                    <div className="mt-1">
                      <div className="shadow-sm block w-full sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-800">
                        {new Intl.NumberFormat('de-DE', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format((values.subtotal * values.taxRate) / 100)}
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Gesamtbetrag
                    </label>
                    <div className="mt-1">
                      <div className="shadow-sm block w-full sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-2 bg-gray-50 dark:bg-gray-800 font-medium">
                        {new Intl.NumberFormat('de-DE', {
                          style: 'currency',
                          currency: 'EUR'
                        }).format(Number(values.subtotal) + (Number(values.subtotal) * Number(values.taxRate)) / 100)}
                      </div>
                    </div>
                  </div>
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
                    placeholder="Interne Notizen zur Rechnung. Diese erscheinen nicht auf der Rechnung selbst."
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Interne Hinweise zur Rechnung, wie besondere Vereinbarungen, Zahlungsbedingungen oder Kontextinformationen.
                  Zeilenumbrüche werden bei der Anzeige beibehalten.
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

export default InvoiceForm